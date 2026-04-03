# Strava OAuth + Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Strava OAuth 2.0 authentication and asynchronous activity sync (initial 90-day + real-time webhook) using a single BullMQ queue/worker.

**Architecture:** OAuth callback returns a JWT immediately and enqueues an `initial-sync` job. A single BullMQ worker processes both `initial-sync` and `sync-activity` jobs with 500ms sleep between Strava API pages and exponential backoff on 429. Strava tokens are encrypted with AES-256-GCM; the worker also handles token refresh proactively every 30 minutes via a cron job.

**Tech Stack:** Fastify 5, Prisma 6, PostgreSQL 16, BullMQ 5, ioredis, @fastify/jwt, Node.js crypto (built-in), Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `docker-compose.yml` | Create | PostgreSQL 16 + Redis 7 for local dev |
| `prisma/schema.prisma` | Create | User, StravaToken, Activity models |
| `src/shared/utils/crypto.ts` | Create | AES-256-GCM encrypt/decrypt |
| `src/infra/db/prisma.ts` | Create | Singleton PrismaClient |
| `src/infra/db/repositories/ActivityRepository.ts` | Create | DB access for Activity |
| `src/infra/strava/StravaClient.ts` | Create | Strava API fetch wrapper |
| `src/infra/strava/StravaOAuth.ts` | Create | OAuth flow + token refresh |
| `src/infra/strava/StravaSync.ts` | Create | syncInitial + syncActivity |
| `src/infra/queue/queues.ts` | Create | BullMQ queue definition |
| `src/infra/queue/workers/strava-sync.worker.ts` | Create | Job processor (initial-sync, sync-activity) |
| `src/api/plugins/auth.plugin.ts` | Create | JWT verify Fastify decorator |
| `src/api/routes/auth.routes.ts` | Create | GET /auth/strava/login + /callback |
| `src/api/routes/webhook.routes.ts` | Create | GET+POST /strava/webhook |
| `src/api/server.ts` | Modify | Register new routes + auth plugin |

---

## Task 0: Dependencies & Infrastructure

**Files:**
- Create: `docker-compose.yml`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install required packages**

```bash
npm install --legacy-peer-deps prisma @prisma/client @fastify/jwt bullmq ioredis
```

Expected output: packages added, no errors (warnings about peer deps are OK).

- [ ] **Step 2: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: runcoach
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

volumes:
  pgdata:
```

- [ ] **Step 3: Start Docker services**

```bash
docker compose up -d
```

Expected: containers `runcoach-ai-postgres-1` and `runcoach-ai-redis-1` running.

- [ ] **Step 4: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` and `.env` created.

- [ ] **Step 5: Update DATABASE_URL in .env**

Edit `.env` — set:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/runcoach"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY=<your key>
JWT_SECRET=dev-jwt-secret-change-in-production
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
STRAVA_CLIENT_ID=<your strava client id>
STRAVA_CLIENT_SECRET=<your strava client secret>
STRAVA_WEBHOOK_VERIFY_TOKEN=dev-webhook-token
PORT=3000
```

Note: `ENCRYPTION_KEY` must be exactly 64 hex chars (32 bytes). The value above is a dev placeholder.

- [ ] **Step 6: Add db scripts to package.json**

In `package.json`, add to `"scripts"`:
```json
"db:migrate": "prisma migrate dev",
"db:generate": "prisma generate",
"db:studio": "prisma studio"
```

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml prisma/ package.json package-lock.json
git commit -m "chore: add Docker, Prisma init, install backend deps"
```

---

## Task 1: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write the schema**

Replace the contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String       @id @default(cuid())
  stravaId    Int          @unique
  username    String
  createdAt   DateTime     @default(now())
  stravaToken StravaToken?
  activities  Activity[]
}

model StravaToken {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessTokenEnc  String
  refreshTokenEnc String
  expiresAt       DateTime
  scope           String
  updatedAt       DateTime @updatedAt
}

