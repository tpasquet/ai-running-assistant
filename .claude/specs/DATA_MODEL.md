# Data Model

## Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// USER & AUTH
// ─────────────────────────────────────────

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  stravaToken       StravaToken?
  activities        Activity[]
  weeklyAggregates  WeeklyAggregate[]
  dailyFeedbacks    DailyFeedback[]
  goals             Goal[]
  trainingPlans     TrainingPlan[]
  recommendations   AIRecommendation[]

  @@map("users")
}

model StravaToken {
  id            String   @id @default(cuid())
  userId        String   @unique
  stravaAthleteId BigInt @unique
  // Encrypted AES-256-GCM — decryption only in StravaService
  accessTokenEnc  String
  refreshTokenEnc String
  expiresAt     DateTime
  scope         String   // "activity:read_all"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("strava_tokens")
}

// ─────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────

model Activity {
  id              String      @id @default(cuid())
  userId          String
  stravaId        BigInt      @unique
  type            ActivityType
  startDate       DateTime
  distanceM       Float
  durationSec     Int
  elevationM      Float       @default(0)
  avgHrBpm        Int?
  maxHrBpm        Int?
  avgPaceSecKm    Int         // calculated at ingestion: durationSec / (distanceM/1000)
  sufferScore     Int?        // provided by Strava
  perceivedEffort Int?        // 1-10, entered by user post-session
  tss             Float?      // calculated if HR available
  polyline        String?     // Google Maps encoded polyline
  rawData         Json        // complete Strava payload (for future re-processing)
  syncedAt        DateTime    @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startDate(sort: Desc)])
  @@index([userId, type])
  @@map("activities")
}

enum ActivityType {
  Run
  TrailRun
  VirtualRun
  Walk
  Other
}

// ─────────────────────────────────────────
// AGGREGATES
// ─────────────────────────────────────────

model WeeklyAggregate {
  id                String   @id @default(cuid())
  userId            String
  weekStart         DateTime // Monday 00:00:00 UTC
  weekNumber        Int      // ISO week number
  year              Int

  // Volume
  totalDistanceM    Float
  totalDurationSec  Int
  totalElevationM   Float
  sessionCount      Int
  runCount          Int

  // Load
  totalTss          Float    // sum of week's TSS
  ctl               Float    // Chronic Training Load (42d)
  atl               Float    // Acute Training Load (7d)
  tsb               Float    // Training Stress Balance = CTL - ATL

  // Quality
  monotony          Float    // stdDev(TSS daily) / avg(TSS daily)
  strain            Float    // totalTss * monotony
  avgPerceivedEffort Float?

  // Content
  sessionTypes      Json     // { easy: 2, tempo: 1, long: 1 }

  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, weekStart])
  @@index([userId, weekStart(sort: Desc)])
  @@map("weekly_aggregates")
}

// ─────────────────────────────────────────
// DAILY FEEDBACK
// ─────────────────────────────────────────

model DailyFeedback {
  id              String   @id @default(cuid())
  userId          String
  date            DateTime @db.Date

  // Subjective metrics 1-10
  fatigue         Int      // 1 = not fatigued, 10 = exhausted
  muscleSoreness  Int      // 1 = none, 10 = very painful
  mood            Int      // 1 = very bad, 10 = excellent
  sleepQuality    Int      // 1 = very bad, 10 = excellent

  // Localized pain
  painLocations   PainLocation[]
  painIntensity   Int?     // 1-10 if pain present

  // Free text
  notes           String?  @db.VarChar(500)

  createdAt       DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date(sort: Desc)])
  @@map("daily_feedbacks")
}

model PainLocation {
  id              String        @id @default(cuid())
  feedbackId      String
  location        BodyLocation
  side            BodySide?
  type            PainType?

  feedback DailyFeedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)

  @@map("pain_locations")
}

enum BodyLocation {
  knee
  ankle
  achilles
  plantar_fascia
  shin
  calf
  hamstring
  quad
  hip
  it_band
  lower_back
  foot
  other
}

enum BodySide {
  left
  right
  both
}

enum PainType {
  sharp
  dull
  burning
  tightness
}

// ─────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────

