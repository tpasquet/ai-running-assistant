import { DynamicStructuredTool } from "@langchain/core/tools";
import type { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { z } from "zod";
import { prisma } from "../../../infra/db/prisma.js";

/**
 * Tool: get_training_load_history
 *
 * Returns week-by-week CTL/ATL/TSB and volume over the last N weeks.
 * Lets the coach reason about load trends, ramp rate, and recovery cycles.
 */
export const getTrainingLoadHistoryTool = new DynamicStructuredTool({
  name: "get_training_load_history",
  description:
    "Retrieve week-by-week training load history (CTL, ATL, TSB, distance, TSS). " +
    "Use this to reason about long-term fitness trends, overtraining risk, or taper progression.",
  schema: z.object({
    weeks: z
      .number()
      .int()
      .min(1)
      .max(52)
      .default(12)
      .describe("Number of past weeks to retrieve (default 12)"),
  }),
  func: async ({ weeks }, _runManager?: CallbackManagerForToolRun, config?: { configurable?: { userId?: string } }) => {
    const userId = config?.configurable?.userId;
    if (!userId) return JSON.stringify({ error: "userId not provided" });

    const aggs = await prisma.weeklyAggregate.findMany({
      where: { userId, weekStart: { lte: new Date() } },
      orderBy: { weekStart: "desc" },
      take: weeks,
      select: {
        weekStart:       true,
        weekNumber:      true,
        year:            true,
        totalDistanceM:  true,
        totalTss:        true,
        ctl:             true,
        atl:             true,
        tsb:             true,
        monotony:        true,
        strain:          true,
        runCount:        true,
        avgPerceivedEffort: true,
      },
    });

    // Return in chronological order
    const result = aggs.reverse().map((w) => ({
      week:         `${w.year}-W${String(w.weekNumber).padStart(2, "0")}`,
      weekStart:    w.weekStart.toISOString().split("T")[0],
      distanceKm:   Math.round(w.totalDistanceM / 100) / 10,
      tss:          Math.round(w.totalTss),
      ctl:          Math.round(w.ctl * 10) / 10,
      atl:          Math.round(w.atl * 10) / 10,
      tsb:          Math.round(w.tsb * 10) / 10,
      monotony:     Math.round(w.monotony * 100) / 100,
      strain:       Math.round(w.strain),
      sessions:     w.runCount,
      avgRpe:       w.avgPerceivedEffort != null ? Math.round(w.avgPerceivedEffort * 10) / 10 : null,
    }));

    return JSON.stringify(result);
  },
});