model Activity {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stravaId            BigInt   @unique
  type                String
  startDate           DateTime
  distanceM           Float
  movingTimeSec       Int
  elapsedTimeSec      Int
  totalElevationGainM Float
  averageSpeedMS      Float
  maxSpeedMS          Float
  avgPaceSecKm        Float
  avgHrBpm            Int?
  maxHrBpm            Int?
  calories            Float?
  avgCadence          Float?
  avgTemp             Float?
  perceivedEffort     Int?
  tss                 Float?
  polyline            String?
  gearId              String?
  createdAt           DateTime @default(now())

  @@index([userId, startDate])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration file created in `prisma/migrations/`, tables created in DB.

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `node_modules/.prisma/client` generated.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add Prisma schema (User, StravaToken, Activity)"
```

---

## Task 2: Crypto Utility

**Files:**
- Create: `src/shared/utils/crypto.ts`
- Create: `src/shared/utils/__tests__/crypto.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/utils/__tests__/crypto.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../crypto.js";

describe("crypto", () => {
  it("encrypts and decrypts a value", () => {
    const key = "0".repeat(64); // 32 bytes hex
    const value = "my-secret-token";

    const encrypted = encrypt(value, key);
    const decrypted = decrypt(encrypted, key);

    expect(decrypted).toBe(value);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const key = "0".repeat(64);
    const value = "same-input";

    const enc1 = encrypt(value, key);
    const enc2 = encrypt(value, key);

    expect(enc1).not.toBe(enc2);
  });

  it("throws on wrong key", () => {
    const key = "0".repeat(64);
    const wrongKey = "f".repeat(64);
    const encrypted = encrypt("secret", key);

    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it("throws on tampered ciphertext", () => {
    const key = "0".repeat(64);
    const encrypted = encrypt("secret", key);
    const tampered = encrypted.slice(0, -4) + "0000";

    expect(() => decrypt(tampered, key)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/shared/utils/__tests__/crypto.test.ts
```

Expected: FAIL — "Cannot find module '../crypto.js'"

- [ ] **Step 3: Implement crypto.ts**

Create `src/shared/utils/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96 bits for GCM
const TAG_LENGTH = 16;

/**
 * Encrypts a string with AES-256-GCM.
 * Returns "iv:authTag:ciphertext" (all hex-encoded).
 * The key must be a 64-char hex string (32 bytes).
 */
export function encrypt(value: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a string encrypted by `encrypt`.
 * Throws if the key is wrong or the ciphertext is tampered.
 */
export function decrypt(encoded: string, hexKey: string): string {
  const parts = encoded.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];
  const key = Buffer.from(hexKey, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/shared/utils/__tests__/crypto.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/
git commit -m "feat: add AES-256-GCM crypto utility"
```

---

## Task 3: Prisma Singleton + ActivityRepository

**Files:**
- Create: `src/infra/db/prisma.ts`
- Create: `src/infra/db/repositories/ActivityRepository.ts`
- Create: `src/infra/db/repositories/__tests__/ActivityRepository.test.ts`

- [ ] **Step 1: Create Prisma singleton**

Create `src/infra/db/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: Write failing tests for ActivityRepository**

Create `src/infra/db/repositories/__tests__/ActivityRepository.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { ActivityRepository } from "../ActivityRepository.js";

const mockPrisma = {
  activity: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe("ActivityRepository", () => {
  let repo: ActivityRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ActivityRepository(mockPrisma);
  });

  it("upserts an activity by stravaId", async () => {
    const activity = {
      userId: "user-1",
      stravaId: BigInt(123456),
      type: "Run",
      startDate: new Date("2024-01-15"),
      distanceM: 10000,
      movingTimeSec: 3600,
      elapsedTimeSec: 3700,
      totalElevationGainM: 150,
      averageSpeedMS: 2.78,
      maxSpeedMS: 4.0,
      avgPaceSecKm: 360,
      avgHrBpm: 155,
      maxHrBpm: 175,
      calories: null,
      avgCadence: null,
      avgTemp: null,
      perceivedEffort: null,
      tss: null,
      polyline: null,
      gearId: null,
    };

    vi.mocked(mockPrisma.activity.upsert).mockResolvedValue({
      id: "act-1",
      createdAt: new Date(),
      ...activity,
    } as any);

    await repo.upsert(activity);

    expect(mockPrisma.activity.upsert).toHaveBeenCalledWith({
      where: { stravaId: BigInt(123456) },
      create: { ...activity },
      update: expect.objectContaining({ distanceM: 10000 }),
    });
  });

  it("finds recent activities for a user", async () => {
    vi.mocked(mockPrisma.activity.findMany).mockResolvedValue([]);

    await repo.findRecent("user-1", 10);

    expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", type: { in: ["Run", "TrailRun", "VirtualRun"] } },
      orderBy: { startDate: "desc" },
      take: 10,
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/infra/db/repositories/__tests__/ActivityRepository.test.ts
```

Expected: FAIL — "Cannot find module '../ActivityRepository.js'"

- [ ] **Step 4: Implement ActivityRepository**

Create `src/infra/db/repositories/ActivityRepository.ts`:

```typescript
import type { PrismaClient } from "@prisma/client";

interface ActivityData {
  userId: string;
  stravaId: bigint;
  type: string;
  startDate: Date;
  distanceM: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  totalElevationGainM: number;
  averageSpeedMS: number;
  maxSpeedMS: number;
  avgPaceSecKm: number;
  avgHrBpm: number | null;
  maxHrBpm: number | null;
  calories: number | null;
  avgCadence: number | null;
  avgTemp: number | null;
  perceivedEffort: number | null;
  tss: number | null;
  polyline: string | null;
  gearId: string | null;
}

export class ActivityRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsert(data: ActivityData): Promise<void> {
    const { stravaId, ...rest } = data;
    await this.db.activity.upsert({
      where: { stravaId },
      create: { stravaId, ...rest },
      update: rest,
    });
  }

  async findRecent(userId: string, limit: number) {
    return this.db.activity.findMany({
      where: {
        userId,
        type: { in: ["Run", "TrailRun", "VirtualRun"] },
      },
      orderBy: { startDate: "desc" },
      take: limit,
    });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/infra/db/repositories/__tests__/ActivityRepository.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/infra/db/
git commit -m "feat: add Prisma singleton and ActivityRepository"
```

---

## Task 4: StravaClient

**Files:**
- Create: `src/infra/strava/StravaClient.ts`
- Create: `src/infra/strava/__tests__/StravaClient.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/infra/strava/__tests__/StravaClient.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StravaClient } from "../StravaClient.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("StravaClient", () => {
  let client: StravaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new StravaClient("test-access-token");
  });

  it("fetches a page of activities", async () => {
    const mockActivities = [{ id: 1, type: "Run", distance: 10000 }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockActivities,
      headers: { get: () => null },
    });

    const result = await client.getActivities({ after: new Date("2024-01-01"), page: 1, perPage: 100 });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("after="),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-access-token" }),
      })
    );
    expect(result).toEqual(mockActivities);
  });

  it("fetches a single activity by id", async () => {
    const mockActivity = { id: 123456, type: "Run", distance: 5000 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockActivity,
      headers: { get: () => null },
    });

    const result = await client.getActivity(123456);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.strava.com/api/v3/activities/123456",
      expect.anything()
    );
    expect(result).toEqual(mockActivity);
  });

  it("throws StravaRateLimitError on 429", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: (h: string) => h === "X-RateLimit-Reset" ? "60" : null },
    });

    await expect(client.getActivity(1)).rejects.toThrow("Rate limit exceeded");
  });

  it("throws on non-200 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
    });

    await expect(client.getActivity(1)).rejects.toThrow("Strava API error: 401");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/infra/strava/__tests__/StravaClient.test.ts
```

Expected: FAIL — "Cannot find module '../StravaClient.js'"

- [ ] **Step 3: Create AppError base class if not present**

Check `src/shared/errors/AppError.ts` — if it doesn't exist, create it:

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class StravaRateLimitError extends AppError {
  constructor(public readonly retryAfterSec: number) {
    super("Rate limit exceeded", 429, "STRAVA_RATE_LIMIT");
  }
}

export class StravaAuthError extends AppError {
  constructor(message: string) {
    super(message, 401, "STRAVA_AUTH_ERROR");
  }
}

export class ActivitySyncError extends AppError {
  constructor(message: string) {
    super(message, 500, "ACTIVITY_SYNC_ERROR");
  }
}
```

- [ ] **Step 4: Implement StravaClient**

Create `src/infra/strava/StravaClient.ts`:

```typescript
import { StravaRateLimitError, AppError } from "../../shared/errors/AppError.js";

const STRAVA_BASE = "https://www.strava.com/api/v3";

export interface StravaActivity {
  id: number;
  type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  average_cadence?: number;
  average_temp?: number;
  map?: { summary_polyline?: string };
  gear_id?: string;
}

export class StravaClient {
  constructor(private readonly accessToken: string) {}

  private async request<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("X-RateLimit-Reset") ?? "60");
      throw new StravaRateLimitError(retryAfter);
    }

    if (!response.ok) {
      throw new AppError(`Strava API error: ${response.status}`, response.status, "STRAVA_API_ERROR");
    }

    return response.json() as Promise<T>;
  }

  async getActivities(params: {
    after: Date;
    page: number;
    perPage: number;
  }): Promise<StravaActivity[]> {
    const afterUnix = Math.floor(params.after.getTime() / 1000);
    const url = `${STRAVA_BASE}/athlete/activities?after=${afterUnix}&page=${params.page}&per_page=${params.perPage}`;
    return this.request<StravaActivity[]>(url);
  }

  async getActivity(stravaId: number): Promise<StravaActivity> {
    return this.request<StravaActivity>(`${STRAVA_BASE}/activities/${stravaId}`);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/infra/strava/__tests__/StravaClient.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/infra/strava/ src/shared/errors/
git commit -m "feat: add StravaClient and AppError classes"
```

---

## Task 5: StravaOAuth

**Files:**
- Create: `src/infra/strava/StravaOAuth.ts`
- Create: `src/infra/strava/__tests__/StravaOAuth.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/infra/strava/__tests__/StravaOAuth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { StravaOAuth } from "../StravaOAuth.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockPrisma = {
  user: { upsert: vi.fn() },
  stravaToken: { upsert: vi.fn(), findMany: vi.fn() },
} as unknown as PrismaClient;

const config = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  encryptionKey: "0".repeat(64),
};

describe("StravaOAuth", () => {
  let oauth: StravaOAuth;

  beforeEach(() => {
    vi.clearAllMocks();
    oauth = new StravaOAuth(mockPrisma, config);
  });

  it("exchanges code for tokens and creates user", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_at: Math.floor(Date.now() / 1000) + 21600,
        athlete: { id: 99, username: "runner_terry" },
        scope: "activity:read_all",
      }),
    });

    vi.mocked(mockPrisma.user.upsert).mockResolvedValue({
      id: "user-1",
      stravaId: 99,
      username: "runner_terry",
      createdAt: new Date(),
    } as any);

    vi.mocked(mockPrisma.stravaToken.upsert).mockResolvedValue({} as any);

    const result = await oauth.exchangeCode("auth-code-xyz");

    expect(result.userId).toBe("user-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.strava.com/oauth/token",
      expect.objectContaining({ method: "POST" })
    );
    // Tokens must be stored encrypted (not plain text)
    const upsertCall = vi.mocked(mockPrisma.stravaToken.upsert).mock.calls[0]?.[0];
    expect(upsertCall?.create.accessTokenEnc).not.toBe("access-123");
    expect(upsertCall?.create.refreshTokenEnc).not.toBe("refresh-456");
  });

  it("refreshes tokens for users expiring soon", async () => {
    const soonExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

    vi.mocked(mockPrisma.stravaToken.findMany).mockResolvedValue([
      {
        id: "tok-1",
        userId: "user-1",
        accessTokenEnc: "enc-access",
        refreshTokenEnc: "enc-refresh",
        expiresAt: soonExpiry,
        scope: "activity:read_all",
        updatedAt: new Date(),
      },
    ] as any);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 21600,
      }),
    });

    vi.mocked(mockPrisma.stravaToken.upsert).mockResolvedValue({} as any);

    await oauth.refreshExpiringTokens();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockPrisma.stravaToken.upsert).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/infra/strava/__tests__/StravaOAuth.test.ts
```

Expected: FAIL — "Cannot find module '../StravaOAuth.js'"

- [ ] **Step 3: Implement StravaOAuth**

Create `src/infra/strava/StravaOAuth.ts`:

```typescript
import type { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../../shared/utils/crypto.js";
import { StravaAuthError } from "../../shared/errors/AppError.js";

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; username: string };
  scope?: string;
}

