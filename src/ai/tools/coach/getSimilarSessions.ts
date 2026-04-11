import { DynamicStructuredTool } from "@langchain/core/tools";
import type { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { z } from "zod";
import { prisma } from "../../../infra/db/prisma.js";

/**
 * Tool: get_similar_sessions
 *
 * Finds similar past activities by pace and distance for comparison.
 * Useful for the coach to reference past performance at similar intensity.
 */
export const getSimilarSessionsTool = new DynamicStructuredTool({
  name: "get_similar_sessions",
  description:
    "Find similar past running activities by pace and distance. Useful for comparing current performance to historical data.",
  schema: z.object({
    targetPaceSecKm: z.number().describe("Target pace in seconds per kilometer"),
    distanceKm: z.number().describe("Target distance in kilometers"),
    tolerancePct: z
      .number()
      .default(10)
      .describe("Tolerance percentage for matching (default 10%)"),
    limit: z.number().default(5).describe("Maximum number of results"),
  }),
  func: async ({ targetPaceSecKm, distanceKm, tolerancePct, limit }, _runManager?: CallbackManagerForToolRun, config?: { configurable?: { userId?: string } }) => {
    const userId = config?.configurable?.userId;
    if (!userId) {
      return JSON.stringify({ error: "userId not provided in config" });
    }

    const targetDistanceM = distanceKm * 1000;
    const tolerance = tolerancePct / 100;

    const activities = await prisma.activity.findMany({
      where: {
        userId,
        avgPaceSecKm: {
          gte: targetPaceSecKm * (1 - tolerance),
          lte: targetPaceSecKm * (1 + tolerance),
        },
        distanceM: {
          gte: targetDistanceM * (1 - tolerance),
          lte: targetDistanceM * (1 + tolerance),
        },
      },
      orderBy: { startDate: "desc" },
      take: limit,
      select: {
        startDate: true,
        distanceM: true,
        avgPaceSecKm: true,
        avgHrBpm: true,
        perceivedEffort: true,
        tss: true,
      },
    });

    const result = activities.map((a) => ({
      date: a.startDate.toISOString().split("T")[0],
      distanceKm: (a.distanceM / 1000).toFixed(1),
      paceSecKm: Math.round(a.avgPaceSecKm),
      avgHr: a.avgHrBpm,
      perceivedEffort: a.perceivedEffort,
      tss: a.tss,
    }));

    return JSON.stringify(result);
  },
});
