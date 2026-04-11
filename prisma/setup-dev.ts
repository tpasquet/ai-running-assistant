/**
 * One-shot dev setup: create the dev user and import all Strava activities.
 *
 * Usage:
 *   npm run db:setup-dev
 *
 * What it does:
 *   1. Upserts user terry.pasquet@proton.me (email, no password — dev only)
 *   2. Imports all activities from prisma/fixtures/strava/
 *
 * Safe to re-run — all writes are upserts.
 */

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { prisma } from "../src/infra/db/prisma.js";
import { redis } from "../src/infra/cache/redis.js";
import { AggregationService } from "../src/domain/aggregation/AggregationService.js";
import { computeTSSWithHR, computeTSSFromPace } from "../src/domain/activity/tss.js";

// ── Config ────────────────────────────────────────────────────────────────────

const DEV_USER = {
  email:    "terry.pasquet@proton.me",
  name:     "Terry Pasquet",
  username: "terry",
};

const FIXTURES_PATH    = resolve("prisma/fixtures/strava");
const ALLOWED_TYPES    = new Set(["Run", "TrailRun", "VirtualRun"]);
const THRESHOLD_PACE   = 270; // 4:30/km

// ── Types ─────────────────────────────────────────────────────────────────────

interface StravaExportLap {
  id: number;
  lap_index: number;
  name?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  total_elevation_gain?: number;
  pace_zone?: number;
  start_date?: string;
}

interface StravaExportSplit {
  distance: number;
  elapsed_time: number;
  moving_time: number;
  split: number;
  average_speed: number;
  average_heartrate?: number;
  pace_zone?: number;
  elevation_difference?: number;
}

interface StravaExportActivity {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
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
  gear_id?: string;
  trainer?: boolean;
  workout_type?: number;
  suffer_score?: number;
  perceived_exertion?: number;
  elev_high?: number;
  elev_low?: number;
  pr_count?: number;
  laps?: StravaExportLap[];
  splits_metric?: StravaExportSplit[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadActivities(): StravaExportActivity[] {
  let files: string[];
  try {
    files = readdirSync(FIXTURES_PATH)
      .filter((f) => f.startsWith("activities_part_") && f.endsWith(".json"))
      .sort();
  } catch {
    return [];
  }
  const all: StravaExportActivity[] = [];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(FIXTURES_PATH, file), "utf8")) as StravaExportActivity[];
    all.push(...raw);
  }
  return all;
}

function toActivityData(userId: string, a: StravaExportActivity) {
  const distanceKm  = a.distance / 1000;
  const avgPaceSecKm = distanceKm > 0 ? a.moving_time / distanceKm : 0;
  const tss = a.average_heartrate && a.max_heartrate
    ? computeTSSWithHR(a.moving_time, a.average_heartrate, a.max_heartrate)
    : computeTSSFromPace(a.moving_time, avgPaceSecKm, THRESHOLD_PACE);

  return {
    userId,
    stravaId:            BigInt(a.id),
    type:                a.type,
    startDate:           new Date(a.start_date),
    distanceM:           a.distance,
    movingTimeSec:       a.moving_time,
    elapsedTimeSec:      a.elapsed_time,
    totalElevationGainM: a.total_elevation_gain,
    averageSpeedMS:      a.average_speed,
    maxSpeedMS:          a.max_speed,
    avgPaceSecKm,
    avgHrBpm:            a.average_heartrate != null ? Math.round(a.average_heartrate) : null,
    maxHrBpm:            a.max_heartrate ?? null,
    calories:            a.calories ?? null,
    avgCadence:          a.average_cadence ?? null,
    avgTemp:             a.average_temp ?? null,
    perceivedEffort:     null,
    tss,
    polyline:            null,
    gearId:              a.gear_id ?? null,
    sportType:           a.sport_type ?? null,
    workoutType:         a.workout_type ?? null,
    sufferScore:         a.suffer_score ?? null,
    perceivedExertion:   a.perceived_exertion ?? null,
    elevHigh:            a.elev_high ?? null,
    elevLow:             a.elev_low ?? null,
    prCount:             a.pr_count ?? null,
    isTrainer:           a.trainer ?? false,
  };
}