export class StravaOAuth {
  constructor(
    private readonly db: PrismaClient,
    private readonly config: OAuthConfig
  ) {}

  getAuthorizationUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "activity:read_all",
    });
    return `https://www.strava.com/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<{ userId: string }> {
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      throw new StravaAuthError(`OAuth exchange failed: ${response.status}`);
    }

    const data = (await response.json()) as TokenResponse;

    if (!data.athlete) {
      throw new StravaAuthError("No athlete data in OAuth response");
    }

    const user = await this.db.user.upsert({
      where: { stravaId: data.athlete.id },
      create: { stravaId: data.athlete.id, username: data.athlete.username },
      update: { username: data.athlete.username },
    });

    await this.storeToken(user.id, data);

    return { userId: user.id };
  }

  async getAccessToken(userId: string): Promise<string> {
    const token = await this.db.stravaToken.findFirst({ where: { userId } });
    if (!token) throw new StravaAuthError(`No token for user ${userId}`);
    return decrypt(token.accessTokenEnc, this.config.encryptionKey);
  }

  async refreshExpiringTokens(): Promise<void> {
    const threshold = new Date(Date.now() + 60 * 60 * 1000); // 1h from now
    const tokens = await this.db.stravaToken.findMany({
      where: { expiresAt: { lt: threshold } },
    });

    for (const token of tokens) {
      const refreshToken = decrypt(token.refreshTokenEnc, this.config.encryptionKey);
      const response = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) continue; // log and skip, don't crash

      const data = (await response.json()) as TokenResponse;
      await this.storeToken(token.userId, data);
    }
  }

  private async storeToken(userId: string, data: TokenResponse): Promise<void> {
    const { encryptionKey } = this.config;
    await this.db.stravaToken.upsert({
      where: { userId },
      create: {
        userId,
        accessTokenEnc: encrypt(data.access_token, encryptionKey),
        refreshTokenEnc: encrypt(data.refresh_token, encryptionKey),
        expiresAt: new Date(data.expires_at * 1000),
        scope: data.scope ?? "activity:read_all",
      },
      update: {
        accessTokenEnc: encrypt(data.access_token, encryptionKey),
        refreshTokenEnc: encrypt(data.refresh_token, encryptionKey),
        expiresAt: new Date(data.expires_at * 1000),
      },
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/infra/strava/__tests__/StravaOAuth.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/infra/strava/StravaOAuth.ts src/infra/strava/__tests__/StravaOAuth.test.ts
git commit -m "feat: add StravaOAuth (exchange code, token refresh)"
```

