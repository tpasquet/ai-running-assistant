/**
 * Manual RAG tools test — runs against real DB data.
 *
 * Usage:
 *   npx tsx --env-file .env prisma/test-rag.ts
 */

import { prisma } from "../src/infra/db/prisma.js";
import { getTrainingLoadHistoryTool } from "../src/ai/tools/coach/getTrainingLoadHistory.js";
import { getActivitiesByProfileTool } from "../src/ai/tools/coach/getActivitiesByProfile.js";
import { getPeakWeeksTool } from "../src/ai/tools/coach/getPeakWeeks.js";
import { getSimilarSessionsTool } from "../src/ai/tools/coach/getSimilarSessions.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

function section(title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(60));
}

function pretty(raw: string) {
  try {
    const data = JSON.parse(raw);
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch {
    console.log(raw);
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  // Find dev user
  const user = await prisma.user.findUnique({ where: { email: "terry.pasquet@proton.me" } });
  if (!user) {
    console.error("❌  User not found. Run `npm run db:setup-dev` first.");
    process.exit(1);
  }

  const cfg = { configurable: { userId: user.id } };

  const activityCount = await prisma.activity.count({ where: { userId: user.id } });
  const lapCount = await prisma.lap.count({
    where: { activity: { userId: user.id } },
  });
  const weekCount = await prisma.weeklyAggregate.count({ where: { userId: user.id } });

  console.log(`\n👤 User: ${user.email} (${user.id})`);
  console.log(`📊 Activities: ${activityCount} | Laps: ${lapCount} | WeeklyAggs: ${weekCount}`);

  // ── 1. Training Load History ───────────────────────────────────────────────
  section("1. Training Load History — last 16 weeks");
  const loadRaw = await getTrainingLoadHistoryTool.invoke({ weeks: 16 }, cfg);
  const loadData = pretty(loadRaw as string);
  if (Array.isArray(loadData) && loadData.length > 0) {
    const latest = loadData[loadData.length - 1];
    console.log(`\n→ Latest week: ${latest.week} | ${latest.distanceKm}km | TSS ${latest.tss} | CTL ${latest.ctl} | TSB ${latest.tsb}`);
  }

  // ── 2. Activities by Profile ───────────────────────────────────────────────
  section("2. Long Runs — last 365 days");
  const longRunsRaw = await getActivitiesByProfileTool.invoke(
    { sessionType: "long_run", lastDays: 365, limit: 5 },
    cfg
  );
  pretty(longRunsRaw as string);

  section("3. Races — all time (last 730 days)");
  const racesRaw = await getActivitiesByProfileTool.invoke(
    { sessionType: "race", lastDays: 730, limit: 10 },
    cfg
  );
  const racesData = pretty(racesRaw as string);
  if (Array.isArray(racesData)) {
    console.log(`\n→ ${racesData.length} race(s) found in last 730 days`);
  }

  section("4. Workouts (tempo/intervals) ≥ 10km — last 365 days");
  const workoutsRaw = await getActivitiesByProfileTool.invoke(
    { sessionType: "workout", minDistanceKm: 10, lastDays: 365, limit: 5 },
    cfg
  );
  pretty(workoutsRaw as string);

  // ── 3. Peak Weeks ──────────────────────────────────────────────────────────
  section("5. Top 5 Peak Weeks by TSS — last 365 days");
  const peakTssRaw = await getPeakWeeksTool.invoke(
    { rankBy: "tss", topN: 5, lastDays: 365 },
    cfg
  );
  const peakData = pretty(peakTssRaw as string);
  if (Array.isArray(peakData) && peakData.length > 0) {
    console.log("\n→ Load/fatigue correlation:");
    for (const w of peakData) {
      const fb = w.feedback;
      const fatigue = fb ? `fatigue ${fb.avgFatigue}/10` : "no feedback";
      const pain = fb?.hasPain ? ` | ⚠️ pain (${fb.avgPainIntensity}/10)` : "";
      console.log(`   ${w.week}: ${w.distanceKm}km | TSS ${w.tss} | ATL ${w.atl} → ${fatigue}${pain}`);
    }
  }

  section("6. Top 5 Peak Weeks by Distance — last 365 days");
  const peakDistRaw = await getPeakWeeksTool.invoke(
    { rankBy: "distance", topN: 5, lastDays: 365 },
    cfg
  );
  pretty(peakDistRaw as string);

  // ── 4. Similar Sessions (based on last activity) ───────────────────────────
  section("7. Similar Sessions — based on last activity");
  const lastActivity = await prisma.activity.findFirst({
    where:   { userId: user.id },
    orderBy: { startDate: "desc" },
    select:  { distanceM: true, avgPaceSecKm: true, startDate: true, type: true },
  });

  if (lastActivity) {
    const distKm = lastActivity.distanceM / 1000;
    const paceMin = Math.floor(lastActivity.avgPaceSecKm / 60);
    const paceSec = lastActivity.avgPaceSecKm % 60;
    console.log(`\nReference: ${distKm.toFixed(1)}km @ ${paceMin}:${String(Math.round(paceSec)).padStart(2, "0")}/km on ${lastActivity.startDate.toISOString().split("T")[0]}`);

    const similarRaw = await getSimilarSessionsTool.invoke(
      { targetPaceSecKm: lastActivity.avgPaceSecKm, distanceKm: distKm, tolerancePct: 15, limit: 5 },
      cfg
    );
    pretty(similarRaw as string);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
