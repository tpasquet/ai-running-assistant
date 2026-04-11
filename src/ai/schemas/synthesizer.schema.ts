import { z } from "zod";

export const SynthesizerOutputSchema = z.object({
  summary: z
    .string()
    .describe("Brief overview of the situation (2-3 sentences)"),

  primaryRecommendation: z
    .string()
    .describe("Main action to take, synthesized from all agents"),

  detailedAdvice: z
    .object({
      training: z.string().nullable().describe("Training advice from coach, or null"),
      injury: z.string().nullable().describe("Injury/physio advice, or null"),
      mental: z.string().nullable().describe("Mental/psychological advice, or null"),
    })
    .describe("Detailed breakdown by domain"),

  priorityLevel: z
    .enum(["low", "medium", "high"])
    .describe("Overall priority/urgency of action needed"),

  conflicts: z
    .string()
    .nullable()
    .describe("Any conflicts between agents and how they were resolved, or null"),

  nextSteps: z
    .array(z.string())
    .describe("Ordered list of concrete next steps (3-5 items)"),
});

export type SynthesizerOutput = z.infer<typeof SynthesizerOutputSchema>;
