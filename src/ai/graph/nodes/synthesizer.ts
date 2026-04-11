import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import {
  SynthesizerOutputSchema,
  type SynthesizerOutput,
} from "../../schemas/synthesizer.schema.js";
import type { CoachOutput } from "../../schemas/coach.schema.js";
import type { PhysioOutput } from "../../schemas/physio.schema.js";
import type { MentalOutput } from "../../schemas/mental.schema.js";
import { SYSTEM_PROMPT, USER_PROMPT, PROMPT_VERSION } from "../../prompts/synthesizer.v1.js";
import { AI_CONFIG } from "../../config.js";

/**
 * Synthesizer Node - Merges multi-agent responses into coherent action plan
 *
 * This node:
 * 1. Takes outputs from coach, physio, and/or mental agents
 * 2. Identifies conflicts or contradictions
 * 3. Prioritizes recommendations (safety > recovery > performance)
 * 4. Produces unified, actionable SynthesizerOutput
 *
 * Single-agent case: output is mapped to SynthesizerOutput shape (no LLM call).
 * Multi-agent case: LLM synthesizes all outputs.
 *
 * Priority hierarchy:
 * - Physio (injury/safety) > Mental (burnout/health) > Coach (performance)
 */
export async function synthesizerNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  const outputs = [
    state.coachOutput  ? { agent: "coach",  output: state.coachOutput }  : null,
    state.physioOutput ? { agent: "physio", output: state.physioOutput } : null,
    state.mentalOutput ? { agent: "mental", output: state.mentalOutput } : null,
  ].filter(Boolean) as { agent: string; output: CoachOutput | PhysioOutput | MentalOutput }[];

  // Single agent — map to SynthesizerOutput without an extra LLM call
  if (outputs.length === 1) {
    const { agent, output } = outputs[0];
    return {
      finalResponse: singleAgentToSynthesizer(agent, output, state.urgency),
      promptVersion: PROMPT_VERSION,
      modelVersion: "passthrough",
    };
  }

  // No agents ran (router selected none, all failed) — return empty response
  if (outputs.length === 0) {
    return {
      finalResponse: {
        summary: "No coaching advice available at this time.",
        primaryRecommendation: "Please try again or rephrase your question.",
        detailedAdvice: { training: null, injury: null, mental: null },
        priorityLevel: "low",
        conflicts: null,
        nextSteps: ["Try rephrasing your question"],
      },
    };
  }

  // Multiple agents — LLM synthesis
  const model = new ChatOpenAI(AI_CONFIG.synthesizer);
  const structuredModel = model.withStructuredOutput(SynthesizerOutputSchema);

  const agentSummaries = outputs
    .map((o) => `**${o.agent.toUpperCase()}**:\n${JSON.stringify(o.output, null, 2)}`)
    .join("\n\n");

  try {
    const response = await structuredModel.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: USER_PROMPT(agentSummaries) },
    ]);

    return {
      finalResponse: response,
      promptVersion: PROMPT_VERSION,
      modelVersion: AI_CONFIG.synthesizer.modelName,
    };
  } catch (err) {
    console.error("[synthesizer] LLM call failed:", err);
    // Best-effort fallback: return physio > mental > coach priority
    const best = outputs[0];
    return {
      finalResponse: singleAgentToSynthesizer(best.agent, best.output, state.urgency),
    };
  }
}

// ---------------------------------------------------------------------------
// Passthrough mappers — convert single-agent output to SynthesizerOutput shape
// ---------------------------------------------------------------------------

function singleAgentToSynthesizer(
  agent: string,
  output: CoachOutput | PhysioOutput | MentalOutput,
  urgency: "low" | "medium" | "high"
): SynthesizerOutput {
  switch (agent) {
    case "coach":  return coachToSynthesizer(output as CoachOutput, urgency);
    case "physio": return physioToSynthesizer(output as PhysioOutput);
    case "mental": return mentalToSynthesizer(output as MentalOutput);
    default:
      return {
        summary: "Coaching advice",
        primaryRecommendation: "See detailed advice below",
        detailedAdvice: { training: null, injury: null, mental: null },
        priorityLevel: urgency,
        conflicts: null,
        nextSteps: [],
      };
  }
}

function coachToSynthesizer(o: CoachOutput, urgency: "low" | "medium" | "high"): SynthesizerOutput {
  const steps: string[] = [o.nextSteps];
  if (o.suggestedSession) {
    const s = o.suggestedSession;
    const parts = [
      s.type,
      s.durationMin  ? `${s.durationMin}min`  : null,
      s.distanceKm   ? `${s.distanceKm}km`    : null,
      s.targetPaceSecKm ? `@ ${formatPace(s.targetPaceSecKm)}/km` : null,
      s.notes,
    ].filter(Boolean);
    steps.push(`Suggested session: ${parts.join(", ")}`);
  }

  return {
    summary: o.rationale,
    primaryRecommendation: o.recommendation,
    detailedAdvice: { training: o.recommendation, injury: null, mental: null },
    priorityLevel: urgency,
    conflicts: null,
    nextSteps: steps.slice(0, 5),
  };
}

function physioToSynthesizer(o: PhysioOutput): SynthesizerOutput {
  const priorityLevel =
    o.injuryRiskLevel === "high"     ? "high"   :
    o.injuryRiskLevel === "moderate" ? "medium" : "low";

  return {
    summary: o.injuryAssessment,
    primaryRecommendation: o.immediateAction,
    detailedAdvice: {
      training: null,
      injury: [o.immediateAction, o.prevention].join("\n"),
      mental: null,
    },
    priorityLevel,
    conflicts: null,
    nextSteps: [
      o.prevention,
      o.riskFactors,
      o.recommendSeekMedical ? "Consult a healthcare provider" : null,
      o.disclaimer,
    ].filter((s): s is string => !!s).slice(0, 5),
  };
}

function mentalToSynthesizer(o: MentalOutput): SynthesizerOutput {
  const priorityLevel =
    o.burnoutRisk === "high"     ? "high"   :
    o.burnoutRisk === "moderate" ? "medium" : "low";

  return {
    summary: o.mentalStateAssessment,
    primaryRecommendation: o.immediateStrategy,
    detailedAdvice: {
      training: null,
      injury: null,
      mental: [o.immediateStrategy, o.longTermApproach].join("\n"),
    },
    priorityLevel,
    conflicts: null,
    nextSteps: [
      o.immediateStrategy,
      o.longTermApproach,
      o.encouragement,
    ].filter(Boolean).slice(0, 5),
  };
}

function formatPace(paceSecKm: number): string {
  const minutes = Math.floor(paceSecKm / 60);
  const seconds = Math.round(paceSecKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