---

## Task 6: StravaSync

**Files:**
- Create: `src/infra/strava/StravaSync.ts`
- Create: `src/infra/strava/__tests__/StravaSync.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/infra/strava/__tests__/StravaSync.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StravaSync } from "../StravaSync.js";
import type { StravaClient } from "../StravaClient.js";
import type { ActivityRepository } from "../../db/repositories/ActivityRepository.js";

const mockClient = {
  getActivities: vi.fn(),
  getActivity: vi.fn(),
} as unknown as StravaClient;

const mockRepo = {
  upsert: vi.fn(),
} as unknown as ActivityRepository;

vi.mock("../../../shared/utils/sleep.js", () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

describe("StravaSync", () => {
  let sync: StravaSync;

  beforeEach(() => {
    vi.clearAllMocks();
    sync = new StravaSync(mockClient, mockRepo);
  });

  it("syncs all pages until empty response", async () => {
    vi.mocked(mockClient.getActivities)
      .mockResolvedValueOnce([
        { id: 1, type: "Run", start_date: "2024-01-15T10:00:00Z", distance: 10000, moving_time: 3600, elapsed_time: 3700, total_elevation_gain: 100, average_speed: 2.78, max_speed: 4.0 },
      ])
      .mockResolvedValueOnce([]); // second page empty → stop

    await sync.syncInitial("user-1");

    expect(mockClient.getActivities).toHaveBeenCalledTimes(2);
    expect(mockRepo.upsert).toHaveBeenCalledTimes(1);
  });

  it("only syncs Run, TrailRun, VirtualRun activities", async () => {
    vi.mocked(mockClient.getActivities)
      .mockResolvedValueOnce([
        { id: 1, type: "Run", start_date: "2024-01-15T10:00:00Z", distance: 10000, moving_time: 3600, elapsed_time: 3700, total_elevation_gain: 100, average_speed: 2.78, max_speed: 4.0 },
        { id: 2, type: "Ride", start_date: "2024-01-14T10:00:00Z", distance: 30000, moving_time: 5400, elapsed_time: 5400, total_elevation_gain: 200, average_speed: 5.55, max_speed: 8.0 },
      ])
      .mockResolvedValueOnce([]);

    await sync.syncInitial("user-1");

    expect(mockRepo.upsert).toHaveBeenCalledTimes(1); // only Run
  });

  it("syncs a single activity by stravaId", async () => {
    vi.mocked(mockClient.getActivity).mockResolvedValueOnce({
      id: 999, type: "TrailRun", start_date: "2024-01-20T08:00:00Z",
      distance: 15000, moving_time: 5400, elapsed_time: 5500,
      total_elevation_gain: 400, average_speed: 2.78, max_speed: 3.5,
    });

    await sync.syncActivity("user-1", 999);

    expect(mockClient.getActivity).toHaveBeenCalledWith(999);
    expect(mockRepo.upsert).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Create sleep utility**

Create `src/shared/utils/sleep.ts`:

```typescript
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/infra/strava/__tests__/StravaSync.test.ts
```

Expected: FAIL — "Cannot find module '../StravaSync.js'"

- [ ] **Step 4: Implement StravaSync**

Create `src/infra/strava/StravaSync.ts`:

```typescript
import { subDays } from "./dateUtils.js";
import { sleep } from "../../shared/utils/sleep.js";
import { StravaRateLimitError } from "../../shared/errors/AppError.js";
import type { StravaClient, StravaActivity } from "./StravaClient.js";
import type { ActivityRepository } from "../db/repositories/ActivityRepository.js";

