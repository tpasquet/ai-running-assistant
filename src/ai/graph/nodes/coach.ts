import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { CoachOutputSchema } from "../../schemas/coach.schema.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/coach.v1.js";
import { ContextAssembler } from "../../context/ContextAssembler.js";

/**
 * Coach Node - Training load management and periodization advice
 *
 * This node:
 * 1. Receives full aggregated context
 * 2. Analyzes training load, CTL/ATL/TSB
 * 3. Provides structured training recommendations
 * 4. Suggests specific sessions when appropriate
 *
 * Uses gpt-4o for high-quality coaching advice.
 */
export async function coachNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.3,
  });

  const structuredModel = model.withStructuredOutput(CoachOutputSchema);

  const assembler = new ContextAssembler();
  const contextText = assembler.assemble(state.context);

  const response = await structuredModel.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `${contextText}\n\nUser question: "${state.message}"\n\nIntent: ${state.intent}\nUrgency: ${state.urgency}`,
    },
  ]);

  return {
    coachOutput: response,
  };
}
