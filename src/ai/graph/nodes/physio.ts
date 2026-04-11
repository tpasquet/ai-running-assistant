import { ChatOpenAI } from "@langchain/openai";
import type { GraphState } from "../state.js";
import { PhysioOutputSchema } from "../../schemas/physio.schema.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../../prompts/physio.v1.js";
import { contextAssembler } from "../../context/ContextAssembler.js";
import { getPainHistoryTool } from "../../tools/physio/getPainHistory.js";
import { getPeakWeeksTool } from "../../tools/coach/getPeakWeeks.js";
import { AI_CONFIG } from "../../config.js";

/**
 * Physio Node - Injury prevention and recovery advice
 *
 * Retrieval sequence (parallel):
 *   1. Pain history (21 days)  — injury signals
 *   2. Peak weeks              — load/injury correlation
 */
export async function physioNode(state: GraphState): Promise<Partial<GraphState>> {
  const model = new ChatOpenAI(AI_CONFIG.physio);
  const structuredModel = model.withStructuredOutput(PhysioOutputSchema);
  const contextText = contextAssembler.assemble(state.context);
  const cfg = { configurable: { userId: state.userId } };

  // ── Parallel RAG retrieval ─────────────────────────────────────────────────
  const [painRaw, peakWeeksRaw] = await Promise.allSettled([
    getPainHistoryTool.invoke({ days: 21, minIntensity: 1 }, cfg),
    getPeakWeeksTool.invoke({ rankBy: "tss", topN: 5, lastDays: 180 }, cfg),
  ]);

  let ragContext = "";

  if (painRaw.status === "fulfilled") {
    try {
      const data = JSON.parse(painRaw.value as string);
      if (data.count > 0) {
        ragContext += `\n\n## Detailed Pain History (21 days)\n${JSON.stringify(data, null, 2)}`;
      }
    } catch { /* ignore */ }
  } else {
    console.warn("[physio] getPainHistory tool failed:", painRaw.reason);
  }

  if (peakWeeksRaw.status === "fulfilled") {
    try {
      const data = JSON.parse(peakWeeksRaw.value as string);
      if (Array.isArray(data) && data.length > 0) {
        ragContext += `\n\n## Peak Training Weeks (load/injury correlation)\n${JSON.stringify(data, null, 2)}`;
      }
    } catch { /* ignore */ }
  } else {
    console.warn("[physio] getPeakWeeks tool failed:", peakWeeksRaw.reason);
  }

  // ── LLM call ──────────────────────────────────────────────────────────────
  try {
    const response = await structuredModel.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${contextText}${ragContext}\n\nUser question: "${state.message}"\n\nIntent: ${state.intent}\nUrgency: ${state.urgency}`,
      },
    ]);

    return {
      physioOutput: response as import("../../schemas/physio.schema.js").PhysioOutput,
      promptVersion: PROMPT_VERSION,
      modelVersion: AI_CONFIG.physio.modelName,
    };
  } catch (err) {
    console.error("[physio] LLM call failed:", err);
    return { physioOutput: null };
  }
}
