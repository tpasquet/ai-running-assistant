import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { CoachOutputSchema } from "../../schemas/coach.schema.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/coach.v1.js";
import { contextAssembler } from "../../context/ContextAssembler.js";
import { getSimilarSessionsTool } from "../../tools/coach/getSimilarSessions.js";
import { AI_CONFIG } from "../../config.js";

/**
 * Coach Node - Training load management and periodization advice
 *
 * This node:
 * 1. Fetches similar past sessions via tool for richer context
 * 2. Analyzes training load, CTL/ATL/TSB
 * 3. Provides structured training recommendations
 * 4. Suggests specific sessions when appropriate
 */
export async function coachNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI(AI_CONFIG.coach);
  const structuredModel = model.withStructuredOutput(CoachOutputSchema);
  const contextText = contextAssembler.assemble(state.context);

  // Fetch similar sessions from DB to enrich the LLM context
  let similarSessionsText = "";
  const lastActivity = state.context.recentActivities[0];
  if (lastActivity) {
    try {
      const result = await getSimilarSessionsTool.invoke(
        {
          targetPaceSecKm: lastActivity.avgPaceSecKm,
          distanceKm: lastActivity.distanceM / 1000,
          tolerancePct: 15,
          limit: 3,
        },
        { configurable: { userId: state.userId } }
      );
      const sessions = JSON.parse(result as string);
      if (Array.isArray(sessions) && sessions.length > 0) {
        similarSessionsText = `\n\n## Similar Past Sessions\n${JSON.stringify(sessions, null, 2)}`;
      }
    } catch (err) {
      console.warn("[coach] getSimilarSessions tool failed:", err);
    }
  }

  try {
    const response = await structuredModel.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${contextText}${similarSessionsText}\n\nUser question: "${state.message}"\n\nIntent: ${state.intent}\nUrgency: ${state.urgency}`,
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
