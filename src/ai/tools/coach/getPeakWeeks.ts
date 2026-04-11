import { DynamicStructuredTool } from "@langchain/core/tools";
import type { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { z } from "zod";
import { prisma } from "../../../infra/db/prisma.js";

/**
 * Tool: get_peak_weeks
 *
 * Identifies the highest-load weeks by distance or TSS, optionally correlating
 * with the subjective feedback (fatigue, pain) recorded that same week.
 * Helps coach and physio reason about tolerance thresholds and injury risk.
 */
export const getPeakWeeksTool = new DynamicStructuredTool({
  name: "get_peak_weeks",
  description:
    "Find the highest-load training weeks ranked by distance or TSS. " +
    "Each week is enriched with the average fatigue and pain signals from that period. " +
    "Use this to identify peak training blocks, assess tolerance, and detect overtraining patterns.",
  schema: z.object({
    rankBy:   z.enum(["distance", "tss"]).default("tss").describe("Rank weeks by 'distance' or 'tss'"),
    topN:     z.number().int().min(1).max(20).default(5).describe("Number of top weeks to return (default 5)"),
    lastDays: z.number().int().min(1).max(730).default(365).describe("Look-back window in days (default 365)"),
  }),
  func: async ({ rankBy, topN, lastDays }, _runManager?: CallbackManagerForToolRun, config?: { configurable?: { userId?: string } }) => {
    const userId = config?.configurable?.userId;
    if (!userId) return JSON.stringify({ error: "userId not provided" });

    const now   = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - lastDays);

    const aggs = await prisma.weeklyAggregate.findMany({
      where:   { userId, weekStart: { gte: since, lte: now } },
      orderBy: rankBy === "tss"
        ? { totalTss:       "desc" }
        : { totalDistanceM: "desc" },
      take: topN,
      select: {
        weekStart:      true,
        weekNumber:     true,
        year:           true,
        totalDistanceM: true,
        totalTss:       true,
        ctl:            true,
        atl:            true,
        tsb:            true,
        strain:         true,
        runCount:       true,
        avgPerceivedEffort: true,
      },
    });

    // For each peak week, fetch avg fatigue + any pain from daily feedback
    const enriched = await Promise.all(
      aggs.map(async (w) => {
        const weekEnd = new Date(w.weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const feedbacks = await prisma.dailyFeedback.findMany({
          where: {
            userId,
            date: { gte: w.weekStart, lte: weekEnd },
          },
          select: {
            fatigue:       true,
            muscleSoreness: true,
            mood:          true,
            sleepQuality:  true,
            painLocations: true,
            painIntensity: true,
          },
        });

        const hasFeedback = feedbacks.length > 0;
        const avg = (arr: number[]) =>
          arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

        const hasPain = feedbacks.some(
          (f) => Array.isArray(f.painLocations) && (f.painLocations as unknown[]).length > 0
        );
        const avgPainIntensity = avg(
          feedbacks.flatMap((f) => (f.painIntensity != null ? [f.painIntensity] : []))
        );

        return {
          week:        `${w.year}-W${String(w.weekNumber).padStart(2, "0")}`,
          weekStart:   w.weekStart.toISOString().split("T")[0],
          distanceKm:  Math.round(w.totalDistanceM / 100) / 10,
          tss:         Math.round(w.totalTss),
          ctl:         Math.round(w.ctl * 10) / 10,
          atl:         Math.round(w.atl * 10) / 10,
          tsb:         Math.round(w.tsb * 10) / 10,
          strain:      Math.round(w.strain),
          sessions:    w.runCount,
          avgRpe:      w.avgPerceivedEffort != null ? Math.round(w.avgPerceivedEffort * 10) / 10 : null,
          // Subjective signals from that week
          feedback: hasFeedback ? {
            avgFatigue:       avg(feedbacks.map((f) => f.fatigue)),
            avgMuscleSoreness: avg(feedbacks.map((f) => f.muscleSoreness)),
            avgMood:          avg(feedbacks.map((f) => f.mood)),
            avgSleep:         avg(feedbacks.map((f) => f.sleepQuality)),
            hasPain,
            avgPainIntensity,
          } : null,
        };
      })
    );

    return JSON.stringify(enriched);
  },
});
