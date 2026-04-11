/**
 * AI Layer — Central model configuration
 *
 * Single source of truth for model names and temperatures per agent.
 * Changing a model here propagates to all nodes.
 */
export const AI_CONFIG = {
  router: {
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  },
  coach: {
    modelName: "gpt-4o",
    temperature: 0.3,
  },
  physio: {
    modelName: "gpt-4o",
    temperature: 0.2, // More conservative for medical advice
  },
  mental: {
    modelName: "gpt-4o",
    temperature: 0.5, // Higher temperature for empathetic, creative coaching
  },
  synthesizer: {
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  },
} as const;
