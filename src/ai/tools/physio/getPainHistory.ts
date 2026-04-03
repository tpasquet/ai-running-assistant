import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { MOCK_DAILY_FEEDBACK } from "../../mocks/feedback.fixture.js";

/**
 * Tool: get_pain_history
 *
 * Retrieves pain reports over specified time period.
 * Useful for physio to assess injury progression and patterns.
 *
 * Mock implementation - uses in-memory fixture data.
 */
export const getPainHistoryTool = new DynamicStructuredTool({
  name: "get_pain_history",
  description:
    "Retrieve pain reports and injury history over a specified time period. Shows pain locations, intensity trends, and recovery patterns.",
  schema: z.object({
    days: z.number().default(14).describe("Number of days to look back"),
    minIntensity: z
      .number()
      .default(1)
      .describe("Minimum pain intensity to include (1-10)"),
  }),
  func: async ({ days, minIntensity }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) {
      return JSON.stringify({ error: "userId not provided in config" });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const painReports = MOCK_DAILY_FEEDBACK.filter((fb) => {
      if (fb.userId !== userId) return false;
      if (fb.date < cutoffDate) return false;
      if (!fb.painIntensity || fb.painIntensity < minIntensity) return false;

      return true;
    })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((fb) => ({
        date: fb.date.toISOString().split("T")[0],
        painLocations: fb.painLocations,
        intensity: fb.painIntensity,
        notes: fb.notes,
        fatigue: fb.fatigue,
        muscleSoreness: fb.muscleSoreness,
      }));

    return JSON.stringify({
      count: painReports.length,
      reports: painReports,
    });
  },
});
