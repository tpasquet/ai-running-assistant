import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { PhysioOutputSchema } from "../../schemas/physio.schema.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/physio.v1.js";
import { ContextAssembler } from "../../context/ContextAssembler.js";

/**
 * Physio Node - Injury prevention and recovery advice
 *
 * This node:
 * 1. Analyzes pain reports and injury risk factors
 * 2. Assesses load management issues
 * 3. Provides conservative, evidence-based recommendations
 * 4. Flags when medical evaluation is needed
 *
 * Uses gpt-4o with lower temperature for more deterministic medical advice.
 */
export async function physioNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.2, // More conservative for medical advice
  });

  const structuredModel = model.withStructuredOutput(PhysioOutputSchema);

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
    physioOutput: response,
  };
}
