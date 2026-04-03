import type { AggregatedContext } from "../../shared/types/domain.types";

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
  coachOutput: unknown | null;
  physioOutput: unknown | null;
  mentalOutput: unknown | null;

  // Final output
  finalResponse: unknown | null;

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
