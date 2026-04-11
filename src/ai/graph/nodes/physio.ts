import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { PhysioOutputSchema } from "../../schemas/physio.schema.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/physio.v1.js";
import { contextAssembler } from "../../context/ContextAssembler.js";
import { getPainHistoryTool } from "../../tools/physio/getPainHistory.js";
import { AI_CONFIG } from "../../config.js";

/**
 * Physio Node - Injury prevention and recovery advice
 *
 * This node:
 * 1. Fetches detailed pain history via tool for richer context
 * 2. Analyzes pain reports and injury risk factors
 * 3. Provides conservative, evidence-based recommendations
 * 4. Flags when medical evaluation is needed
 */
export async function physioNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI(AI_CONFIG.physio);
  const structuredModel = model.withStructuredOutput(PhysioOutputSchema);
  const contextText = contextAssembler.assemble(state.context);

  // Fetch detailed pain history from DB
  let painHistoryText = "";
  try {
    const result = await getPainHistoryTool.invoke(
      { days: 21, minIntensity: 1 },
      { configurable: { userId: state.userId } }
    );
    const data = JSON.parse(result as string);
    if (data.count > 0) {
      painHistoryText = `\n\n## Detailed Pain History (21 days)\n${JSON.stringify(data, null, 2)}`;
    }
  } catch (err) {
    console.warn("[physio] getPainHistory tool failed:", err);
  }

  try {
    const response = await structuredModel.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${contextText}${painHistoryText}\n\nUser question: "${state.message}"\n\nIntent: ${state.intent}\nUrgency: ${state.urgency}`,
      },
    ]);

    return {
      // Cast needed: Zod `.default()` makes the field `string | undefined` in inferred
      // input type, but the output (after parsing) always has the string value.
      physioOutput: response as import("../../schemas/physio.schema.js").PhysioOutput,
      promptVersion: PROMPT_VERSION,
      modelVersion: AI_CONFIG.physio.modelName,
    };
  } catch (err) {
    console.error("[physio] LLM call failed:", err);
    return { physioOutput: null };
  }
}