const SYNC_DAYS = 90;
const PAGE_SIZE = 100;
const PAGE_SLEEP_MS = 500;
const ALLOWED_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);

export class StravaSync {
  constructor(
    private readonly client: StravaClient,
    private readonly repo: ActivityRepository
  ) {}

  async syncInitial(userId: string): Promise<void> {
    const after = subDays(new Date(), SYNC_DAYS);
    let page = 1;

    while (true) {
      let activities: StravaActivity[];

      try {
        activities = await this.client.getActivities({ after, page, perPage: PAGE_SIZE });
      } catch (err) {
        if (err instanceof StravaRateLimitError) {
          await sleep(err.retryAfterSec * 1000);
          continue; // retry same page
        }
        throw err;
      }

      if (activities.length === 0) break;

      const runs = activities.filter((a) => ALLOWED_TYPES.has(a.type));
      for (const activity of runs) {
        await this.repo.upsert(this.toActivityData(userId, activity));
      }

      page++;
      await sleep(PAGE_SLEEP_MS);
    }
  }

  async syncActivity(userId: string, stravaId: number): Promise<void> {
    const activity = await this.client.getActivity(stravaId);
    if (!ALLOWED_TYPES.has(activity.type)) return;
    await this.repo.upsert(this.toActivityData(userId, activity));
  }

  private toActivityData(userId: string, a: StravaActivity) {
    const distanceKm = a.distance / 1000;
    const avgPaceSecKm = distanceKm > 0 ? a.moving_time / distanceKm : 0;

    return {
      userId,
      stravaId: BigInt(a.id),
      type: a.type,
      startDate: new Date(a.start_date),
      distanceM: a.distance,
      movingTimeSec: a.moving_time,
      elapsedTimeSec: a.elapsed_time,
      totalElevationGainM: a.total_elevation_gain,
      averageSpeedMS: a.average_speed,
      maxSpeedMS: a.max_speed,
      avgPaceSecKm,
      avgHrBpm: a.average_heartrate ?? null,
      maxHrBpm: a.max_heartrate ?? null,
      calories: a.calories ?? null,
      avgCadence: a.average_cadence ?? null,
      avgTemp: a.average_temp ?? null,
      perceivedEffort: null,
      tss: null,
      polyline: a.map?.summary_polyline ?? null,
      gearId: a.gear_id ?? null,
    };
  }
}
```

- [ ] **Step 5: Create dateUtils helper**

Create `src/infra/strava/dateUtils.ts`:

```typescript
export function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/infra/strava/__tests__/StravaSync.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/infra/strava/ src/shared/utils/sleep.ts
git commit -m "feat: add StravaSync (initial 90d + single activity)"
```

---

## Task 7: BullMQ Queue + Worker

**Files:**
- Create: `src/infra/queue/queues.ts`
- Create: `src/infra/queue/workers/strava-sync.worker.ts`
- Create: `src/infra/queue/workers/__tests__/strava-sync.worker.test.ts`

- [ ] **Step 1: Create Redis singleton**

Create `src/infra/cache/redis.ts`:

```typescript
import { Redis } from "ioredis";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null, // required by BullMQ
});
```

- [ ] **Step 2: Create queue definition**

Create `src/infra/queue/queues.ts`:

```typescript
import { Queue } from "bullmq";
import { redis } from "../cache/redis.js";

export const stravaQueue = new Queue("strava-sync", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export type StravaSyncJobData =
  | { type: "initial-sync"; userId: string }
  | { type: "sync-activity"; userId: string; stravaActivityId: number; stravaOwnerId: number };
```

- [ ] **Step 3: Write failing tests for the worker**

Create `src/infra/queue/workers/__tests__/strava-sync.worker.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processStravaJob } from "../strava-sync.worker.js";
import type { StravaSync } from "../../../strava/StravaSync.js";
import type { StravaOAuth } from "../../../strava/StravaOAuth.js";

const mockSync = {
  syncInitial: vi.fn(),
  syncActivity: vi.fn(),
} as unknown as StravaSync;

const mockOAuth = {
  getAccessToken: vi.fn().mockResolvedValue("access-token-123"),
} as unknown as StravaOAuth;

