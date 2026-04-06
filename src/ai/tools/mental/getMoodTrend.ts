import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "../../../infra/db/prisma.js";

/**
 * Tool: get_mood_trend
 *
 * Analyzes mood and motivation trends over time.
 * Useful for mental coach to detect burnout and mental fatigue patterns.
 */
export const getMoodTrendTool = new DynamicStructuredTool({
  name: "get_mood_trend",
  description:
    "Analyze mood, sleep quality, and fatigue trends over time to detect burnout, mental fatigue, or positive momentum.",
  schema: z.object({
    days: z.number().default(14).describe("Number of days to analyze"),
  }),
  func: async ({ days }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) {
      return JSON.stringify({ error: "userId not provided in config" });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const feedbacks = await prisma.dailyFeedback.findMany({
      where: { userId, date: { gte: cutoffDate } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        mood: true,
        sleepQuality: true,
        fatigue: true,
        notes: true,
      },
    });

    if (feedbacks.length === 0) {
      return JSON.stringify({ error: "No feedback data available" });
    }

    const avgMood = avg(feedbacks.map((fb) => fb.mood));
    const avgSleep = avg(feedbacks.map((fb) => fb.sleepQuality));
    const avgFatigue = avg(feedbacks.map((fb) => fb.fatigue));

    // Trend: compare first half vs second half
    const mid = Math.floor(feedbacks.length / 2);
    const firstHalfMood = avg(feedbacks.slice(0, mid).map((fb) => fb.mood));
    const secondHalfMood = avg(feedbacks.slice(mid).map((fb) => fb.mood));
    const moodTrend = secondHalfMood > firstHalfMood ? "improving" : "declining";

    const recentEntries = feedbacks.slice(-7).map((fb) => ({
      date: fb.date.toISOString().split("T")[0],
      mood: fb.mood,
      sleep: fb.sleepQuality,
      fatigue: fb.fatigue,
      notes: fb.notes,
    }));

    return JSON.stringify({
      summary: {
        avgMood: avgMood.toFixed(1),
        avgSleep: avgSleep.toFixed(1),
        avgFatigue: avgFatigue.toFixed(1),
        moodTrend,
        dataPoints: feedbacks.length,
      },
      recentEntries,
    });
  },
});

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
