import { z } from "zod";

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
      durationMin: z.number().nullable().describe("Duration in minutes, or null"),
      distanceKm: z.number().nullable().describe("Distance in km, or null"),
      targetPaceSecKm: z.number().nullable().describe("Target pace sec/km, or null"),
      notes: z.string().nullable().describe("Additional notes, or null"),
    })
    .nullable()
    .describe("Specific session suggestion if applicable, or null"),
});

export type CoachOutput = z.infer<typeof CoachOutputSchema>;
