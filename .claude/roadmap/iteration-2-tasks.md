# Iteration 1 — Development Tasks

## T1 — Project Setup

### Required Packages

```bash
npm init -y
npm install fastify @fastify/jwt @fastify/rate-limit prisma @prisma/client
npm install ioredis bullmq zod axios
npm install -D typescript tsx @types/node vitest
```

### TypeScript Configuration

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### Docker Compose

**`docker-compose.yml`**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: runcoach
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

volumes:
  pgdata:
```

---

## T2 — OAuth Strava

### Flow

```
GET /auth/strava/login
  → redirect to https://www.strava.com/oauth/authorize
    ?client_id=...&redirect_uri=.../auth/strava/callback&scope=activity:read_all

GET /auth/strava/callback?code=...
  → POST https://www.strava.com/oauth/token
  → token encryption
  → INSERT/UPDATE strava_tokens
  → INSERT user if first connection
  → return application JWT
```

### Key Points

- Store `expires_at` for proactive refresh
- Refresh worker runs every 30 min (tokens expire in 6h)
- Scope `activity:read_all` required for past activities

---

## T3 — Initial Sync

Triggered after OAuth callback.

```typescript
// StravaSync.ts
async function syncInitial(userId: string): Promise<void> {
  const since = subDays(new Date(), 90);
  let page = 1;

  while (true) {
    const activities = await stravaClient.getActivities({ after: since, page, perPage: 100 });
    if (activities.length === 0) break;

    // Filter: keep only Run / TrailRun / VirtualRun
    const runs = activities.filter(a => ["Run", "TrailRun", "VirtualRun"].includes(a.type));

    for (const run of runs) {
      await activityService.upsert(userId, run);
    }

    page++;
    await sleep(500); // respect Strava rate limit (100 req/15min)
  }

  await aggregationService.recalculateAll(userId);
}
```

---

## T4 — Strava Webhook

Strava sends a POST on each activity creation / modification / deletion.

### Webhook Validation (subscription)

```typescript
// GET /strava/webhook?hub.challenge=...&hub.verify_token=...
// Strava calls this endpoint during subscription
app.get("/strava/webhook", async (req, res) => {
  const { "hub.verify_token": token, "hub.challenge": challenge } = req.query;
  if (token !== process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return res.code(403).send();
  }
  return res.send({ "hub.challenge": challenge });
});
```

### Event Processing

```typescript
// POST /strava/webhook
// Always respond 200 immediately, process in queue
app.post("/strava/webhook", async (req, res) => {
  await stravaQueue.add("sync-activity", req.body);
  return res.code(200).send();
});
```

---

## T5 — TSS Calculation

```typescript
// src/domain/activity/tss.ts

/**
 * TSS with heart rate (Banister method)
 * Reference: HR max as proxy for max intensity
 */
export function computeTSSWithHR(
  durationSec: number,
  avgHrBpm: number,
  maxHrBpm: number,
  restingHrBpm = 50
): number {
  // Simplified TRIMP
  const hrReserve = (avgHrBpm - restingHrBpm) / (maxHrBpm - restingHrBpm);
  const intensityFactor = hrReserve * 1.05;
  return (durationSec / 3600) * intensityFactor * intensityFactor * 100;
}

/**
 * Fallback without HR: estimation by pace and duration
 * Less precise but usable for workouts without heart rate monitor
 */
export function computeTSSFromPace(
  durationSec: number,
  avgPaceSecKm: number,
  thresholdPaceSecKm: number // estimated threshold pace (often 10km pace)
): number {
  const intensityFactor = Math.min(thresholdPaceSecKm / avgPaceSecKm, 1.15);
  return (durationSec / 3600) * intensityFactor * intensityFactor * 100;
}
```

---

## T6 — CTL / ATL / TSB Calculation

```typescript
// src/domain/aggregation/load.ts

/**
 * Incremental recalculation from the last known value.
 * Called after each activity ingestion.
 */
