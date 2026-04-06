import { z } from "zod";

export const RouterOutputSchema = z.object({
  agents: z
    .array(z.enum(["coach", "physio", "mental"]))
    .min(1)
    .describe("Which agents should handle this query"),

  intent: z
    .enum([
      "TRAINING_QUESTION",
      "PAIN_REPORT",
      "RECOVERY_QUESTION",
      "GOAL_SETTING",
      "MOTIVATION_ISSUE",
      "COMPETITION_PREP",
      "LOAD_ASSESSMENT",
      "GENERAL_QUESTION",
    ])
    .describe("Primary intent category"),

  urgency: z
    .enum(["low", "medium", "high"])
    .describe("Urgency level based on context"),

  reasoning: z
    .string()
    .describe("Brief explanation of routing decision"),
});

export type RouterOutput = z.infer<typeof RouterOutputSchema>;
