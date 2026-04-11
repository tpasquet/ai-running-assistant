import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { MentalOutputSchema } from "../../schemas/mental.schema.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/mental.v1.js";
import { contextAssembler } from "../../context/ContextAssembler.js";
import { getMoodTrendTool } from "../../tools/mental/getMoodTrend.js";
import { AI_CONFIG } from "../../config.js";

/**
 * Mental Node - Sports psychology and mental performance
 *
 * This node:
 * 1. Fetches detailed mood trend via tool for richer context
 * 2. Analyzes mood, motivation, and mental fatigue patterns
 * 3. Detects burnout and anxiety signals
 * 4. Provides empathetic mental strategies
 */
export async function mentalNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI(AI_CONFIG.mental);
  const structuredModel = model.withStructuredOutput(MentalOutputSchema);
  const contextText = contextAssembler.assemble(state.context);

  // Fetch detailed mood trend from DB
  let moodTrendText = "";
  try {
    const result = await getMoodTrendTool.invoke(
      { days: 14 },
      { configurable: { userId: state.userId } }
    );
    const data = JSON.parse(result as string);
    if (!data.error) {
      moodTrendText = `\n\n## Detailed Mood Trend (14 days)\n${JSON.stringify(data, null, 2)}`;
    }
  } catch (err) {
    console.warn("[mental] getMoodTrend tool failed:", err);
  }

  try {
    const response = await structuredModel.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${contextText}${moodTrendText}\n\nUser question: "${state.message}"\n\nIntent: ${state.intent}\nUrgency: ${state.urgency}`,
      },
    ]);

    return {
      mentalOutput: response,
      promptVersion: PROMPT_VERSION,
      modelVersion: AI_CONFIG.mental.modelName,
    };
  } catch (err) {
    console.error("[mental] LLM call failed:", err);
    return { mentalOutput: null };
  }
}
