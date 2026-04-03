import { StateGraph, END } from "@langchain/langgraph";
import type { GraphState } from "./state.js";
import { routerNode } from "./nodes/router.js";
import { coachNode } from "./nodes/coach.js";
import { physioNode } from "./nodes/physio.js";
import { mentalNode } from "./nodes/mental.js";
import { synthesizerNode } from "./nodes/synthesizer.js";

/**
 * Creates the coaching graph for RunCoach AI
 *
 * Graph flow:
 * 1. START → router (classify intent and select agents)
 * 2. router → [coach | physio | mental] (conditional, can be parallel)
 * 3. agents → synthesizer (merge outputs into coherent response)
 * 4. synthesizer → END
 *
 * Note: In iteration 1, context is passed in directly (no loadContext node needed).
 * In iteration 2, we'll add a loadContext node to fetch from database.
 */
export function createCoachingGraph() {
  const graph = new StateGraph<GraphState>({
    channels: {
      userId: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      message: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      context: {
        value: (left?: unknown, right?: unknown) => right ?? left ?? null,
      },
      selectedAgents: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      intent: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      urgency: {
        value: (left?: string, right?: string) => right ?? left ?? "low",
      },
      coachOutput: {
        value: (left?: unknown, right?: unknown) => right ?? left ?? null,
      },
      physioOutput: {
        value: (left?: unknown, right?: unknown) => right ?? left ?? null,
      },
      mentalOutput: {
        value: (left?: unknown, right?: unknown) => right ?? left ?? null,
      },
      finalResponse: {
        value: (left?: unknown, right?: unknown) => right ?? left ?? null,
      },
      promptVersion: {
        value: (left?: string, right?: string) => right ?? left ?? null,
      },
      modelVersion: {
        value: (left?: string, right?: string) => right ?? left ?? null,
      },
    },
  });

  // Add all nodes
  graph.addNode("router", routerNode);
  graph.addNode("coach", coachNode);
  graph.addNode("physio", physioNode);
  graph.addNode("mental", mentalNode);
  graph.addNode("synthesizer", synthesizerNode);

  // Entry point
  graph.setEntryPoint("router");

  // Conditional routing from router to agents
  graph.addConditionalEdges("router", routeToAgents, {
    coach: "coach",
    physio: "physio",
    mental: "mental",
    synthesizer: "synthesizer", // If no agents selected, skip to synthesizer
  });

  // All agents flow to synthesizer
  graph.addEdge("coach", "synthesizer");
  graph.addEdge("physio", "synthesizer");
  graph.addEdge("mental", "synthesizer");

  // Synthesizer to end
  graph.addEdge("synthesizer", END);

  return graph;
}

/**
 * Routing logic - determines which agent(s) to invoke
 */
function routeToAgents(state: GraphState): string | string[] {
  if (!state.selectedAgents || state.selectedAgents.length === 0) {
    return "synthesizer"; // No agents selected, skip to synthesizer
  }

  // Return first agent (LangGraph will handle parallel execution if needed)
  // For now, we'll execute sequentially
  return state.selectedAgents[0];
}

/**
 * Compile the graph (ready for execution)
 * This will be used in T8 when all nodes are implemented
 */
export function compileCoachingGraph() {
  const graph = createCoachingGraph();
  return graph.compile();
}