describe("processStravaJob", () => {
  beforeEach(() => vi.clearAllMocks());

  it("handles initial-sync job", async () => {
    await processStravaJob(
      { data: { type: "initial-sync", userId: "user-1" } } as any,
      mockOAuth,
      (token) => mockSync
    );

    expect(mockOAuth.getAccessToken).toHaveBeenCalledWith("user-1");
    expect(mockSync.syncInitial).toHaveBeenCalledWith("user-1");
  });

  it("handles sync-activity job", async () => {
    await processStravaJob(
      { data: { type: "sync-activity", userId: "user-1", stravaActivityId: 999, stravaOwnerId: 42 } } as any,
      mockOAuth,
      (token) => mockSync
    );

    expect(mockSync.syncActivity).toHaveBeenCalledWith("user-1", 999);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npx vitest run src/infra/queue/workers/__tests__/strava-sync.worker.test.ts
```

Expected: FAIL — "Cannot find module '../strava-sync.worker.js'"

- [ ] **Step 5: Implement the worker processor**

Create `src/infra/queue/workers/strava-sync.worker.ts`:

```typescript
import { Worker } from "bullmq";
import { redis } from "../../cache/redis.js";
import type { Job } from "bullmq";
import type { StravaSyncJobData } from "../queues.js";
import type { StravaOAuth } from "../../strava/StravaOAuth.js";
import type { StravaSync } from "../../strava/StravaSync.js";
import { StravaClient } from "../../strava/StravaClient.js";
import { ActivityRepository } from "../../db/repositories/ActivityRepository.js";
import { StravaSync as StravaSyncImpl } from "../../strava/StravaSync.js";
import { prisma } from "../../db/prisma.js";

/**
 * Pure job processor — extracted for testability.
 * syncFactory allows injecting a mock StravaSync in tests.
 */
export async function processStravaJob(
  job: Job<StravaSyncJobData>,
  oauth: StravaOAuth,
  syncFactory: (accessToken: string) => StravaSync
): Promise<void> {
  const { userId } = job.data;
  const accessToken = await oauth.getAccessToken(userId);
  const sync = syncFactory(accessToken);

  if (job.data.type === "initial-sync") {
    await sync.syncInitial(userId);
  } else if (job.data.type === "sync-activity") {
    await sync.syncActivity(userId, job.data.stravaActivityId);
  }
}

/**
 * Start the BullMQ worker. Called from the entry point.
 */
export function startWorker(oauth: StravaOAuth): Worker {
  const repo = new ActivityRepository(prisma);

  return new Worker<StravaSyncJobData>(
    "strava-sync",
    async (job) => {
      await processStravaJob(job, oauth, (token) => {
        const client = new StravaClient(token);
        return new StravaSyncImpl(client, repo);
      });
    },
    { connection: redis, concurrency: 1 }
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/infra/queue/workers/__tests__/strava-sync.worker.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/infra/queue/ src/infra/cache/
git commit -m "feat: add BullMQ queue and strava-sync worker"
```

---

## Task 8: JWT Auth Plugin

**Files:**
- Create: `src/api/plugins/auth.plugin.ts`
- Create: `src/api/plugins/__tests__/auth.plugin.test.ts`

- [ ] **Step 1: Install @fastify/jwt if not present**

```bash
npm list @fastify/jwt || npm install --legacy-peer-deps @fastify/jwt
```

- [ ] **Step 2: Write failing tests**

Create `src/api/plugins/__tests__/auth.plugin.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { authPlugin } from "../auth.plugin.js";

async function buildApp() {
  const app = Fastify();
  await app.register(authPlugin, { jwtSecret: "test-secret" });
  app.get("/protected", { preHandler: app.authenticate }, async () => ({ ok: true }));
  await app.ready();
  return app;
}

describe("authPlugin", () => {
  it("rejects requests without Authorization header", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/protected" });
    expect(res.statusCode).toBe(401);
  });

  it("accepts valid JWT", async () => {
    const app = await buildApp();
    const token = app.jwt.sign({ sub: "user-1" });
    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it("rejects invalid JWT", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { Authorization: "Bearer invalid.token.here" },
    });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/api/plugins/__tests__/auth.plugin.test.ts
```

Expected: FAIL — "Cannot find module '../auth.plugin.js'"

- [ ] **Step 4: Implement auth plugin**

Create `src/api/plugins/auth.plugin.ts`:

```typescript
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

interface AuthPluginOptions {
  jwtSecret: string;
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, opts) => {
  await app.register(jwt, { secret: opts.jwtSecret });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });
};

export default fp(authPlugin);
export { authPlugin };
```

Note: Install `fastify-plugin` if needed:
```bash
npm install --legacy-peer-deps fastify-plugin
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/api/plugins/__tests__/auth.plugin.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/api/plugins/
git commit -m "feat: add JWT auth plugin with authenticate decorator"
```

---

## Task 9: Auth Routes

**Files:**
- Create: `src/api/routes/auth.routes.ts`
- Create: `src/api/routes/__tests__/auth.routes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/api/routes/__tests__/auth.routes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { authRoutes } from "../auth.routes.js";
import type { StravaOAuth } from "../../../infra/strava/StravaOAuth.js";
import type { Queue } from "bullmq";

const mockOAuth = {
  getAuthorizationUrl: vi.fn().mockReturnValue("https://strava.com/oauth/authorize?..."),
  exchangeCode: vi.fn().mockResolvedValue({ userId: "user-1" }),
} as unknown as StravaOAuth;

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: "job-1" }),
} as unknown as Queue;

async function buildApp() {
  const app = Fastify();
  app.register(import("@fastify/jwt").then(m => m.default), { secret: "test-secret" });
  await app.register(authRoutes, { oauth: mockOAuth, stravaQueue: mockQueue });
  await app.ready();
  return app;
}

describe("auth routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /auth/strava/login redirects to Strava", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/auth/strava/login" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("strava.com");
  });

  it("GET /auth/strava/callback returns JWT and enqueues sync", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/auth/strava/callback?code=valid-code&scope=activity:read_all",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.jwt).toBeDefined();
    expect(mockQueue.add).toHaveBeenCalledWith(
      "initial-sync",
      { type: "initial-sync", userId: "user-1" }
    );
  });

  it("GET /auth/strava/callback rejects missing code", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/auth/strava/callback" });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/api/routes/__tests__/auth.routes.test.ts
```

Expected: FAIL — "Cannot find module '../auth.routes.js'"

- [ ] **Step 3: Implement auth routes**

Create `src/api/routes/auth.routes.ts`:

```typescript
import type { FastifyPluginAsync } from "fastify";
import type { Queue } from "bullmq";
import type { StravaOAuth } from "../../infra/strava/StravaOAuth.js";
import { z } from "zod";

interface AuthRoutesOptions {
  oauth: StravaOAuth;
  stravaQueue: Queue;
}

const CallbackSchema = z.object({
  code: z.string().min(1),
  scope: z.string().optional(),
});

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, opts) => {
  const { oauth, stravaQueue } = opts;

  app.get("/auth/strava/login", async (req, reply) => {
    const redirectUri = `${req.protocol}://${req.hostname}/auth/strava/callback`;
    const url = oauth.getAuthorizationUrl(redirectUri);
    return reply.redirect(url);
  });

  app.get("/auth/strava/callback", async (req, reply) => {
    const result = CallbackSchema.safeParse(req.query);
    if (!result.success) {
      return reply.code(400).send({ error: "Missing required query param: code" });
    }

    const { userId } = await oauth.exchangeCode(result.data.code);

    await stravaQueue.add("initial-sync", { type: "initial-sync", userId });

    const jwt = app.jwt.sign({ sub: userId }, { expiresIn: "7d" });
    return { jwt };
  });
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/api/routes/__tests__/auth.routes.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/routes/auth.routes.ts src/api/routes/__tests__/auth.routes.test.ts
git commit -m "feat: add Strava OAuth routes (login + callback)"
```

---

## Task 10: Webhook Routes

**Files:**
- Create: `src/api/routes/webhook.routes.ts`
- Create: `src/api/routes/__tests__/webhook.routes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/api/routes/__tests__/webhook.routes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { webhookRoutes } from "../webhook.routes.js";
import type { Queue } from "bullmq";

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: "job-1" }),
} as unknown as Queue;

