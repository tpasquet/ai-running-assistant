import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { CoachOutputSchema } from "../../schemas/coach.schema.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/coach.v1.js";
import { contextAssembler } from "../../context/ContextAssembler.js";
import { getSimilarSessionsTool } from "../../tools/coach/getSimilarSessions.js";
import { getTrainingLoadHistoryTool } from "../../tools/coach/getTrainingLoadHistory.js";
import { getActivitiesByProfileTool } from "../../tools/coach/getActivitiesByProfile.js";
import { getPeakWeeksTool } from "../../tools/coach/getPeakWeeks.js";
import { AI_CONFIG } from "../../config.js";

const toolConfig = (userId: string) => ({ configurable: { userId } });

/**
 * Coach Node - Training load management and periodization advice
 *
 * Retrieval sequence (all run in parallel):
 *   1. Similar past sessions  — pace/distance comparison
 *   2. Training load history  — 12-week CTL/ATL/TSB trend
 *   3. Recent long runs       — periodization pattern
 *   4. Peak weeks             — tolerance thresholds
 */
export async function coachNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI(AI_CONFIG.coach);
  const structuredModel = model.withStructuredOutput(CoachOutputSchema);
  const contextText = contextAssembler.assemble(state.context);
  const cfg = toolConfig(state.userId);

  // ── Parallel RAG retrieval ────────────────────────────────────────────────
  const lastActivity = state.context.recentActivities[0];

  const [similarRaw, loadHistoryRaw, longRunsRaw, peakWeeksRaw] = await Promise.allSettled([
    lastActivity
      ? getSimilarSessionsTool.invoke(
          { targetPaceSecKm: lastActivity.avgPaceSecKm, distanceKm: lastActivity.distanceM / 1000, tolerancePct: 15, limit: 3 },
          cfg
        )
      : Promise.resolve(null),
    getTrainingLoadHistoryTool.invoke({ weeks: 12 }, cfg),
    getActivitiesByProfileTool.invoke({ sessionType: "long_run", lastDays: 90, limit: 5 }, cfg),
    getPeakWeeksTool.invoke({ rankBy: "tss", topN: 3, lastDays: 365 }, cfg),
  ]);

  const parse = (r: PromiseSettledResult<string | null>, label: string): string => {
    if (r.status === "rejected") {
      console.warn(`[coach] ${label} tool failed:`, r.reason);
      return "";
    }
    if (!r.value) return "";
    try {
      const data = JSON.parse(r.value as string);
      const isEmpty = Array.isArray(data) && data.length === 0;
      return isEmpty ? "" : `\n\n## ${label}\n${JSON.stringify(data, null, 2)}`;
    } catch {
      return "";
    }
  };

  const ragContext =
    parse(similarRaw,    "Similar Past Sessions") +
    parse(loadHistoryRaw, "Training Load History (12 weeks)") +
    parse(longRunsRaw,   "Recent Long Runs") +
    parse(peakWeeksRaw,  "Peak Training Weeks");

  // ── LLM call ─────────────────────────────────────────────────────────────
  try {
    const response = await structuredModel.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${contextText}${ragContext}\n\nUser question: "${state.message}"\n\nIntent: ${state.intent}\nUrgency: ${state.urgency}`,
      },
    ]);

    return {
      coachOutput: response,
      promptVersion: PROMPT_VERSION,
      modelVersion: AI_CONFIG.coach.modelName,
    };
  } catch (err) {
    console.error("[coach] LLM call failed:", err);
    return { coachOutput: null };
  }
}
