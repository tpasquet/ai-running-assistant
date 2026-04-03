import { z } from "zod";

/**
 * Synthesizer output schema - unified response from multiple agents
 */
export const SynthesizerOutputSchema = z.object({
  summary: z
    .string()
    .describe("Brief overview of the situation (2-3 sentences)"),

  primaryRecommendation: z
    .string()
    .describe("Main action to take, synthesized from all agents"),

  detailedAdvice: z
    .object({
      training: z.string().optional().describe("Training advice from coach"),
      injury: z.string().optional().describe("Injury/physio advice"),
      mental: z.string().optional().describe("Mental/psychological advice"),
    })
    .describe("Detailed breakdown by domain"),

  priorityLevel: z
    .enum(["low", "medium", "high"])
    .describe("Overall priority/urgency of action needed"),

  conflicts: z
    .string()
    .optional()
    .describe("Any conflicts between agents and how they were resolved"),

  nextSteps: z
    .array(z.string())
    .describe("Ordered list of concrete next steps (3-5 items)"),
});

export type SynthesizerOutput = z.infer<typeof SynthesizerOutputSchema>;
