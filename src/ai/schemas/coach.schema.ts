import { z } from "zod";

/**
 * Coach agent output schema
 */
export const CoachOutputSchema = z.object({
  recommendation: z
    .string()
    .describe("Immediate actionable recommendation for today/this week"),

  rationale: z
    .string()
    .describe("Why this recommendation based on training data"),

  riskAssessment: z
    .string()
    .describe("Any concerns or red flags identified"),

  nextSteps: z
    .string()
    .describe("What to monitor or adjust going forward"),

  suggestedSession: z
    .object({
      type: z.enum([
        "easy_run",
        "tempo",
        "intervals",
        "long_run",
        "recovery",
        "rest",
      ]),
      durationMin: z.number().optional(),
      distanceKm: z.number().optional(),
      targetPaceSecKm: z.number().optional(),
      notes: z.string().optional(),
    })
    .optional()
    .describe("Specific session suggestion if applicable"),
});

export type CoachOutput = z.infer<typeof CoachOutputSchema>;
