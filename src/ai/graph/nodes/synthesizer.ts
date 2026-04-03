import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { SynthesizerOutputSchema } from "../../schemas/synthesizer.schema.js";

/**
 * Synthesizer Node - Merges multi-agent responses into coherent action plan
 *
 * This node:
 * 1. Takes outputs from coach, physio, and/or mental agents
 * 2. Identifies conflicts or contradictions
 * 3. Prioritizes recommendations (safety > recovery > performance)
 * 4. Produces unified, actionable response
 *
 * Priority hierarchy:
 * - Physio (injury/safety) > Mental (burnout/health) > Coach (performance)
 *
 * If only one agent responded, passes through directly.
 */
export async function synthesizerNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  // Collect all agent outputs
  const outputs = [
    state.coachOutput ? { agent: "coach", output: state.coachOutput } : null,
    state.physioOutput ? { agent: "physio", output: state.physioOutput } : null,
    state.mentalOutput ? { agent: "mental", output: state.mentalOutput } : null,
  ].filter(Boolean);

  // If only one agent responded, return it directly
  if (outputs.length === 1) {
    return {
      finalResponse: outputs[0]!.output,
    };
  }

  // Multiple agents - synthesize their responses
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  });

  const structuredModel = model.withStructuredOutput(SynthesizerOutputSchema);

  const agentSummaries = outputs
    .map((o) => `**${o!.agent.toUpperCase()}**:\n${JSON.stringify(o!.output, null, 2)}`)
    .join("\n\n");

  const prompt = `You are synthesizing recommendations from multiple specialized agents into a coherent action plan.

## Agent Outputs

${agentSummaries}

## Synthesis Rules

1. **Priority hierarchy**: Safety (physio) > Mental health > Performance (coach)
2. **Conflict resolution**: If agents disagree, favor the more conservative approach
3. **Coherence**: Ensure recommendations don't contradict each other
4. **Actionability**: Provide clear, ordered next steps

## Key Principles

- If physio flags injury risk, that overrides training progression
- If mental flags burnout, that overrides performance goals
- Coach advice is secondary to health and wellbeing
- Be concise but complete

Synthesize these recommendations into a unified response.`;

  const response = await structuredModel.invoke([
    {
      role: "system",
      content:
        "You synthesize multi-agent recommendations into coherent, prioritized action plans.",
    },
    { role: "user", content: prompt },
  ]);

  return {
    finalResponse: response,
  };
}
