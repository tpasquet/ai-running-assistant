/**
 * Synthesizer Agent - Multi-agent Response Merger
 * Version: 1.0
 * Model: gpt-4o-mini
 */

export const PROMPT_VERSION = "synthesizer.v1";

export const SYSTEM_PROMPT =
  "You synthesize multi-agent recommendations into coherent, prioritized action plans.";

export const USER_PROMPT = (agentSummaries: string) => `You are synthesizing recommendations from multiple specialized agents into a coherent action plan.

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
