import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { MOCK_DAILY_FEEDBACK } from "../../mocks/feedback.fixture.js";

/**
 * Tool: get_mood_trend
 *
 * Analyzes mood and motivation trends over time.
 * Useful for mental coach to detect burnout and mental fatigue patterns.
 *
 * Mock implementation - uses in-memory fixture data.
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

    const feedbacks = MOCK_DAILY_FEEDBACK.filter(
      (fb) => fb.userId === userId && fb.date >= cutoffDate
    ).sort((a, b) => a.date.getTime() - b.date.getTime());

    if (feedbacks.length === 0) {
      return JSON.stringify({ error: "No feedback data available" });
    }

    // Calculate trends
    const avgMood =
      feedbacks.reduce((sum, fb) => sum + fb.mood, 0) / feedbacks.length;
    const avgSleep =
      feedbacks.reduce((sum, fb) => sum + fb.sleepQuality, 0) / feedbacks.length;
    const avgFatigue =
      feedbacks.reduce((sum, fb) => sum + fb.fatigue, 0) / feedbacks.length;

    // Detect trend direction (comparing first half to second half)
    const mid = Math.floor(feedbacks.length / 2);
    const firstHalfMood =
      feedbacks
        .slice(0, mid)
        .reduce((sum, fb) => sum + fb.mood, 0) / mid;
    const secondHalfMood =
      feedbacks
        .slice(mid)
        .reduce((sum, fb) => sum + fb.mood, 0) /
      (feedbacks.length - mid);

    const moodTrend = secondHalfMood > firstHalfMood ? "improving" : "declining";

    // Recent entries
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