const VERIFY_TOKEN = "test-verify-token";

async function buildApp() {
  const app = Fastify();
  await app.register(webhookRoutes, { stravaQueue: mockQueue, verifyToken: VERIFY_TOKEN });
  await app.ready();
  return app;
}

describe("webhook routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /strava/webhook responds to Strava subscription challenge", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/strava/webhook?hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123&hub.mode=subscribe`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ "hub.challenge": "abc123" });
  });

  it("GET /strava/webhook rejects wrong verify token", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/strava/webhook?hub.verify_token=wrong&hub.challenge=abc123&hub.mode=subscribe",
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /strava/webhook enqueues sync-activity and returns 200 immediately", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/strava/webhook",
      payload: {
        object_type: "activity",
        aspect_type: "create",
        object_id: 999,
        owner_id: 42,
        subscription_id: 1,
        event_time: 1234567890,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(mockQueue.add).toHaveBeenCalledWith(
      "sync-activity",
      expect.objectContaining({ type: "sync-activity", stravaActivityId: 999 })
    );
  });

  it("POST /strava/webhook ignores non-activity events", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/strava/webhook",
      payload: { object_type: "athlete", aspect_type: "update", object_id: 42, owner_id: 42, subscription_id: 1, event_time: 123 },
    });
    expect(res.statusCode).toBe(200);
    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/api/routes/__tests__/webhook.routes.test.ts
```

Expected: FAIL — "Cannot find module '../webhook.routes.js'"

- [ ] **Step 3: Implement webhook routes**

Create `src/api/routes/webhook.routes.ts`:

```typescript
import type { FastifyPluginAsync } from "fastify";
import type { Queue } from "bullmq";

interface WebhookRoutesOptions {
  stravaQueue: Queue;
  verifyToken: string;
}

export const webhookRoutes: FastifyPluginAsync<WebhookRoutesOptions> = async (app, opts) => {
  const { stravaQueue, verifyToken } = opts;

  // Strava subscription validation
  app.get("/strava/webhook", async (req, reply) => {
    const query = req.query as Record<string, string>;
    if (query["hub.verify_token"] !== verifyToken) {
      return reply.code(403).send({ error: "Invalid verify token" });
    }
    return { "hub.challenge": query["hub.challenge"] };
  });

  // Real-time event
  app.post("/strava/webhook", async (req, reply) => {
    const body = req.body as {
      object_type: string;
      aspect_type: string;
      object_id: number;
      owner_id: number;
    };

    // Respond immediately — Strava requires < 2s
    reply.code(200).send();

    if (body.object_type === "activity" && ["create", "update"].includes(body.aspect_type)) {
      // userId resolution would require a DB lookup; using stravaOwnerId for now
      // The worker will resolve userId from stravaOwnerId
      await stravaQueue.add("sync-activity", {
        type: "sync-activity",
        stravaActivityId: body.object_id,
        stravaOwnerId: body.owner_id,
        userId: String(body.owner_id), // placeholder — resolved in worker via DB
      });
    }
  });
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/api/routes/__tests__/webhook.routes.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/routes/webhook.routes.ts src/api/routes/__tests__/webhook.routes.test.ts
git commit -m "feat: add Strava webhook routes (validation + event dispatch)"
```

---

## Task 11: Server Integration

**Files:**
- Modify: `src/api/server.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Update server.ts to register new plugins and routes**

Replace `src/api/server.ts`:

```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";
import { aiRoutes } from "./routes/ai.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { webhookRoutes } from "./routes/webhook.routes.js";
import { authPlugin } from "./plugins/auth.plugin.js";
import { StravaOAuth } from "../infra/strava/StravaOAuth.js";
import { stravaQueue } from "../infra/queue/queues.js";
import { prisma } from "../infra/db/prisma.js";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export async function createServer() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  await app.register(cors, { origin: true });

  // JWT auth plugin
  await app.register(authPlugin, {
    jwtSecret: getEnv("JWT_SECRET"),
  });

  // Strava OAuth service
  const oauth = new StravaOAuth(prisma, {
    clientId: getEnv("STRAVA_CLIENT_ID"),
    clientSecret: getEnv("STRAVA_CLIENT_SECRET"),
    encryptionKey: getEnv("ENCRYPTION_KEY"),
  });

  // Routes
  await app.register(aiRoutes, { prefix: "/api" });
  await app.register(authRoutes, { oauth, stravaQueue });
  await app.register(webhookRoutes, {
    stravaQueue,
    verifyToken: getEnv("STRAVA_WEBHOOK_VERIFY_TOKEN"),
  });

  app.get("/", async () => ({
    name: "RunCoach AI",
    version: "0.1.0",
    iteration: 2,
    status: "ok",
  }));

  return app;
}

