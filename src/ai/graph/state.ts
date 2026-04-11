import type { AggregatedContext } from "../../shared/types/domain.types";
import type { CoachOutput } from "../../ai/schemas/coach.schema.js";
import type { PhysioOutput } from "../../ai/schemas/physio.schema.js";
import type { MentalOutput } from "../../ai/schemas/mental.schema.js";
import type { SynthesizerOutput } from "../../ai/schemas/synthesizer.schema.js";

/**
 * GraphState - State object passed through LangGraph nodes
 *
 * This state is modified by each node in the graph and contains:
 * - User input (message, userId)
 * - Context data (AggregatedContext from mock or DB)
 * - Router decisions (selected agents, intent, urgency)
 * - Agent outputs (coach, physio, mental)
 * - Final synthesized response
 * - Metadata (prompt versions, model versions)
 */
export interface GraphState {
  // Input
  userId: string;
  message: string;
  context: AggregatedContext;

  // Router output
  selectedAgents: ("coach" | "physio" | "mental")[];
  intent: string;
  urgency: "low" | "medium" | "high";

  // Agent outputs
  coachOutput: CoachOutput | null;
  physioOutput: PhysioOutput | null;
  mentalOutput: MentalOutput | null;

  // Final output — always SynthesizerOutput shape
  finalResponse: SynthesizerOutput | null;

  // Metadata
  promptVersion: string | null;
  modelVersion: string | null;
}

/**
 * Initial state for the graph
 */
export function createInitialState(
  userId: string,
  message: string,
  context: AggregatedContext
): GraphState {
  return {
    userId,
    message,
    context,
    selectedAgents: [],
    intent: "",
    urgency: "low",
    coachOutput: null,
    physioOutput: null,
    mentalOutput: null,
    finalResponse: null,
    promptVersion: null,
    modelVersion: null,
  };
}
