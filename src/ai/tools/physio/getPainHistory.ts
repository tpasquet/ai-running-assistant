import { DynamicStructuredTool } from "@langchain/core/tools";
import type { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";
import { z } from "zod";
import { prisma } from "../../../infra/db/prisma.js";

/**
 * Tool: get_pain_history
 *
 * Retrieves pain reports over specified time period.
 * Useful for physio to assess injury progression and patterns.
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
  func: async ({ days, minIntensity }, _runManager?: CallbackManagerForToolRun, config?: { configurable?: { userId?: string } }) => {
    const userId = config?.configurable?.userId;
    if (!userId) {
      return JSON.stringify({ error: "userId not provided in config" });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const feedbacks = await prisma.dailyFeedback.findMany({
      where: {
        userId,
        date: { gte: cutoffDate },
        painIntensity: { gte: minIntensity },
      },
      orderBy: { date: "desc" },
      select: {
        date: true,
        painLocations: true,
        painIntensity: true,
        notes: true,
        fatigue: true,
        muscleSoreness: true,
      },
    });

    const reports = feedbacks.map((fb) => ({
      date: fb.date.toISOString().split("T")[0],
      painLocations: fb.painLocations,
      intensity: fb.painIntensity,
      notes: fb.notes,
      fatigue: fb.fatigue,
      muscleSoreness: fb.muscleSoreness,
    }));

    return JSON.stringify({ count: reports.length, reports });
  },
});
