import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { RouterOutputSchema } from "../../schemas/router.schema.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/router.v1.js";

/**
 * Router Node - Classifies user intent and selects appropriate agents
 *
 * This node:
 * 1. Analyzes the user message + minimal context
 * 2. Determines which agents should respond (coach, physio, mental)
 * 3. Classifies the intent category
 * 4. Assesses urgency level
 *
 * Uses gpt-4o-mini for cost-efficient classification.
 */
export async function routerNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  });

  const structuredModel = model.withStructuredOutput(RouterOutputSchema);

  // Build minimal context for routing decision
  const minimalContext = `
TSB: ${state.context.currentTSB} (${state.context.formStatus})
Recent pain: ${state.context.painSummary || "none"}
Goal: ${state.context.goal?.description || "none"} (${state.context.goal?.daysRemaining || 0} days remaining)
Avg fatigue (7d): ${state.context.avgFatigue.toFixed(1)}/10
Avg mood (7d): ${state.context.avgMood.toFixed(1)}/10
  `.trim();

  const response = await structuredModel.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Context:\n${minimalContext}\n\nUser message: "${state.message}"`,
    },
  ]);

  return {
    selectedAgents: response.agents,
    intent: response.intent,
    urgency: response.urgency,
    promptVersion: PROMPT_VERSION,
    modelVersion: "gpt-4o-mini",
  };
}
