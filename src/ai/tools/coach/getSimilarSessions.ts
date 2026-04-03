import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { MOCK_ACTIVITIES } from "../../mocks/activities.fixture.js";

/**
 * Tool: get_similar_sessions
 *
 * Finds similar past activities by pace and distance for comparison.
 * Useful for the coach to reference past performance at similar intensity.
 *
 * Mock implementation - uses in-memory fixture data.
 * In iteration 2, replace with database query.
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
  func: async ({ targetPaceSecKm, distanceKm, tolerancePct, limit }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) {
      return JSON.stringify({ error: "userId not provided in config" });
    }

    const targetDistanceM = distanceKm * 1000;
    const tolerance = tolerancePct / 100;

    // Mock implementation - filter in-memory data
    const similar = MOCK_ACTIVITIES.filter((a) => {
      if (a.userId !== userId) return false;

      const paceMatch =
        a.avgPaceSecKm >= targetPaceSecKm * (1 - tolerance) &&
        a.avgPaceSecKm <= targetPaceSecKm * (1 + tolerance);

      const distanceMatch =
        a.distanceM >= targetDistanceM * (1 - tolerance) &&
        a.distanceM <= targetDistanceM * (1 + tolerance);

      return paceMatch && distanceMatch;
    })
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
      .slice(0, limit)
      .map((a) => ({
        date: a.startDate.toISOString().split("T")[0],
        distanceKm: (a.distanceM / 1000).toFixed(1),
        paceSecKm: a.avgPaceSecKm,
        avgHr: a.avgHrBpm,
        perceivedEffort: a.perceivedEffort,
        tss: a.tss,
      }));

    return JSON.stringify(similar);
  },
});
