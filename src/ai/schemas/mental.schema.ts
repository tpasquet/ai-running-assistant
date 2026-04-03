import { z } from "zod";

/**
 * Mental agent output schema
 */
export const MentalOutputSchema = z.object({
  mentalStateAssessment: z
    .string()
    .describe("Assessment of mental wellbeing based on data"),

  primaryConcern: z
    .string()
    .describe("Main mental/emotional issue identified"),

  immediateStrategy: z
    .string()
    .describe("Specific mental technique to try today/this week"),

  longTermApproach: z
    .string()
    .describe("Sustainable mindset or habit changes for mental resilience"),

  burnoutRisk: z
    .enum(["low", "moderate", "high"])
    .describe("Assessment of burnout risk level"),

  motivationLevel: z
    .enum(["low", "moderate", "high"])
    .describe("Current motivation level based on data"),

  encouragement: z
    .string()
    .describe("Personalized encouraging message"),
});

export type MentalOutput = z.infer<typeof MentalOutputSchema>;
