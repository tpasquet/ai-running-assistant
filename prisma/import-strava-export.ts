/**
 * Import Strava export data into the database.
 *
 * Reads the split JSON files produced by the Strava bulk export tool
 * and inserts activities + km splits (as Lap records) for a given user.
 *
 * Usage:
 *   npx tsx --env-file .env prisma/import-strava-export.ts \
 *     --userId <userId> \
 *     --path "C:\sources\stravaExport\exports\split"
 *
 * Options:
 *   --userId   Target user in DB (required)
 *   --path     Folder containing activities_part_*.json (default: C:\sources\stravaExport\exports\split)
 *   --limit    Max activities to import (default: all)
 *   --dry-run  Print summary without writing to DB
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { prisma } from "../src/infra/db/prisma.js";
import { computeTSSWithHR, computeTSSFromPace } from "../src/domain/activity/tss.js";

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = (flag: string) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const userId   = get("--userId");
const dataPath = get("--path") ?? "C:\\sources\\stravaExport\\exports\\split";
const limit    = get("--limit") ? parseInt(get("--limit")!) : Infinity;
const dryRun   = args.includes("--dry-run");

if (!userId) {
  console.error("❌  --userId is required");
  process.exit(1);
}

// ── Types (Strava export format) ─────────────────────────────────────────────

interface StravaExportSplit {
  distance: number;
  elapsed_time: number;
  moving_time: number;
  split: number;                    // 1-based km index
  average_speed: number;
  average_heartrate?: number;
  pace_zone?: number;
  elevation_difference?: number;
}

interface StravaExportActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
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
  splits_metric?: StravaExportSplit[];
}

// ── Allowed types ─────────────────────────────────────────────────────────────

const ALLOWED_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const THRESHOLD_PACE_SEC_KM = 270; // 4:30/km for TSS calc

// ── Load all part files ───────────────────────────────────────────────────────

function loadActivities(dir: string): StravaExportActivity[] {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("activities_part_") && f.endsWith(".json"))
    .sort();

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
  };
}

function toLapData(activityId: string, split: StravaExportSplit) {
  const distanceKm = split.distance / 1000;
  const avgPaceSecKm = distanceKm > 0 ? split.moving_time / distanceKm : 0;

  return {
    activityId,
    lapIndex:            split.split,
    name:                `Km ${split.split}`,
    distanceM:           split.distance,
    movingTimeSec:       split.moving_time,
    elapsedTimeSec:      split.elapsed_time,
    avgSpeedMS:          split.average_speed,
    maxSpeedMS:          split.average_speed, // splits don't have max_speed
    avgPaceSecKm,
    avgHrBpm:            split.average_heartrate != null ? Math.round(split.average_heartrate) : null,
    maxHrBpm:            null,
    avgCadence:          null,
    totalElevationGainM: split.elevation_difference ?? 0,
    paceZone:            split.pace_zone ?? null,
    startDate:           new Date(0), // splits don't have timestamps — use epoch as placeholder
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📂 Reading from: ${dataPath}`);
  const all = loadActivities(dataPath);
  const runs = all.filter((a) => ALLOWED_TYPES.has(a.type));
  const toImport = runs.slice(0, limit);

  console.log(`📊 Total activities: ${all.length}`);
  console.log(`🏃 Running activities: ${runs.length}`);
  console.log(`📥 Will import: ${toImport.length}${limit < Infinity ? ` (limited to ${limit})` : ""}`);

  if (dryRun) {
    console.log("\n🔍 Dry run — no writes");
    const sample = toImport.slice(0, 3);
    sample.forEach((a) => {
      const distKm = (a.distance / 1000).toFixed(1);
      const splits = a.splits_metric?.length ?? 0;
      console.log(`  ${a.start_date.slice(0, 10)}  ${a.name}  ${distKm}km  ${splits} splits`);
    });
    if (toImport.length > 3) console.log(`  ... and ${toImport.length - 3} more`);
    return;
  }

  // Check user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`❌  User not found: ${userId}`);
    process.exit(1);
  }
  console.log(`\n👤 Importing for user: ${user.username} (${userId})`);

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

      // Import splits_metric as laps
      if (activity.splits_metric && activity.splits_metric.length > 0) {
        const laps = activity.splits_metric.map((s) => toLapData(activityId, s));

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
                avgPaceSecKm:        lap.avgPaceSecKm,
                avgHrBpm:            lap.avgHrBpm,
                totalElevationGainM: lap.totalElevationGainM,
                paceZone:            lap.paceZone,
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
  console.log(`   Activities: ${importedActivities}`);
  console.log(`   Lap splits: ${importedLaps}`);
  if (errors > 0) console.log(`   Errors:     ${errors}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
