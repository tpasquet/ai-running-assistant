import { StateGraph, END } from "@langchain/langgraph";
import type { GraphState } from "./state.js";
import { routerNode } from "./nodes/router.js";
import { coachNode } from "./nodes/coach.js";
import { physioNode } from "./nodes/physio.js";
import { mentalNode } from "./nodes/mental.js";
import { synthesizerNode } from "./nodes/synthesizer.js";

/**
 * RunCoach AI — Multi-agent coaching graph
 *
 * Flow (sequential conditional):
 *   START → router → (coach?) → (physio?) → (mental?) → synthesizer → END
 *
 * Each agent only runs if selected by the router. Sequential execution ensures
 * all outputs are available when the synthesizer merges them.
 *
 * Priority hierarchy in synthesizer: Physio (safety) > Mental > Coach (perf)
 *
 * Note: channel reducers intentionally use `unknown` — LangGraph's type inference
 * breaks with complex generics. Type safety is enforced at the node level via
 * `Partial<GraphState>` return types and the properly-typed GraphState interface.
 */
export function createCoachingGraph() {
  // Cast to `any` to work around LangGraph TypeScript limitations: precise GraphState
  // types break node-name inference (addEdge/setEntryPoint become untyped). Type safety
  // is enforced at node level via `Partial<GraphState>` return types instead.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph = new StateGraph<GraphState>({
    channels: {
      userId:        { value: (l?: string,   r?: string)   => r ?? l ?? "" },
      message:       { value: (l?: string,   r?: string)   => r ?? l ?? "" },
      context:       { value: (l?: unknown,  r?: unknown)  => r ?? l ?? null },
      selectedAgents:{ value: (l?: string[], r?: string[]) => r ?? l ?? [] },
      intent:        { value: (l?: string,   r?: string)   => r ?? l ?? "" },
      urgency:       { value: (l?: string,   r?: string)   => r ?? l ?? "low" },
      coachOutput:   { value: (l?: unknown,  r?: unknown)  => r ?? l ?? null },
      physioOutput:  { value: (l?: unknown,  r?: unknown)  => r ?? l ?? null },
      mentalOutput:  { value: (l?: unknown,  r?: unknown)  => r ?? l ?? null },
      finalResponse: { value: (l?: unknown,  r?: unknown)  => r ?? l ?? null },
      promptVersion: { value: (l?: string,   r?: string)   => r ?? l ?? null },
      modelVersion:  { value: (l?: string,   r?: string)   => r ?? l ?? null },
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  graph.addNode("router",      routerNode);
  graph.addNode("coach",       coachNode);
  graph.addNode("physio",      physioNode);
  graph.addNode("mental",      mentalNode);
  graph.addNode("synthesizer", synthesizerNode);

  graph.setEntryPoint("router");

  // router → first selected agent (or synthesizer if none selected)
  graph.addConditionalEdges(
    "router",
    (s) => {
      if (!s.selectedAgents?.length) return "synthesizer";
      if (s.selectedAgents.includes("coach"))  return "coach";
      if (s.selectedAgents.includes("physio")) return "physio";
      if (s.selectedAgents.includes("mental")) return "mental";
      return "synthesizer";
    },
    { coach: "coach", physio: "physio", mental: "mental", synthesizer: "synthesizer" }
  );

  // coach → physio (if selected) else mental (if selected) else synthesizer
  graph.addConditionalEdges(
    "coach",
    (s) => {
      if (s.selectedAgents.includes("physio")) return "physio";
      if (s.selectedAgents.includes("mental")) return "mental";
      return "synthesizer";
    },
    { physio: "physio", mental: "mental", synthesizer: "synthesizer" }
  );

  // physio → mental (if selected) else synthesizer
  graph.addConditionalEdges(
    "physio",
    (s) => s.selectedAgents.includes("mental") ? "mental" : "synthesizer",
    { mental: "mental", synthesizer: "synthesizer" }
  );

  // mental always → synthesizer
  graph.addEdge("mental",      "synthesizer");
  graph.addEdge("synthesizer", END);

  return graph;
}

export function compileCoachingGraph() {
  return createCoachingGraph().compile();
}
