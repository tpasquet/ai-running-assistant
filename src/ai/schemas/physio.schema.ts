import { z } from "zod";

/**
 * Physio agent output schema
 */
export const PhysioOutputSchema = z.object({
  injuryAssessment: z
    .string()
    .describe("Assessment of injury severity and likely cause"),

  immediateAction: z
    .string()
    .describe("What to do now (rest, modify, continue, seek medical)"),

  riskFactors: z
    .string()
    .describe("Data-based injury risk factors identified"),

  prevention: z
    .string()
    .describe("Specific recommendations to reduce injury risk"),

  injuryRiskLevel: z
    .enum(["low", "moderate", "high"])
    .describe("Overall injury risk assessment"),

  recommendSeekMedical: z
    .boolean()
    .describe("Whether to recommend seeking professional medical evaluation"),

  disclaimer: z
    .string()
    .default(
      "⚠️ These recommendations do not replace professional medical advice. If pain persists or worsens, consult a healthcare provider."
    ),
});

export type PhysioOutput = z.infer<typeof PhysioOutputSchema>;
