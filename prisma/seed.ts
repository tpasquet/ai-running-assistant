/**
 * Seed script — 4 realistic athlete profiles for testing the AI layer
 *
 * Run: npm run db:seed
 *
 * Profiles:
 *   seed-overreached  — 12 weeks progressive, overtrained, knee pain, marathon in 45d
 *   seed-taper        — 16 weeks training, currently tapering, marathon in 14d
 *   seed-returning    — returning from 8-week Achilles injury, 10K in 60d
 *   seed-consistent   — 6 months steady running, good form, wants 5K PR
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { Redis } from "ioredis";
import { AggregationService } from "../src/domain/aggregation/AggregationService.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
}

function pace(minPerKm: number): number {
  return Math.round(minPerKm * 60);
}

let stravaIdCounter = 9_000_000;
function nextStravaId() { return stravaIdCounter++; }

const userStravaIds: Record<string, number> = {
  "seed-overreached": 8_800_001,
  "seed-taper":       8_800_002,
  "seed-returning":   8_800_003,
  "seed-consistent":  8_800_004,
};

interface ActivitySeed {
  daysAgo: number;
  distanceKm: number;
  paceMinKm: number;
  durationMin?: number;
  avgHr?: number;
  maxHr?: number;
  elevationM?: number;
  rpe?: number;
  type?: string;
}

async function createActivities(userId: string, activities: ActivitySeed[]) {
  for (const a of activities) {
    const distanceM = a.distanceKm * 1000;
    const avgPaceSecKm = pace(a.paceMinKm);
    const movingTimeSec = a.durationMin
      ? a.durationMin * 60
      : Math.round((distanceM / 1000) * avgPaceSecKm);

    const avgSpeedMS = distanceM / movingTimeSec;
    await prisma.activity.create({
      data: {
        id: `seed-${userId}-${nextStravaId()}`,
        userId,
        stravaId: BigInt(nextStravaId()),
        type: a.type ?? "Run",
        startDate: daysAgo(a.daysAgo),
        distanceM,
        movingTimeSec,
        elapsedTimeSec: Math.round(movingTimeSec * 1.05),
        totalElevationGainM: a.elevationM ?? 20,
        averageSpeedMS: avgSpeedMS,
        maxSpeedMS: avgSpeedMS * 1.15,
        avgPaceSecKm,
        avgHrBpm: a.avgHr ?? null,
        maxHrBpm: a.maxHr ?? null,
        perceivedEffort: a.rpe ?? null,
      },
    });
  }
}

interface FeedbackSeed {
  daysAgo: number;
  fatigue: number;
  soreness: number;
  mood: number;
  sleep: number;
  pain?: { location: string; side?: string; intensity: number; note?: string };
}

async function createFeedback(userId: string, feedbacks: FeedbackSeed[]) {
  for (const f of feedbacks) {
    await prisma.dailyFeedback.create({
      data: {
        userId,
        date: daysAgo(f.daysAgo),
        fatigue: f.fatigue,
        muscleSoreness: f.soreness,
        mood: f.mood,
        sleepQuality: f.sleep,
        painLocations: f.pain
          ? [{ location: f.pain.location, side: f.pain.side }]
          : [],
        painIntensity: f.pain?.intensity ?? null,
        notes: f.pain?.note ?? null,
      },
    });
  }
}

async function upsertUser(id: string, name: string) {
  await prisma.user.upsert({
    where: { id },
    update: { username: name },
    create: {
      id,
      username: name,
      stravaId: userStravaIds[id]!,
    },
  });
}

// ─── Scenario 1: Overreached ──────────────────────────────────────────────────

async function seedOverreached() {
  const userId = "seed-overreached";
  await upsertUser(userId, "Alex (Overreached)");

  // 12 weeks of progressive training — increasing volume each block
  const activities: ActivitySeed[] = [
    // Block 1 — weeks 12-10 (base, ~40km/week)
    { daysAgo: 84, distanceKm: 8, paceMinKm: 5.8, avgHr: 142, rpe: 5 },
    { daysAgo: 82, distanceKm: 12, paceMinKm: 6.0, avgHr: 138, rpe: 5 },
    { daysAgo: 80, distanceKm: 6, paceMinKm: 5.5, avgHr: 148, rpe: 6 },
    { daysAgo: 79, distanceKm: 16, paceMinKm: 6.1, avgHr: 140, rpe: 6 },
    { daysAgo: 77, distanceKm: 8, paceMinKm: 5.9, avgHr: 143, rpe: 5 },
    { daysAgo: 75, distanceKm: 10, paceMinKm: 6.0, avgHr: 139, rpe: 5 },
    { daysAgo: 73, distanceKm: 18, paceMinKm: 6.2, avgHr: 141, rpe: 6 },
    { daysAgo: 71, distanceKm: 8, paceMinKm: 5.8, avgHr: 144, rpe: 5 },
    { daysAgo: 70, distanceKm: 10, paceMinKm: 5.5, avgHr: 150, rpe: 7 },

    // Block 2 — weeks 9-7 (~55km/week, adding tempo)
    { daysAgo: 67, distanceKm: 10, paceMinKm: 5.7, avgHr: 145, rpe: 6 },
    { daysAgo: 65, distanceKm: 14, paceMinKm: 5.0, avgHr: 162, maxHr: 178, rpe: 7 }, // tempo
    { daysAgo: 63, distanceKm: 8, paceMinKm: 6.0, avgHr: 138, rpe: 5 },
    { daysAgo: 62, distanceKm: 22, paceMinKm: 6.0, avgHr: 143, rpe: 7 },
    { daysAgo: 60, distanceKm: 8, paceMinKm: 5.8, avgHr: 146, rpe: 6 },
    { daysAgo: 58, distanceKm: 12, paceMinKm: 5.0, avgHr: 163, maxHr: 180, rpe: 8 },
    { daysAgo: 56, distanceKm: 8, paceMinKm: 6.1, avgHr: 140, rpe: 5 },
    { daysAgo: 55, distanceKm: 24, paceMinKm: 6.1, avgHr: 144, rpe: 7 },
    { daysAgo: 53, distanceKm: 10, paceMinKm: 5.6, avgHr: 149, rpe: 6 },

    // Block 3 — weeks 6-4 (~65km/week, overload building)
    { daysAgo: 50, distanceKm: 10, paceMinKm: 5.5, avgHr: 152, rpe: 7 },
    { daysAgo: 48, distanceKm: 15, paceMinKm: 4.8, avgHr: 168, maxHr: 185, rpe: 8 },
    { daysAgo: 46, distanceKm: 10, paceMinKm: 5.9, avgHr: 147, rpe: 6 },
    { daysAgo: 45, distanceKm: 26, paceMinKm: 6.0, avgHr: 148, rpe: 8 },
    { daysAgo: 43, distanceKm: 10, paceMinKm: 5.7, avgHr: 151, rpe: 7 },
    { daysAgo: 41, distanceKm: 14, paceMinKm: 4.9, avgHr: 165, maxHr: 182, rpe: 8 },
    { daysAgo: 39, distanceKm: 10, paceMinKm: 6.0, avgHr: 149, rpe: 6 },
    { daysAgo: 38, distanceKm: 28, paceMinKm: 6.2, avgHr: 148, rpe: 8 },
    { daysAgo: 36, distanceKm: 8, paceMinKm: 5.8, avgHr: 153, rpe: 7 },
    { daysAgo: 34, distanceKm: 12, paceMinKm: 5.5, avgHr: 156, rpe: 7 },

    // Block 4 — weeks 3-1 (~75km/week, clearly overreaching)
    { daysAgo: 31, distanceKm: 12, paceMinKm: 5.4, avgHr: 158, rpe: 8 },
    { daysAgo: 29, distanceKm: 16, paceMinKm: 4.8, avgHr: 170, maxHr: 188, rpe: 9 },
    { daysAgo: 27, distanceKm: 10, paceMinKm: 5.8, avgHr: 155, rpe: 7 },
    { daysAgo: 26, distanceKm: 30, paceMinKm: 6.1, avgHr: 152, rpe: 9 },
    { daysAgo: 24, distanceKm: 10, paceMinKm: 5.5, avgHr: 160, rpe: 8 },
    { daysAgo: 22, distanceKm: 14, paceMinKm: 5.0, avgHr: 167, maxHr: 184, rpe: 9 },
    { daysAgo: 20, distanceKm: 10, paceMinKm: 5.9, avgHr: 158, rpe: 7 },
    { daysAgo: 19, distanceKm: 32, paceMinKm: 6.2, avgHr: 153, rpe: 9 }, // longest run
    { daysAgo: 17, distanceKm: 10, paceMinKm: 5.7, avgHr: 162, rpe: 8 },
    { daysAgo: 15, distanceKm: 14, paceMinKm: 4.9, avgHr: 169, maxHr: 186, rpe: 9 },
    { daysAgo: 13, distanceKm: 8, paceMinKm: 6.0, avgHr: 163, rpe: 8 },
    { daysAgo: 12, distanceKm: 22, paceMinKm: 6.3, avgHr: 157, rpe: 8 }, // pace getting worse
    { daysAgo: 10, distanceKm: 10, paceMinKm: 5.8, avgHr: 165, rpe: 8 },
    { daysAgo: 8, distanceKm: 12, paceMinKm: 5.1, avgHr: 171, maxHr: 189, rpe: 9 },
    { daysAgo: 6, distanceKm: 8, paceMinKm: 6.2, avgHr: 164, rpe: 7 }, // fatigue showing
    { daysAgo: 4, distanceKm: 16, paceMinKm: 6.5, avgHr: 160, rpe: 8 }, // very slow
    { daysAgo: 2, distanceKm: 8, paceMinKm: 6.3, avgHr: 166, rpe: 8 },
  ];

  await createActivities(userId, activities);

  // Feedback: escalating fatigue + knee pain in last 2 weeks
  await createFeedback(userId, [
    { daysAgo: 21, fatigue: 6, soreness: 5, mood: 7, sleep: 7 },
    { daysAgo: 20, fatigue: 6, soreness: 6, mood: 6, sleep: 6 },
    { daysAgo: 19, fatigue: 7, soreness: 7, mood: 6, sleep: 6 },
    { daysAgo: 18, fatigue: 8, soreness: 7, mood: 5, sleep: 5 },
    { daysAgo: 17, fatigue: 7, soreness: 7, mood: 5, sleep: 5 },
    { daysAgo: 16, fatigue: 8, soreness: 8, mood: 4, sleep: 5 },
    { daysAgo: 15, fatigue: 9, soreness: 8, mood: 4, sleep: 4, pain: { location: "knee", side: "left", intensity: 4, note: "Sharp pain after long run, eases with warmup" } },
    { daysAgo: 14, fatigue: 9, soreness: 9, mood: 3, sleep: 4, pain: { location: "knee", side: "left", intensity: 5, note: "Pain during run, had to slow down" } },
    { daysAgo: 13, fatigue: 8, soreness: 8, mood: 4, sleep: 5 },
    { daysAgo: 12, fatigue: 9, soreness: 8, mood: 4, sleep: 4, pain: { location: "knee", side: "left", intensity: 4 } },
    { daysAgo: 11, fatigue: 9, soreness: 9, mood: 3, sleep: 4, pain: { location: "knee", side: "left", intensity: 6, note: "Worst it's been. Pain during and after run." } },
    { daysAgo: 10, fatigue: 8, soreness: 8, mood: 4, sleep: 5 },
    { daysAgo: 9, fatigue: 9, soreness: 9, mood: 3, sleep: 4, pain: { location: "knee", side: "left", intensity: 5 } },
    { daysAgo: 8, fatigue: 9, soreness: 8, mood: 3, sleep: 4 },
    { daysAgo: 7, fatigue: 9, soreness: 9, mood: 3, sleep: 4, pain: { location: "knee", side: "left", intensity: 5 } },
    { daysAgo: 6, fatigue: 8, soreness: 7, mood: 4, sleep: 5 },
    { daysAgo: 5, fatigue: 9, soreness: 8, mood: 3, sleep: 3 },
    { daysAgo: 4, fatigue: 9, soreness: 9, mood: 3, sleep: 4, pain: { location: "knee", side: "left", intensity: 6, note: "Very worried about the marathon. Knee pain won't go away." } },
    { daysAgo: 3, fatigue: 8, soreness: 8, mood: 3, sleep: 4 },
    { daysAgo: 2, fatigue: 9, soreness: 8, mood: 3, sleep: 4, pain: { location: "knee", side: "left", intensity: 5 } },
    { daysAgo: 1, fatigue: 9, soreness: 9, mood: 2, sleep: 3, pain: { location: "knee", side: "left", intensity: 6, note: "Can barely walk down stairs this morning." } },
  ]);

  await prisma.goal.create({
    data: {
      userId,
      type: "SUB_X_MARATHON",
      targetValue: 225, // 3:45
      targetDate: daysAgo(-45), // in 45 days
      context: "First marathon. Trained really hard. Really want sub-3:45.",
    },
  });

  const svc = new AggregationService(prisma, redis);
  await svc.recalculateAll(userId);
  console.log(`✅ seed-overreached: 47 activities, 21 feedbacks, knee pain, marathon -45d`);
}

// ─── Scenario 2: Taper / Peak Form ───────────────────────────────────────────

async function seedTaper() {
  const userId = "seed-taper";
  await upsertUser(userId, "Marie (Peak Form — Taper)");

  const activities: ActivitySeed[] = [
    // Solid 16-week buildup (weeks 16-5 shown at reduced density for brevity)
    { daysAgo: 112, distanceKm: 10, paceMinKm: 5.5, avgHr: 143, rpe: 5 },
    { daysAgo: 110, distanceKm: 14, paceMinKm: 5.8, avgHr: 140, rpe: 5 },
    { daysAgo: 108, distanceKm: 20, paceMinKm: 5.9, avgHr: 142, rpe: 6 },
    { daysAgo: 105, distanceKm: 10, paceMinKm: 5.4, avgHr: 146, rpe: 6 },
    { daysAgo: 103, distanceKm: 12, paceMinKm: 5.0, avgHr: 162, maxHr: 176, rpe: 7 },
    { daysAgo: 101, distanceKm: 22, paceMinKm: 5.8, avgHr: 144, rpe: 7 },
    { daysAgo: 98, distanceKm: 10, paceMinKm: 5.4, avgHr: 147, rpe: 6 },
    { daysAgo: 96, distanceKm: 14, paceMinKm: 4.9, avgHr: 165, maxHr: 180, rpe: 8 },
    { daysAgo: 94, distanceKm: 24, paceMinKm: 5.7, avgHr: 145, rpe: 7 },
    { daysAgo: 91, distanceKm: 10, paceMinKm: 5.3, avgHr: 149, rpe: 6 },
    { daysAgo: 89, distanceKm: 16, paceMinKm: 4.8, avgHr: 167, maxHr: 183, rpe: 8 },
    { daysAgo: 87, distanceKm: 26, paceMinKm: 5.6, avgHr: 147, rpe: 8 },
    { daysAgo: 84, distanceKm: 10, paceMinKm: 5.3, avgHr: 150, rpe: 7 },
    { daysAgo: 82, distanceKm: 16, paceMinKm: 4.8, avgHr: 168, maxHr: 184, rpe: 8 },
    { daysAgo: 80, distanceKm: 28, paceMinKm: 5.6, avgHr: 148, rpe: 8 },
    { daysAgo: 77, distanceKm: 10, paceMinKm: 5.2, avgHr: 152, rpe: 7 },
    { daysAgo: 75, distanceKm: 14, paceMinKm: 4.75, avgHr: 170, maxHr: 186, rpe: 9 },
    { daysAgo: 73, distanceKm: 30, paceMinKm: 5.55, avgHr: 149, rpe: 9 }, // peak long run
    { daysAgo: 70, distanceKm: 10, paceMinKm: 5.5, avgHr: 148, rpe: 6 },
    { daysAgo: 68, distanceKm: 16, paceMinKm: 4.75, avgHr: 169, maxHr: 185, rpe: 8 },
    { daysAgo: 66, distanceKm: 26, paceMinKm: 5.6, avgHr: 147, rpe: 8 },
    // Taper starts (week 5 from race day = 3 weeks ago)
    { daysAgo: 21, distanceKm: 10, paceMinKm: 5.3, avgHr: 148, rpe: 6 },
    { daysAgo: 19, distanceKm: 12, paceMinKm: 4.8, avgHr: 163, maxHr: 178, rpe: 7 },
    { daysAgo: 17, distanceKm: 18, paceMinKm: 5.6, avgHr: 144, rpe: 6 },
    { daysAgo: 14, distanceKm: 8, paceMinKm: 5.3, avgHr: 146, rpe: 5 },
    { daysAgo: 12, distanceKm: 10, paceMinKm: 4.8, avgHr: 160, maxHr: 175, rpe: 6 },
    { daysAgo: 10, distanceKm: 14, paceMinKm: 5.5, avgHr: 143, rpe: 5 },
    { daysAgo: 7, distanceKm: 8, paceMinKm: 5.2, avgHr: 145, rpe: 5 },
    { daysAgo: 5, distanceKm: 6, paceMinKm: 4.85, avgHr: 158, maxHr: 172, rpe: 6 },
    { daysAgo: 3, distanceKm: 8, paceMinKm: 5.5, avgHr: 142, rpe: 4 },
    { daysAgo: 1, distanceKm: 4, paceMinKm: 5.6, avgHr: 138, rpe: 3 }, // easy shakeout
  ];

  await createActivities(userId, activities);

  await createFeedback(userId, [
    { daysAgo: 14, fatigue: 5, soreness: 4, mood: 8, sleep: 8 },
    { daysAgo: 13, fatigue: 4, soreness: 4, mood: 8, sleep: 8 },
    { daysAgo: 12, fatigue: 5, soreness: 4, mood: 8, sleep: 7 },
    { daysAgo: 11, fatigue: 4, soreness: 3, mood: 9, sleep: 8 },
    { daysAgo: 10, fatigue: 4, soreness: 3, mood: 8, sleep: 8 },
    { daysAgo: 9, fatigue: 3, soreness: 3, mood: 9, sleep: 9 },
    { daysAgo: 8, fatigue: 3, soreness: 2, mood: 9, sleep: 8 },
    { daysAgo: 7, fatigue: 3, soreness: 2, mood: 9, sleep: 9 },
    { daysAgo: 6, fatigue: 2, soreness: 2, mood: 9, sleep: 9 },
    { daysAgo: 5, fatigue: 3, soreness: 2, mood: 9, sleep: 8 },
    { daysAgo: 4, fatigue: 2, soreness: 2, mood: 9, sleep: 9 },
    { daysAgo: 3, fatigue: 2, soreness: 1, mood: 9, sleep: 9 },
    { daysAgo: 2, fatigue: 2, soreness: 1, mood: 9, sleep: 9 },
    { daysAgo: 1, fatigue: 2, soreness: 1, mood: 9, sleep: 9 },
  ]);

  await prisma.goal.create({
    data: {
      userId,
      type: "SUB_X_MARATHON",
      targetValue: 225, // sub-3:45
      targetDate: daysAgo(-14),
      context: "Third marathon. Best shape of my life. Targeting sub-3:45.",
    },
  });

  const svc = new AggregationService(prisma, redis);
  await svc.recalculateAll(userId);
  console.log(`✅ seed-taper: 31 activities, 14 feedbacks, peak form, marathon -14d`);
}

// ─── Scenario 3: Returning from injury ───────────────────────────────────────

async function seedReturning() {
  const userId = "seed-returning";
  await upsertUser(userId, "Thomas (Returning from Achilles injury)");

  // 8 weeks off, then 3 weeks of very easy comeback running
  const activities: ActivitySeed[] = [
    // Pre-injury (5 months ago — brief context)
    { daysAgo: 130, distanceKm: 10, paceMinKm: 5.2, avgHr: 148, rpe: 6 },
    { daysAgo: 128, distanceKm: 14, paceMinKm: 5.4, avgHr: 145, rpe: 6 },
    { daysAgo: 125, distanceKm: 8, paceMinKm: 5.0, avgHr: 158, maxHr: 172, rpe: 7 },
    { daysAgo: 122, distanceKm: 18, paceMinKm: 5.6, avgHr: 143, rpe: 7 },
    // Last runs before injury (increasing Achilles pain)
    { daysAgo: 70, distanceKm: 10, paceMinKm: 5.5, avgHr: 150, rpe: 6 },
    { daysAgo: 67, distanceKm: 12, paceMinKm: 5.3, avgHr: 153, rpe: 7 },
    { daysAgo: 64, distanceKm: 8, paceMinKm: 5.7, avgHr: 151, rpe: 7, },
    // 8-week gap (injury)
    // Comeback — very cautious (3 weeks ago)
    { daysAgo: 21, distanceKm: 4, paceMinKm: 6.5, avgHr: 135, rpe: 3 },
    { daysAgo: 19, distanceKm: 5, paceMinKm: 6.3, avgHr: 138, rpe: 4 },
    { daysAgo: 16, distanceKm: 4, paceMinKm: 6.5, avgHr: 136, rpe: 3 },
    { daysAgo: 14, distanceKm: 6, paceMinKm: 6.2, avgHr: 140, rpe: 4 },
    { daysAgo: 12, distanceKm: 5, paceMinKm: 6.4, avgHr: 137, rpe: 3 },
    { daysAgo: 9, distanceKm: 6, paceMinKm: 6.2, avgHr: 141, rpe: 4 },
    { daysAgo: 7, distanceKm: 7, paceMinKm: 6.1, avgHr: 142, rpe: 4 },
    { daysAgo: 5, distanceKm: 5, paceMinKm: 6.3, avgHr: 139, rpe: 3 },
    { daysAgo: 3, distanceKm: 8, paceMinKm: 6.0, avgHr: 143, rpe: 4 },
  ];

  await createActivities(userId, activities);

  await createFeedback(userId, [
    // During comeback — cautious, monitoring Achilles
    { daysAgo: 21, fatigue: 3, soreness: 4, mood: 7, sleep: 7, pain: { location: "achilles", side: "right", intensity: 2, note: "Mild stiffness morning after first run back" } },
    { daysAgo: 20, fatigue: 2, soreness: 3, mood: 7, sleep: 8 },
    { daysAgo: 19, fatigue: 3, soreness: 3, mood: 8, sleep: 7 },
    { daysAgo: 18, fatigue: 2, soreness: 3, mood: 8, sleep: 8 },
    { daysAgo: 17, fatigue: 2, soreness: 2, mood: 8, sleep: 8 },
    { daysAgo: 16, fatigue: 3, soreness: 4, mood: 7, sleep: 7, pain: { location: "achilles", side: "right", intensity: 2, note: "Slight twinge after run, went away after 10 min" } },
    { daysAgo: 15, fatigue: 2, soreness: 2, mood: 8, sleep: 8 },
    { daysAgo: 14, fatigue: 3, soreness: 3, mood: 8, sleep: 7 },
    { daysAgo: 13, fatigue: 2, soreness: 2, mood: 8, sleep: 8 },
    { daysAgo: 12, fatigue: 3, soreness: 3, mood: 7, sleep: 7 },
    { daysAgo: 11, fatigue: 2, soreness: 2, mood: 8, sleep: 8 },
    { daysAgo: 10, fatigue: 2, soreness: 2, mood: 8, sleep: 8 },
    { daysAgo: 9, fatigue: 3, soreness: 3, mood: 8, sleep: 7 },
    { daysAgo: 8, fatigue: 2, soreness: 2, mood: 9, sleep: 8 },
    { daysAgo: 7, fatigue: 3, soreness: 3, mood: 8, sleep: 8 },
    { daysAgo: 6, fatigue: 2, soreness: 2, mood: 8, sleep: 8 },
    { daysAgo: 5, fatigue: 2, soreness: 2, mood: 9, sleep: 9 },
    { daysAgo: 4, fatigue: 2, soreness: 2, mood: 9, sleep: 8 },
    { daysAgo: 3, fatigue: 3, soreness: 3, mood: 8, sleep: 8 },
    { daysAgo: 2, fatigue: 2, soreness: 2, mood: 9, sleep: 8 },
    { daysAgo: 1, fatigue: 2, soreness: 2, mood: 9, sleep: 9 },
  ]);

  await prisma.goal.create({
    data: {
      userId,
      type: "FINISH_10K",
      targetValue: 10,
      targetDate: daysAgo(-60),
      context: "Just want to finish a 10K pain-free after Achilles injury. Patient comeback.",
    },
  });

  const svc = new AggregationService(prisma, redis);
  await svc.recalculateAll(userId);
  console.log(`✅ seed-returning: 16 comeback activities, 21 feedbacks, Achilles history, 10K -60d`);
}

// ─── Scenario 4: Consistent intermediate ─────────────────────────────────────

async function seedConsistent() {
  const userId = "seed-consistent";
  await upsertUser(userId, "Sophie (Consistent — 5K PR attempt)");

  const activities: ActivitySeed[] = [];
  // 24 weeks of regular 3x/week training, consistent ~45km/week
  for (let week = 24; week >= 1; week--) {
    const base = week * 7;
    const vol = 42 + (24 - week) * 0.5; // slowly increasing
    const paceBase = 5.7 - (24 - week) * 0.01; // slowly getting faster
    activities.push(
      { daysAgo: base + 1, distanceKm: 8, paceMinKm: paceBase + 0.3, avgHr: 140, rpe: 5 },
      { daysAgo: base - 1, distanceKm: vol * 0.35, paceMinKm: paceBase - 0.2, avgHr: 158, maxHr: 172, rpe: 7 },
      { daysAgo: base - 3, distanceKm: vol * 0.5, paceMinKm: paceBase + 0.4, avgHr: 143, rpe: 6 },
    );
  }

  await createActivities(userId, activities);

  // Steady good feedback
  for (let d = 14; d >= 1; d--) {
    await prisma.dailyFeedback.create({
      data: {
        userId,
        date: daysAgo(d),
        fatigue: 4 + Math.round(Math.random()),
        muscleSoreness: 3 + Math.round(Math.random()),
        mood: 7 + Math.round(Math.random()),
        sleepQuality: 7 + Math.round(Math.random()),
        painLocations: [],
        painIntensity: null,
        notes: null,
      },
    });
  }

  await prisma.goal.create({
    data: {
      userId,
      type: "SUB_X_5K",
      targetValue: 25, // sub-25min
      targetDate: daysAgo(-30),
      context: "Running consistently for 6 months. Ready to race my first 5K and target sub-25min.",
    },
  });

  const svc = new AggregationService(prisma, redis);
  await svc.recalculateAll(userId);
  console.log(`✅ seed-consistent: 72 activities, 14 feedbacks, good form, 5K PR -30d`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding RunCoach AI test scenarios...\n");

  // Clean existing seed data
  await prisma.goal.deleteMany({ where: { userId: { startsWith: "seed-" } } });
  await prisma.dailyFeedback.deleteMany({ where: { userId: { startsWith: "seed-" } } });
  await prisma.weeklyAggregate.deleteMany({ where: { userId: { startsWith: "seed-" } } });
  await prisma.activity.deleteMany({ where: { userId: { startsWith: "seed-" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "seed-" } } });

  await seedOverreached();
  await seedTaper();
  await seedReturning();
  await seedConsistent();

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed complete! Test with:

  # Get a JWT for each profile:
  curl -X POST http://localhost:3000/dev/token \\
    -H "Content-Type: application/json" \\
    -d '{"userId": "seed-overreached"}'

  # Available user IDs:
  #   seed-overreached  — overtrained, knee pain, marathon in 45d
  #   seed-taper        — peak form, taper week, marathon in 14d
  #   seed-returning    — comeback from Achilles, 10K in 60d
  #   seed-consistent   — 6mo steady base, 5K PR in 30d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });
