/**
 * Import Strava export data into the database.
 *
 * Reads the split JSON files produced by the Strava bulk export tool
 * and inserts activities + real laps for a given user.
 *
 * Usage:
 *   npx tsx --env-file .env prisma/import-strava-export.ts \
 *     --userId <userId> \
 *     --path "C:\sources\stravaExport\exports\split"
 *
 * Options:
 *   --userId   Target user in DB (required)
 *   --path     Folder containing activities_part_*.json
 *              (default: prisma/fixtures/strava)
 *   --limit    Max activities to import (default: all)
 *   --dry-run  Print summary without writing to DB
 */

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { prisma } from "../src/infra/db/prisma.js";
import { computeTSSWithHR, computeTSSFromPace } from "../src/domain/activity/tss.js";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = (flag: string) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const userId   = get("--userId");
const dataPath = resolve(get("--path") ?? "prisma/fixtures/strava");
const limit    = get("--limit") ? parseInt(get("--limit")!) : Infinity;
const dryRun   = args.includes("--dry-run");

if (!userId) {
  console.error("❌  --userId is required");
  process.exit(1);
}

// ── Types (Strava export format) ──────────────────────────────────────────────

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
  // Enriched fields (present in API, absent from bulk export)
  workout_type?: number;
  suffer_score?: number;
  perceived_exertion?: number;
  elev_high?: number;
  elev_low?: number;
  pr_count?: number;
  // Lap data
  laps?: StravaExportLap[];
  splits_metric?: StravaExportSplit[]; // fallback if no laps
}

// ── Config ────────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const THRESHOLD_PACE_SEC_KM = 270; // 4:30/km for TSS calc

// ── Load files ────────────────────────────────────────────────────────────────

function loadActivities(dir: string): StravaExportActivity[] {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("activities_part_") && f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    console.error(`❌  No activities_part_*.json files found in ${dir}`);
    process.exit(1);
  }

  const all: StravaExportActivity[] = [];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as StravaExportActivity[];
    all.push(...raw);
  }
  return all;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function toActivityData(userId: string, a: StravaExportActivity) {
  const distanceKm = a.distance / 1000;
  const avgPaceSecKm = distanceKm > 0 ? a.moving_time / distanceKm : 0;

  const tss = a.average_heartrate && a.max_heartrate
    ? computeTSSWithHR(a.moving_time, a.average_heartrate, a.max_heartrate)
    : computeTSSFromPace(a.moving_time, avgPaceSecKm, THRESHOLD_PACE_SEC_KM);

  return {
    userId,
    stravaId:            BigInt(a.id),
    name:                a.name ?? null,
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
    // Enriched
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

function lapFromExportLap(activityId: string, l: StravaExportLap) {
  const distanceKm = l.distance / 1000;
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
    maxHrBpm:            l.max_heartrate != null ? Math.round(l.max_heartrate) : null,
    avgCadence:          l.average_cadence ?? null,
    totalElevationGainM: l.total_elevation_gain ?? 0,
    paceZone:            l.pace_zone ?? null,
    startDate:           l.start_date ? new Date(l.start_date) : new Date(0),
  };
}

function lapFromSplit(activityId: string, s: StravaExportSplit) {
  const distanceKm = s.distance / 1000;
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
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📂 Reading from: ${dataPath}`);
  const all = loadActivities(dataPath);
  const runs = all.filter((a) => ALLOWED_TYPES.has(a.type));
  const toImport = runs.slice(0, limit);

  const withLaps   = runs.filter((a) => a.laps && a.laps.length > 0).length;
  const withSplits = runs.filter((a) => !a.laps?.length && a.splits_metric?.length).length;

  console.log(`📊 Total activities in export: ${all.length}`);
  console.log(`🏃 Running activities:         ${runs.length}`);
  console.log(`📥 Will import:                ${toImport.length}${limit < Infinity ? ` (limited to ${limit})` : ""}`);
  console.log(`   With real laps:             ${withLaps}`);
  console.log(`   With km splits only:        ${withSplits}`);

  if (dryRun) {
    console.log("\n🔍 Dry run — no writes");
    toImport.slice(0, 5).forEach((a) => {
      const distKm = (a.distance / 1000).toFixed(1);
      const lapCount = a.laps?.length ?? a.splits_metric?.length ?? 0;
      const lapLabel = a.laps?.length ? "laps" : "splits";
      console.log(`  ${a.start_date.slice(0, 10)}  ${a.name.padEnd(35)} ${distKm}km  ${lapCount} ${lapLabel}`);
    });
    if (toImport.length > 5) console.log(`  ... and ${toImport.length - 5} more`);
    return;
  }

  // Check user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`❌  User not found: ${userId}`);
    process.exit(1);
  }
  console.log(`\n👤 Importing for user: ${user.username} (${userId})\n`);

  let importedActivities = 0;
  let importedLaps = 0;
  let errors = 0;

  for (const activity of toImport) {
    try {
      const data = toActivityData(userId, activity);
      const { stravaId, ...rest } = data;

      const { id: activityId } = await prisma.activity.upsert({
        where: { stravaId },
        create: { stravaId, ...rest },
        update: rest,
        select: { id: true },
      });

      // Prefer real laps over splits_metric
      const laps = activity.laps?.length
        ? activity.laps.map((l) => lapFromExportLap(activityId, l))
        : activity.splits_metric?.length
          ? activity.splits_metric.map((s) => lapFromSplit(activityId, s))
          : [];

      if (laps.length > 0) {
        await prisma.$transaction(
          laps.map((lap) =>
            prisma.lap.upsert({
              where: { activityId_lapIndex: { activityId: lap.activityId, lapIndex: lap.lapIndex } },
              create: lap,
              update: {
                distanceM:           lap.distanceM,
                movingTimeSec:       lap.movingTimeSec,
                elapsedTimeSec:      lap.elapsedTimeSec,
                avgSpeedMS:          lap.avgSpeedMS,
                maxSpeedMS:          lap.maxSpeedMS,
                avgPaceSecKm:        lap.avgPaceSecKm,
                avgHrBpm:            lap.avgHrBpm,
                maxHrBpm:            lap.maxHrBpm,
                avgCadence:          lap.avgCadence,
                totalElevationGainM: lap.totalElevationGainM,
                paceZone:            lap.paceZone,
                startDate:           lap.startDate,
              },
            })
          )
        );
        importedLaps += laps.length;
      }

      importedActivities++;
      if (importedActivities % 50 === 0) {
        console.log(`  ✓ ${importedActivities}/${toImport.length} activities...`);
      }
    } catch (err) {
      errors++;
      console.warn(`  ⚠️  Failed ${activity.id} (${activity.name}):`, (err as Error).message);
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Activities imported: ${importedActivities}`);
  console.log(`   Laps imported:       ${importedLaps}`);
  if (errors > 0) console.log(`   Errors:             ${errors}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
