import { DynamicStructuredTool } from "@langchain/core/tools";
import type { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { z } from "zod";
import { prisma } from "../../../infra/db/prisma.js";

// ── Session type classification ───────────────────────────────────────────────

type SessionType = "easy" | "long_run" | "workout" | "race" | "any";

const RACE_NAME_RE = /\b(race|marathon|semi[- ]?marathon|half[- ]?marathon|10\s?k|5\s?k|trail|compet|course\s+\w|\bchampion|\bfinal\b)/i;
const LONG_RUN_MIN_KM = 16;

interface ActivityRow {
  name:        string | null;
  distanceM:   number;
  workoutType: number | null;
  laps:        { paceZone: number | null }[];
}

function classify(a: ActivityRow): SessionType {
  // Strava workoutType is authoritative when present
  if (a.workoutType === 1) return "race";
  if (a.workoutType === 2) return "long_run";
  if (a.workoutType === 3) return "workout";

  // Name-based race detection for bulk export data
  if (a.name && RACE_NAME_RE.test(a.name)) return "race";

  // Heuristics for bulk-export data (workoutType = 0 or null)
  if (a.distanceM >= LONG_RUN_MIN_KM * 1000) return "long_run";
  if (a.laps.some((l) => l.paceZone != null && l.paceZone >= 4)) return "workout";
  return "easy";
}

// ── Tool ──────────────────────────────────────────────────────────────────────

/**
 * Tool: get_activities_by_profile
 *
 * Retrieves activities filtered by session type (easy, long run, workout, race),
 * distance range, and date window. Session type is inferred from Strava workoutType
 * when available, otherwise from distance and lap pace-zone heuristics.
 */
export const getActivitiesByProfileTool = new DynamicStructuredTool({
  name: "get_activities_by_profile",
  description:
    "Find past activities filtered by session type (easy, long_run, workout, race), " +
    "distance range, and date window. Session type is inferred from training data even " +
    "when not explicitly tagged. Use to detect periodization patterns, find all races, " +
    "or check how many quality sessions were done in a given period.",
  schema: z.object({
    sessionType:   z.enum(["easy", "long_run", "workout", "race", "any"]).default("any")
      .describe("Session type: 'easy', 'long_run', 'workout' (tempo/intervals), 'race', or 'any'"),
    minDistanceKm: z.number().optional().describe("Minimum distance in km"),
    maxDistanceKm: z.number().optional().describe("Maximum distance in km"),
    lastDays:      z.number().int().min(1).max(730).default(90).describe("Look-back window in days (default 90)"),
    limit:         z.number().int().min(1).max(50).default(10).describe("Max results (default 10)"),
  }),
  func: async (
    { sessionType, minDistanceKm, maxDistanceKm, lastDays, limit },
    _runManager?: CallbackManagerForToolRun,
    config?: { configurable?: { userId?: string } }
  ) => {
    const userId = config?.configurable?.userId;
    if (!userId) return JSON.stringify({ error: "userId not provided" });

    const since = new Date();
    since.setDate(since.getDate() - lastDays);

    // Pre-filter by distance to reduce fetch size
    const distanceWhere: { gte?: number; lte?: number } = {};
    let effectiveMin = minDistanceKm ? minDistanceKm * 1000 : undefined;
    let effectiveMax = maxDistanceKm ? maxDistanceKm * 1000 : undefined;

    // Add distance pre-filters based on session type
    if (sessionType === "long_run" && !effectiveMin) effectiveMin = (LONG_RUN_MIN_KM - 2) * 1000;
    if (sessionType === "easy"     && !effectiveMax) effectiveMax = (LONG_RUN_MIN_KM + 2) * 1000;

    if (effectiveMin) distanceWhere.gte = effectiveMin;
    if (effectiveMax) distanceWhere.lte = effectiveMax;

    // Fetch with larger internal limit to allow post-filter classification
    const fetchLimit = sessionType === "any" ? limit : Math.min(limit * 8, 200);

    const activities = await prisma.activity.findMany({
      where: {
        userId,
        startDate: { gte: since },
        ...(Object.keys(distanceWhere).length > 0 && { distanceM: distanceWhere }),
      },
      orderBy: { startDate: "desc" },
      take: fetchLimit,
      select: {
        name:                true,
        startDate:           true,
        distanceM:           true,
        movingTimeSec:       true,
        avgPaceSecKm:        true,
        avgHrBpm:            true,
        tss:                 true,
        perceivedEffort:     true,
        workoutType:         true,
        totalElevationGainM: true,
        isTrainer:           true,
        laps: {
          select: { lapIndex: true, distanceM: true, avgPaceSecKm: true, avgHrBpm: true, paceZone: true },
          orderBy: { lapIndex: "asc" },
        },
      },
    });

    // Post-filter by classified session type
    const filtered = sessionType === "any"
      ? activities
      : activities.filter((a) => classify(a) === sessionType);

    const result = filtered.slice(0, limit).map((a) => ({
      date:         a.startDate.toISOString().split("T")[0],
      name:         a.name ?? undefined,
      type:         classify(a),
      distanceKm:   Math.round(a.distanceM / 100) / 10,
      durationMin:  Math.round(a.movingTimeSec / 60),
      avgPaceSecKm: Math.round(a.avgPaceSecKm),
      avgHr:        a.avgHrBpm,
      tss:          a.tss != null ? Math.round(a.tss) : null,
      rpe:          a.perceivedEffort,
      elevationM:   Math.round(a.totalElevationGainM),
      indoor:       a.isTrainer,
      laps: a.laps.length > 1
        ? a.laps.map((l) => ({
            lap:       l.lapIndex,
            km:        Math.round(l.distanceM / 100) / 10,
            paceSecKm: Math.round(l.avgPaceSecKm),
            hr:        l.avgHrBpm,
            zone:      l.paceZone,
          }))
        : undefined,
    }));

    return JSON.stringify(result);
  },
});
