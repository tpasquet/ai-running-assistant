# Iteration 1 — Foundations

## Objective

Build a functional backend capable of:
1. Authenticating a user via Strava (OAuth 2.0)
2. Ingesting their activities (initial sync + real-time webhook)
3. Computing and storing aggregates (CTL / ATL / TSB)
4. Exposing data via a typed and validated REST API

**No LLM in this iteration.** The AI layer will be connected in iteration 2.

---

## Functional Scope

### In scope ✅
- Strava OAuth (authorization code flow + automatic refresh)
- Initial sync of the last 90 days of activities
- Strava webhook (activity created/modified/deleted)
- TSS calculation per activity (if HR available, fallback on duration × estimated RPE)
- CTL / ATL / TSB calculation via incremental recalculation
- Weekly recalculation via cron
- GET endpoints for activities, aggregates, load status
- POST endpoint for daily feedback
- POST/GET endpoint for goal

### Out of scope ❌
- Email/password authentication (Strava only for MVP)
- AI layer / LangGraph
- User interface
- Push notifications
- AI-generated training plans

---

## Application Structure

```
runcoach-ai/
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── index.ts                     # entry point
│   ├── app.ts                       # Fastify setup + plugins
│   ├── shared/
│   │   ├── types/
│   │   │   ├── strava.types.ts      # Strava API types
│   │   │   └── domain.types.ts
│   │   ├── errors/
│   │   │   └── AppError.ts
│   │   └── utils/
│   │       ├── crypto.ts            # AES-256-GCM
│   │       ├── date.ts              # ISO week helpers
│   │       └── pace.ts              # pace conversions
│   ├── infra/
│   │   ├── db/
│   │   │   ├── prisma.ts            # singleton PrismaClient
│   │   │   └── repositories/
│   │   │       ├── ActivityRepository.ts
│   │   │       ├── AggregateRepository.ts
│   │   │       ├── FeedbackRepository.ts
│   │   │       └── GoalRepository.ts
│   │   ├── strava/
│   │   │   ├── StravaClient.ts      # Strava API wrapper (fetch)
│   │   │   ├── StravaOAuth.ts       # authorization + token refresh
│   │   │   ├── StravaWebhook.ts     # validation + dispatch
│   │   │   └── StravaSync.ts        # initial sync + delta
│   │   ├── queue/
│   │   │   ├── queues.ts            # BullMQ queues definition
│   │   │   └── workers/
│   │   │       └── strava-sync.worker.ts
│   │   └── cache/
│   │       └── redis.ts             # singleton ioredis
│   ├── domain/
│   │   ├── activity/
│   │   │   ├── ActivityService.ts
│   │   │   └── tss.ts               # TSS calculation
│   │   ├── aggregation/
│   │   │   ├── AggregationService.ts
│   │   │   └── load.ts              # CTL / ATL / TSB
│   │   ├── feedback/
│   │   │   └── FeedbackService.ts
│   │   └── goal/
│   │       └── GoalService.ts
│   └── api/
│       ├── plugins/
│       │   ├── auth.plugin.ts       # JWT verify
│       │   └── rateLimit.plugin.ts
│       └── routes/
│           ├── auth.routes.ts       # /auth/strava/*
│           ├── activity.routes.ts   # /activities/*
│           ├── aggregation.routes.ts
│           ├── feedback.routes.ts
│           ├── goal.routes.ts
│           └── webhook.routes.ts    # /strava/webhook
```

---

## API Endpoints

### Authentication

#### `GET /auth/strava/login`
Redirects to Strava OAuth

#### `GET /auth/strava/callback`
OAuth callback, returns an application JWT

---

### Activities

#### `GET /activities`
Lists the user's activities

**Query params:**
- `limit` (number, 1-100, default: 20)
- `offset` (number, default: 0)
- `type` (enum: Run, TrailRun, VirtualRun, optional)

**Response:**
```typescript
{
  items: ActivitySummary[];
  total: number;
  hasMore: boolean;
}
```

---

### Aggregations

#### `GET /aggregations/weekly`
Returns weekly aggregates

**Query params:**
- `weeks` (number, 1-52, default: 8)

**Response:**
```typescript
{
  weeks: WeeklyAggregateSummary[];
  currentLoad: {
    ctl: number;
    atl: number;
    tsb: number;
    formStatus: "fresh" | "optimal" | "tired" | "overreached";
  };
}
```

---

### Feedbacks

#### `POST /feedback/daily`
Records the user's daily feedback

**Body:**
```typescript
{
  date: string;           // "2024-01-15"
  fatigue: number;        // 1-10
  muscleSoreness: number; // 1-10
  mood: number;           // 1-10
  sleepQuality: number;   // 1-10
  painLocations?: Array<{
    location: BodyLocation;
    side?: "left" | "right" | "both";
    type?: "sharp" | "dull" | "burning" | "tightness";
  }>;
  notes?: string;         // max 500 chars
}
```

---

### Goals

#### `POST /goals`
Creates a goal

**Body:**
```typescript
{
  type: GoalType;
  targetValue: number;
  targetDate: string;     // ISO datetime
  context?: string;       // max 500 chars
}
```

#### `GET /goals`
Lists the user's goals

---

## Definition of Done

- [ ] `docker compose up` starts PostgreSQL + Redis without error
- [ ] `npm run db:migrate` applies the schema without error
- [ ] Complete Strava OAuth flow (login → callback → JWT returned)
- [ ] Initial 90-day sync stored in database (activities + TSS)
- [ ] Strava webhook processes a new activity in < 5s
- [ ] CTL / ATL / TSB calculated and consistent over 90 days of data
- [ ] `GET /aggregations/weekly` returns the last 8 weeks with formStatus
- [ ] `POST /feedback/daily` persists feedback with Zod validation
- [ ] `POST /goals` persists the goal
- [ ] Strava tokens encrypted in database (verifiable via `SELECT access_token_enc FROM strava_tokens`)
- [ ] Unit tests for TSS/CTL/ATL calculations pass (`npm test`)
- [ ] `npm run typecheck` passes without error
- [ ] `npm run lint` passes without error

---

## Interface for Iteration 2

The AI layer (iteration 2) will consume `AggregationService.getContextWindow(userId)` which returns:

```typescript
interface AggregatedContext {
  goal: { description: string; daysRemaining: number } | null;
  athleteLevel: "beginner" | "intermediate" | "advanced";
  estimatedVO2max: number | null;
  weeklyAggs: WeeklyAggregateSummary[];  // 8 weeks
  recentActivities: ActivitySummary[];   // last 10
  currentCTL: number;
  currentATL: number;
  currentTSB: number;
  formStatus: "fresh" | "optimal" | "tired" | "overreached";
  avgFatigue: number;   // 7-day avg
  avgMood: number;      // 7-day avg
  avgSleep: number;     // 7-day avg
  painSummary: string;  // ex: "left knee (2 days ago)"
  lastPainFeedback: string | null;
  currentPlanWeek: number | null;
  totalPlanWeeks: number | null;
  currentPhase: string | null;
  plannedSessions: string[];
}
```

This method **must be implemented** in iteration 1, even though no agent calls it yet. It will be cached in Redis (TTL 1h, invalidated after each Strava sync).