export function updateLoadMetrics(
  previousCtl: number,
  previousAtl: number,
  todayTss: number
): { ctl: number; atl: number; tsb: number } {
  // Time constants
  const CTL_DAYS = 42;
  const ATL_DAYS = 7;

  const ctl = previousCtl + (todayTss - previousCtl) / CTL_DAYS;
  const atl = previousAtl + (todayTss - previousAtl) / ATL_DAYS;
  const tsb = ctl - atl;

  return {
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round(tsb * 10) / 10,
  };
}

/**
 * Full recalculation from scratch (bootstrap or full recalc).
 * Used during initial sync.
 */
export function recalculateLoadFromScratch(
  dailyTss: Array<{ date: Date; tss: number }>
): Array<{ date: Date; ctl: number; atl: number; tsb: number }> {
  let ctl = 0;
  let atl = 0;

  return dailyTss
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ date, tss }) => {
      const metrics = updateLoadMetrics(ctl, atl, tss);
      ctl = metrics.ctl;
      atl = metrics.atl;
      return { date, ...metrics };
    });
}

export function getFormStatus(tsb: number): "fresh" | "optimal" | "tired" | "overreached" {
  if (tsb > 10) return "fresh";
  if (tsb >= -10) return "optimal";
  if (tsb >= -20) return "tired";
  return "overreached";
}
```

---

## T7 — API Endpoints

### `GET /activities`

```typescript
// Query params
const QuerySchema = z.object({
  limit:  z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  type:   z.enum(["Run", "TrailRun", "VirtualRun"]).optional(),
});

// Response
type ActivityListResponse = {
  items: ActivitySummary[];
  total: number;
  hasMore: boolean;
};
```

### `GET /aggregations/weekly`

```typescript
// Query params
const QuerySchema = z.object({
  weeks: z.coerce.number().min(1).max(52).default(8),
});

// Response
type WeeklyAggregatesResponse = {
  weeks: WeeklyAggregateSummary[];
  currentLoad: {
    ctl: number;
    atl: number;
    tsb: number;
    formStatus: "fresh" | "optimal" | "tired" | "overreached";
  };
};
```

### `POST /feedback/daily`

```typescript
const BodySchema = z.object({
  date:           z.string().date(),          // "2024-01-15"
  fatigue:        z.number().int().min(1).max(10),
  muscleSoreness: z.number().int().min(1).max(10),
  mood:           z.number().int().min(1).max(10),
  sleepQuality:   z.number().int().min(1).max(10),
  painLocations:  z.array(z.object({
    location: z.enum([...bodyLocations]),
    side:     z.enum(["left", "right", "both"]).optional(),
    type:     z.enum(["sharp", "dull", "burning", "tightness"]).optional(),
  })).default([]),
  notes: z.string().max(500).optional(),
});
```

### `POST /goals`

```typescript
const BodySchema = z.object({
  type:        z.enum([...goalTypes]),
  targetValue: z.number().positive(),
  targetDate:  z.string().datetime(),
  context:     z.string().max(500).optional(),
});
```

---

## T8 — Tests

Minimum coverage for iteration 1:

| File | Tests |
|---------|-------|
| `tss.ts` | computeTSSWithHR, computeTSSFromPace, edge cases |
| `load.ts` | updateLoadMetrics, recalculateFromScratch, getFormStatus |
| `AggregationService` | recalculation after activity, cache invalidation |
| `StravaOAuth` | refresh token, expiry handling |
| API Routes | Zod validation, JWT auth, 400/401/404 |

### Vitest Test Example

```typescript
import { describe, it, expect } from "vitest";
import { updateLoadMetrics, getFormStatus } from "../src/domain/aggregation/load";

describe("load metrics", () => {
  it("increases ATL faster than CTL on high TSS", () => {
    const result = updateLoadMetrics(50, 50, 150);
    expect(result.atl).toBeGreaterThan(result.ctl);
    expect(result.tsb).toBeLessThan(0);
  });

  it("returns 'overreached' when TSB < -20", () => {
    expect(getFormStatus(-25)).toBe("overreached");
  });
});
```