function toLaps(activityId: string, a: StravaExportActivity) {
  if (a.laps?.length) {
    return a.laps.map((l) => {
      const distanceKm   = l.distance / 1000;
      const avgPaceSecKm = distanceKm > 0 ? l.moving_time / distanceKm : 0;
      return {
        activityId,
        lapIndex:            l.lap_index,
        name:                l.name ?? `Lap ${l.lap_index}`,
        distanceM:           l.distance,
        movingTimeSec:       l.moving_time,
        elapsedTimeSec:      l.elapsed_time,
        avgSpeedMS:          l.average_speed,
        maxSpeedMS:          l.max_speed ?? l.average_speed,
        avgPaceSecKm,
        avgHrBpm:            l.average_heartrate != null ? Math.round(l.average_heartrate) : null,
        maxHrBpm:            l.max_heartrate   != null ? Math.round(l.max_heartrate)   : null,
        avgCadence:          l.average_cadence ?? null,
        totalElevationGainM: l.total_elevation_gain ?? 0,
        paceZone:            l.pace_zone ?? null,
        startDate:           l.start_date ? new Date(l.start_date) : new Date(0),
      };
    });
  }
  if (a.splits_metric?.length) {
    return a.splits_metric.map((s) => {
      const distanceKm   = s.distance / 1000;
      const avgPaceSecKm = distanceKm > 0 ? s.moving_time / distanceKm : 0;
      return {
        activityId,
        lapIndex:            s.split,
        name:                `Km ${s.split}`,
        distanceM:           s.distance,
        movingTimeSec:       s.moving_time,
        elapsedTimeSec:      s.elapsed_time,
        avgSpeedMS:          s.average_speed,
        maxSpeedMS:          s.average_speed,
        avgPaceSecKm,
        avgHrBpm:            s.average_heartrate != null ? Math.round(s.average_heartrate) : null,
        maxHrBpm:            null,
        avgCadence:          null,
        totalElevationGainM: s.elevation_difference ?? 0,
        paceZone:            s.pace_zone ?? null,
        startDate:           new Date(0),
      };
    });
  }
  return [];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Dev setup starting...\n");

  // 1. Upsert dev user
  const user = await prisma.user.upsert({
    where:  { email: DEV_USER.email },
    create: { email: DEV_USER.email, name: DEV_USER.name, username: DEV_USER.username, emailVerified: true },
    update: { name: DEV_USER.name, username: DEV_USER.username },
  });
  console.log(`👤 User: ${user.email} (${user.id})`);

  // 2. Import activities
  const all  = loadActivities();
  const runs = all.filter((a) => ALLOWED_TYPES.has(a.type));

  if (runs.length === 0) {
    console.log("\n⚠️  No activities found in prisma/fixtures/strava/");
    console.log("   Copy your activities_part_*.json files there and re-run.");
    return;
  }

  console.log(`📂 Found ${all.length} activities total, ${runs.length} runs\n`);

  let importedActivities = 0;
  let importedLaps       = 0;
  let errors             = 0;

  for (const activity of runs) {
    try {
      const data = toActivityData(user.id, activity);
      const { stravaId, ...rest } = data;

      const { id: activityId } = await prisma.activity.upsert({
        where:  { stravaId },
        create: { stravaId, ...rest },
        update: rest,
        select: { id: true },
      });

      const laps = toLaps(activityId, activity);
      if (laps.length > 0) {
        await prisma.$transaction(
          laps.map((lap) =>
            prisma.lap.upsert({
              where:  { activityId_lapIndex: { activityId: lap.activityId, lapIndex: lap.lapIndex } },
              create: lap,
              update: {
                distanceM: lap.distanceM, movingTimeSec: lap.movingTimeSec,
                elapsedTimeSec: lap.elapsedTimeSec, avgSpeedMS: lap.avgSpeedMS,
                maxSpeedMS: lap.maxSpeedMS, avgPaceSecKm: lap.avgPaceSecKm,
                avgHrBpm: lap.avgHrBpm, maxHrBpm: lap.maxHrBpm,
                avgCadence: lap.avgCadence, totalElevationGainM: lap.totalElevationGainM,
                paceZone: lap.paceZone, startDate: lap.startDate,
              },
            })
          )
        );
        importedLaps += laps.length;
      }

      importedActivities++;
      if (importedActivities % 100 === 0) {
        console.log(`  ✓ ${importedActivities}/${runs.length} activities...`);
      }
    } catch (err) {
      errors++;
      console.warn(`  ⚠️  Failed ${activity.id} (${activity.name}):`, (err as Error).message);
    }
  }

  console.log(`\n✅ Import done!`);
  console.log(`   User ID:             ${user.id}`);
  console.log(`   Activities imported: ${importedActivities}`);
  console.log(`   Laps imported:       ${importedLaps}`);
  if (errors > 0) console.log(`   Errors:              ${errors}`);

  // 3. Recompute weekly aggregates (CTL/ATL/TSB)
  if (importedActivities > 0) {
    console.log(`\n⚙️  Computing weekly aggregates (CTL/ATL/TSB)...`);
    const aggregationService = new AggregationService(prisma, redis);
    await aggregationService.recalculateAll(user.id);
    const weekCount = await prisma.weeklyAggregate.count({ where: { userId: user.id } });
    console.log(`   Weekly aggregates:   ${weekCount} weeks computed`);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); redis.disconnect(); });