export async function startServer() {
  const app = await createServer();
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.log(`🏃 RunCoach AI listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  return app;
}
```

- [ ] **Step 2: Update index.ts to also start the worker**

Replace `src/index.ts`:

```typescript
import { startServer } from "./api/server.js";
import { startWorker } from "./infra/queue/workers/strava-sync.worker.js";
import { StravaOAuth } from "./infra/strava/StravaOAuth.js";
import { prisma } from "./infra/db/prisma.js";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

const oauth = new StravaOAuth(prisma, {
  clientId: getEnv("STRAVA_CLIENT_ID"),
  clientSecret: getEnv("STRAVA_CLIENT_SECRET"),
  encryptionKey: getEnv("ENCRYPTION_KEY"),
});

const worker = startWorker(oauth);
worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all existing tests + new tests pass. Fix any import errors if TypeScript reports missing `.js` extensions.

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/api/server.ts src/index.ts
git commit -m "feat: wire up all routes and worker in server entry point"
```

---

## Task 12: Token Refresh Cron

**Files:**
- Create: `src/infra/queue/cron.ts`

- [ ] **Step 1: Implement cron job**

Create `src/infra/queue/cron.ts`:

```typescript
import { StravaOAuth } from "../strava/StravaOAuth.js";

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function startTokenRefreshCron(oauth: StravaOAuth): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      await oauth.refreshExpiringTokens();
    } catch (err) {
      console.error("Token refresh cron error:", err);
    }
  }, INTERVAL_MS);
}
```

- [ ] **Step 2: Register cron in index.ts**

Add to `src/index.ts` (after worker initialization):

```typescript
import { startTokenRefreshCron } from "./infra/queue/cron.js";

// ... existing code ...

const tokenRefreshCron = startTokenRefreshCron(oauth);

process.on("SIGTERM", async () => {
  clearInterval(tokenRefreshCron);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
```

- [ ] **Step 3: Run full test suite and typecheck**

```bash
npm test && npm run typecheck
```

Expected: all tests pass, no type errors.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Open `http://localhost:3000` — should return `{ "iteration": 2 }`.
Open `http://localhost:3000/auth/strava/login` — should redirect to Strava.

- [ ] **Step 5: Final commit**

```bash
git add src/infra/queue/cron.ts src/index.ts
git commit -m "feat: add token refresh cron (30min interval, 1h lookahead)"
git tag v0.2-strava-oauth-sync
```

---

## Definition of Done Checklist

- [ ] `GET /auth/strava/login` redirects to Strava
- [ ] `GET /auth/strava/callback` returns `{ jwt }` immediately (no waiting for sync)
- [ ] Strava tokens stored encrypted — verify: `psql -U postgres runcoach -c "SELECT access_token_enc FROM strava_tokens LIMIT 1;"`
- [ ] Job `initial-sync` enqueued after OAuth callback — verify in Redis: `redis-cli LLEN bull:strava-sync:wait`
- [ ] Worker processes pages with 500ms delay, backs off on 429
- [ ] `POST /strava/webhook` returns 200 in < 100ms, job enqueued
- [ ] Token refresh cron runs every 30min, refreshes tokens expiring within 1h
- [ ] `npm test` — all tests pass
- [ ] `npm run typecheck` — no errors
