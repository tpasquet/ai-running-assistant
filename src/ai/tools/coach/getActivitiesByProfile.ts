import { DynamicStructuredTool } from "@langchain/core/tools";
import type { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { z } from "zod";
import { prisma } from "../../../infra/db/prisma.js";

/**
 * Strava workoutType codes:
 *   0 = default run
 *   1 = race
 *   2 = long run
 *   3 = workout (tempo, intervals…)
 */
const WorkoutTypeSchema = z.enum(["easy", "long_run", "workout", "race", "any"]).default("any");

/**
 * Tool: get_activities_by_profile
 *
 * Retrieves activities filtered by session type, distance range, and period.
 * Useful for finding all long runs, races, or quality sessions to detect patterns.
 */
export const getActivitiesByProfileTool = new DynamicStructuredTool({
  name: "get_activities_by_profile",
  description:
    "Find past activities filtered by session type (easy, long run, workout, race), " +
    "distance range, and date window. Use to detect periodization patterns, find all races, " +
    "or check how many quality sessions were done in a given period.",
  schema: z.object({
    sessionType: WorkoutTypeSchema.describe(
      "Session type: 'easy' (default runs), 'long_run', 'workout' (tempo/intervals), 'race', or 'any'"
    ),
    minDistanceKm: z.number().optional().describe("Minimum distance in km"),
    maxDistanceKm: z.number().optional().describe("Maximum distance in km"),
    lastDays:      z.number().int().min(1).max(730).default(90).describe("Look-back window in days (default 90)"),
    limit:         z.number().int().min(1).max(50).default(10).describe("Max results (default 10)"),
  }),
  func: async ({ sessionType, minDistanceKm, maxDistanceKm, lastDays, limit }, _runManager?: CallbackManagerForToolRun, config?: { configurable?: { userId?: string } }) => {
    const userId = config?.configurable?.userId;
    if (!userId) return JSON.stringify({ error: "userId not provided" });

    const since = new Date();
    since.setDate(since.getDate() - lastDays);

    // Map sessionType → workoutType filter
    const workoutTypeFilter: number | undefined =
      sessionType === "race"      ? 1 :
      sessionType === "long_run"  ? 2 :
      sessionType === "workout"   ? 3 :
      sessionType === "easy"      ? 0 :
      undefined; // "any" → no filter

    const activities = await prisma.activity.findMany({
      where: {
        userId,
        startDate:   { gte: since },
        ...(workoutTypeFilter !== undefined && { workoutType: workoutTypeFilter }),
        ...((minDistanceKm !== undefined || maxDistanceKm !== undefined) && {
          distanceM: {
            ...(minDistanceKm !== undefined && { gte: minDistanceKm * 1000 }),
            ...(maxDistanceKm !== undefined && { lte: maxDistanceKm * 1000 }),
          },
        }),
      },
      orderBy: { startDate: "desc" },
      take: limit,
      select: {
        startDate:       true,
        type:            true,
        distanceM:       true,
        movingTimeSec:   true,
        avgPaceSecKm:    true,
        avgHrBpm:        true,
        tss:             true,
        perceivedEffort: true,
        workoutType:     true,
        totalElevationGainM: true,
        isTrainer:       true,
        laps: {
          select: {
            lapIndex:     true,
            distanceM:    true,
            avgPaceSecKm: true,
            avgHrBpm:     true,
            paceZone:     true,
          },
          orderBy: { lapIndex: "asc" },
        },
      },
    });

    const sessionTypeLabel = (wt: number | null) =>
      wt === 1 ? "race" : wt === 2 ? "long_run" : wt === 3 ? "workout" : "easy";

    const result = activities.map((a) => ({
      date:        a.startDate.toISOString().split("T")[0],
      type:        sessionTypeLabel(a.workoutType),
      distanceKm:  Math.round(a.distanceM / 100) / 10,
      durationMin: Math.round(a.movingTimeSec / 60),
      avgPaceSecKm: Math.round(a.avgPaceSecKm),
      avgHr:       a.avgHrBpm,
      tss:         a.tss != null ? Math.round(a.tss) : null,
      rpe:         a.perceivedEffort,
      elevationM:  Math.round(a.totalElevationGainM),
      indoor:      a.isTrainer,
      laps: a.laps.length > 1
        ? a.laps.map((l) => ({
            lap:      l.lapIndex,
            km:       Math.round(l.distanceM / 100) / 10,
            paceSecKm: Math.round(l.avgPaceSecKm),
            hr:        l.avgHrBpm,
            zone:      l.paceZone,
          }))
        : undefined,
    }));

    return JSON.stringify(result);
  },
});
