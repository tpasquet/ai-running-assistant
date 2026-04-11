-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "stravaId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "distanceM" DOUBLE PRECISION NOT NULL,
    "movingTimeSec" INTEGER NOT NULL,
    "elapsedTimeSec" INTEGER NOT NULL,
    "totalElevationGainM" DOUBLE PRECISION NOT NULL,
    "averageSpeedMS" DOUBLE PRECISION NOT NULL,
    "maxSpeedMS" DOUBLE PRECISION NOT NULL,
    "avgPaceSecKm" DOUBLE PRECISION NOT NULL,
    "avgHrBpm" INTEGER,
    "maxHrBpm" INTEGER,
    "calories" DOUBLE PRECISION,
    "avgCadence" DOUBLE PRECISION,
    "avgTemp" DOUBLE PRECISION,
    "perceivedEffort" INTEGER,
    "tss" DOUBLE PRECISION,
    "polyline" TEXT,
    "gearId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyAggregate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDistanceM" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDurationSec" INTEGER NOT NULL DEFAULT 0,
    "totalElevationM" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "totalTss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tsb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monotony" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPerceivedEffort" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fatigue" INTEGER NOT NULL,
    "muscleSoreness" INTEGER NOT NULL,
    "mood" INTEGER NOT NULL,
    "sleepQuality" INTEGER NOT NULL,
    "painLocations" JSONB NOT NULL DEFAULT '[]',
    "painIntensity" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaId_key" ON "User"("stravaId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaToken_userId_key" ON "StravaToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_stravaId_key" ON "Activity"("stravaId");

-- CreateIndex
CREATE INDEX "Activity_userId_startDate_idx" ON "Activity"("userId", "startDate");

-- CreateIndex
CREATE INDEX "WeeklyAggregate_userId_weekStart_idx" ON "WeeklyAggregate"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAggregate_userId_weekStart_key" ON "WeeklyAggregate"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "DailyFeedback_userId_date_idx" ON "DailyFeedback"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyFeedback_userId_date_key" ON "DailyFeedback"("userId", "date");

-- CreateIndex
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- AddForeignKey
ALTER TABLE "StravaToken" ADD CONSTRAINT "StravaToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAggregate" ADD CONSTRAINT "WeeklyAggregate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFeedback" ADD CONSTRAINT "DailyFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
