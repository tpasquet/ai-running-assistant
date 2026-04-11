/**
 * End-to-end RAG test — sends a real user question through the coaching graph
 * and logs the RAG context + structured LLM response.
 *
 * Usage:
 *   npx tsx --env-file .env prisma/test-rag-llm.ts
 *
 * Simulated date: 2025-08-15 — so RAG tools look back from that date,
 * matching the period when Strava data is available.
 */

// ── Simulate "now" = 2025-08-15 ───────────────────────────────────────────────
const SIMULATED_NOW = new Date("2025-08-15T12:00:00Z");
const OriginalDate = Date;
// @ts-expect-error — intentional global patch for test
globalThis.Date = class extends OriginalDate {
  constructor(...args: ConstructorParameters<typeof OriginalDate>) {
    if (args.length === 0) {
      super(SIMULATED_NOW.getTime());
    } else {
      // @ts-expect-error — spread
      super(...args);
    }
  }
  static now() { return SIMULATED_NOW.getTime(); }
};
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "../src/infra/db/prisma.js";
import { compileCoachingGraph } from "../src/ai/graph/graph.js";
import { createInitialState } from "../src/ai/graph/state.js";
import { AggregationService } from "../src/domain/aggregation/AggregationService.js";

// No Redis needed for this test — pass null-safe stub
const fakeRedis = {
  get: async () => null,
  set: async () => "OK",
  setex: async () => "OK",
} as never;

const graph = compileCoachingGraph();

const QUESTIONS = [
  "Comment s'est passée ma préparation pour mes dernières courses ?",
  "Analyse ma charge d'entraînement des 3 derniers mois. Suis-je en bonne forme ?",
  "Est-ce que je m'entraîne suffisamment en course longue ?",
];

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "terry.pasquet@proton.me" } });
  if (!user) {
    console.error("❌  User not found. Run `npm run db:setup-dev` first.");
    process.exit(1);
  }

  console.log(`\n👤 User: ${user.email} (${user.id})`);
  console.log(`📅 Simulated date: ${SIMULATED_NOW.toISOString().split("T")[0]}`);

  // Load context anchored to SIMULATED_NOW: take the WeeklyAggregate whose weekStart
  // is the most recent one ≤ SIMULATED_NOW, then build a minimal AggregatedContext.
  const aggregationService = new AggregationService(prisma, fakeRedis);
  const context = await aggregationService.getContextWindow(user.id);

  // Override load metrics with values from the simulated date
  const weekAtDate = await prisma.weeklyAggregate.findFirst({
    where: { userId: user.id, weekStart: { lte: SIMULATED_NOW } },
    orderBy: { weekStart: "desc" },
    select: { ctl: true, atl: true, tsb: true, weekStart: true },
  });
  if (weekAtDate) {
    context.currentCTL = Math.round(weekAtDate.ctl * 10) / 10;
    context.currentATL = Math.round(weekAtDate.atl * 10) / 10;
    context.currentTSB = Math.round(weekAtDate.tsb * 10) / 10;
    context.formStatus = weekAtDate.tsb < -10 ? "overreaching"
      : weekAtDate.tsb < 0   ? "fatigued"
      : weekAtDate.tsb <= 10 ? "optimal"
      : "detuned";
  }

  console.log(`\n📊 Context loaded (week of ${weekAtDate?.weekStart.toISOString().split("T")[0]}):`);

  console.log(`   TSB: ${context.currentTSB} (${context.formStatus})`);
  console.log(`   CTL: ${context.currentCTL} | ATL: ${context.currentATL}`);
  console.log(`   Avg fatigue (7d): ${context.avgFatigue.toFixed(1)}/10`);
  console.log(`   Avg mood (7d): ${context.avgMood.toFixed(1)}/10`);
  console.log("─".repeat(70));

  const question = QUESTIONS[2]; // Change index to try different questions
  console.log(`\n💬 Question: ${question}\n`);

  const initialState = createInitialState(user.id, question, context);
  const result = await graph.invoke(initialState, { configurable: { userId: user.id } });

  console.log("\n" + "═".repeat(70));
  console.log("  GRAPH RESPONSE");
  console.log("═".repeat(70));
  console.log("\nRoute taken:", result.selectedAgents?.join(" → ") || "(none)");
  console.log("Intent:", result.intent);
  console.log("Urgency:", result.urgency);

  if (result.coachOutput) {
    console.log("\n📋 Coach Output:");
    console.log(JSON.stringify(result.coachOutput, null, 2));
  }
  if (result.physioOutput) {
    console.log("\n🩺 Physio Output:");
    console.log(JSON.stringify(result.physioOutput, null, 2));
  }
  if (result.mentalOutput) {
    console.log("\n🧠 Mental Output:");
    console.log(JSON.stringify(result.mentalOutput, null, 2));
  }

  if (result.finalResponse) {
    console.log("\n" + "═".repeat(70));
    console.log("  FINAL RESPONSE TO USER");
    console.log("═".repeat(70));
    const r = result.finalResponse;
    console.log(`\nSummary: ${r.summary}`);
    console.log(`\nPrimary recommendation: ${r.primaryRecommendation}`);
    if (r.detailedAdvice?.training) console.log(`\nTraining: ${r.detailedAdvice.training}`);
    if (r.detailedAdvice?.injury)   console.log(`\nInjury: ${r.detailedAdvice.injury}`);
    if (r.detailedAdvice?.mental)   console.log(`\nMental: ${r.detailedAdvice.mental}`);
    if (r.nextSteps?.length) {
      console.log("\nNext steps:");
      for (const step of r.nextSteps) console.log(`  → ${step}`);
    }
    if (r.conflicts) console.log(`\nConflicts: ${r.conflicts}`);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
