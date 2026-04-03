import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { MentalOutputSchema } from "../../schemas/mental.schema.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/mental.v1.js";
import { ContextAssembler } from "../../context/ContextAssembler.js";

/**
 * Mental Node - Sports psychology and mental performance
 *
 * This node:
 * 1. Analyzes mood, motivation, and mental fatigue patterns
 * 2. Detects burnout and anxiety signals
 * 3. Provides empathetic mental strategies
 * 4. Encourages sustainable mindset approaches
 *
 * Uses gpt-4o with higher temperature for more creative, empathetic responses.
 */
export async function mentalNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.5, // Higher temperature for more empathetic, creative coaching
  });

  const structuredModel = model.withStructuredOutput(MentalOutputSchema);

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
    mentalOutput: response,
  };
}