model Goal {
  id           String     @id @default(cuid())
  userId       String
  type         GoalType
  // For time goals: value in seconds (e.g., 2100 for 35min)
  // For distance goals: value in meters
  targetValue  Float
  targetDate   DateTime
  status       GoalStatus @default(ACTIVE)
  context      String?    @db.VarChar(500) // additional free text info
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  trainingPlans TrainingPlan[]

  @@index([userId, status])
  @@map("goals")
}

enum GoalType {
  SUB_X_5K
  SUB_X_10K
  SUB_X_HALF
  SUB_X_MARATHON
  FINISH_5K
  FINISH_10K
  FINISH_HALF
  FINISH_MARATHON
  WEEKLY_DISTANCE
  CUSTOM
}

enum GoalStatus {
  ACTIVE
  ACHIEVED
  ABANDONED
  EXPIRED
}

// ─────────────────────────────────────────
// TRAINING PLANS
// ─────────────────────────────────────────

model TrainingPlan {
  id            String     @id @default(cuid())
  userId        String
  goalId        String
  startDate     DateTime
  endDate       DateTime
  totalWeeks    Int
  status        PlanStatus @default(ACTIVE)

  // Generated by CoachAgent — complete structure in JSON
  // Typed by TrainingPlanSchema (see AGENTS.md)
  planData      Json

  // AI metadata
  modelVersion  String     // e.g., "gpt-4o-2024-11-20"
  promptVersion String     // e.g., "coach.v1"
  generatedAt   DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  goal Goal @relation(fields: [goalId], references: [id])

  @@index([userId, status])
  @@map("training_plans")
}

enum PlanStatus {
  ACTIVE
  COMPLETED
  CANCELLED
  SUPERSEDED  // replaced by a new plan
}

// ─────────────────────────────────────────
// AI RECOMMENDATIONS
// ─────────────────────────────────────────

model AIRecommendation {
  id            String             @id @default(cuid())
  userId        String
  threadId      String?            // to group a conversation
  type          RecommendationType

  // Involved agents
  agentSource   String             // "coach" | "physio" | "mental" | "multi"
  promptVersion String

  // Complete input/output for audit and debugging
  contextSnapshot Json             // context sent to LLM (no sensitive personal data)
  output          Json             // Zod-validated structured output

  // User feedback (optional)
  userRating    Int?               // 1-5
  userFeedback  String?            @db.VarChar(300)

  createdAt     DateTime           @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, threadId])
  @@index([userId, type])
  @@map("ai_recommendations")
}

enum RecommendationType {
  DAILY_RECOMMENDATION
  SESSION_ANALYSIS
  TRAINING_PLAN
  INJURY_RISK
  MENTAL_INSIGHT
  SYNTHESIZED
  GENERAL_ANSWER
}
```

---

## Relations and Cardinalities

```
User (1) ──── (0..1) StravaToken
User (1) ──── (0..n) Activity
User (1) ──── (0..n) WeeklyAggregate
User (1) ──── (0..n) DailyFeedback
     DailyFeedback (1) ──── (0..n) PainLocation
User (1) ──── (0..n) Goal
User (1) ──── (0..n) TrainingPlan
     TrainingPlan (n) ──── (1) Goal
User (1) ──── (0..n) AIRecommendation
```

---

## Indexing Strategy

| Table | Index | Justification |
|-------|-------|---------------|
| `activities` | `(userId, startDate DESC)` | Reading last N activities |
| `activities` | `(userId, type)` | Filtering by type (running only) |
| `weekly_aggregates` | `(userId, weekStart DESC)` | 8-week sliding window |
| `daily_feedbacks` | `(userId, date DESC)` | Last 7/14 days feedback |
| `ai_recommendations` | `(userId, createdAt DESC)` | Recent history |
| `ai_recommendations` | `(userId, threadId)` | Conversational continuity |

---

## Encryption Notes

The `accessTokenEnc` and `refreshTokenEnc` fields in `StravaToken` are encrypted in AES-256-GCM **before** writing to database. Decryption happens **only** in `src/infra/strava/StravaService.ts`.

```typescript
// src/infra/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12):tag(16):encrypted — base64 encoded
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```
