-- ── User: extend for email auth ──────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- stravaId becomes optional
ALTER TABLE "User" ALTER COLUMN "stravaId" DROP NOT NULL;
-- username becomes optional
ALTER TABLE "User" ALTER COLUMN "username" DROP NOT NULL;

-- updatedAt: add with default for existing rows, then keep it managed by app
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- unique constraint on email (NULL values are not considered equal in PostgreSQL unique indexes)
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- ── Account ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key"
    ON "Account"("provider", "providerAccountId");

CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_userId_fkey";
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PasswordResetToken ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_userId_fkey";
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Activity: enriched fields ─────────────────────────────────────────────────

ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "sportType"          TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "workoutType"        INTEGER;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "sufferScore"        INTEGER;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "perceivedExertion"  DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "elevHigh"           DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "elevLow"            DOUBLE PRECISION;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "prCount"            INTEGER;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "isTrainer"          BOOLEAN NOT NULL DEFAULT false;

-- ── Lap ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Lap" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "lapIndex" INTEGER NOT NULL,
    "name" TEXT,
    "distanceM" DOUBLE PRECISION NOT NULL,
    "movingTimeSec" INTEGER NOT NULL,
    "elapsedTimeSec" INTEGER NOT NULL,
    "avgSpeedMS" DOUBLE PRECISION NOT NULL,
    "maxSpeedMS" DOUBLE PRECISION NOT NULL,
    "avgPaceSecKm" DOUBLE PRECISION NOT NULL,
    "avgHrBpm" INTEGER,
    "maxHrBpm" INTEGER,
    "avgCadence" DOUBLE PRECISION,
    "totalElevationGainM" DOUBLE PRECISION NOT NULL,
    "paceZone" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Lap_activityId_lapIndex_key" ON "Lap"("activityId", "lapIndex");
CREATE INDEX IF NOT EXISTS "Lap_activityId_idx" ON "Lap"("activityId");

ALTER TABLE "Lap" DROP CONSTRAINT IF EXISTS "Lap_activityId_fkey";
ALTER TABLE "Lap" ADD CONSTRAINT "Lap_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
