import type { PrismaClient } from "../../generated/prisma/client.js";
import type { Redis } from "ioredis";
import type { AggregatedContext, ActivitySummary, WeeklyAggregateSummary } from "../../shared/types/domain.types.js";
import { ActivityRepository } from "../../infra/db/repositories/ActivityRepository.js";
import { AggregateRepository } from "../../infra/db/repositories/AggregateRepository.js";
import { FeedbackRepository } from "../../infra/db/repositories/FeedbackRepository.js";
import { GoalRepository } from "../../infra/db/repositories/GoalRepository.js";
import {
  recalculateLoadFromScratch,
  updateLoadMetrics,
  getFormStatus,
  computeMonotony,
  computeStrain,
} from "./load.js";
import { computeTSSWithHR, computeTSSFromPace } from "../activity/tss.js";

const CONTEXT_CACHE_TTL_SEC = 3600; // 1 hour
const THRESHOLD_PACE_SEC_KM = 270; // 4:30/km default threshold

function cacheKey(userId: string) {
  return `context:${userId}`;
}

export class AggregationService {
  private readonly activityRepo: ActivityRepository;
  private readonly aggregateRepo: AggregateRepository;
  private readonly feedbackRepo: FeedbackRepository;
  private readonly goalRepo: GoalRepository;

  constructor(
    private readonly db: PrismaClient,
    private readonly cache: Redis,
  ) {
    this.activityRepo = new ActivityRepository(db);
    this.aggregateRepo = new AggregateRepository(db);
    this.feedbackRepo = new FeedbackRepository(db);
    this.goalRepo = new GoalRepository(db);
  }

  /**
   * Full recalculation: recompute all weekly aggregates from raw activities.
   * Called after initial Strava sync or when recalculation is forced.
   * Invalidates the Redis cache afterwards.
   */
  async recalculateAll(userId: string): Promise<void> {
    const activities = await this.activityRepo.findRecent(userId, 1000);

    // Group activities by ISO week
    const weekMap = new Map<string, typeof activities>();
    for (const act of activities) {
      const weekKey = getWeekKey(act.startDate);
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
      weekMap.get(weekKey)!.push(act);
    }

    // Build daily TSS series (one entry per activity date)
    const dailyTssMap = new Map<string, number>();
    for (const act of activities) {
      const dayKey = act.startDate.toISOString().slice(0, 10);
      const tss =
        act.tss ??
        (act.avgHrBpm && act.maxHrBpm
          ? computeTSSWithHR(act.movingTimeSec, act.avgHrBpm, act.maxHrBpm)
          : computeTSSFromPace(act.movingTimeSec, act.avgPaceSecKm, THRESHOLD_PACE_SEC_KM));
      dailyTssMap.set(dayKey, (dailyTssMap.get(dayKey) ?? 0) + tss);
    }

    const dailyTss = Array.from(dailyTssMap.entries()).map(([d, tss]) => ({
      date: new Date(d),
      tss,
    }));

    const loadTimeline = recalculateLoadFromScratch(dailyTss);
    const loadByDay = new Map(
      loadTimeline.map((l) => [l.date.toISOString().slice(0, 10), l]),
    );

    // Delete existing aggregates and rebuild
    await this.aggregateRepo.deleteForUser(userId);

    for (const [weekKey, weekActivities] of weekMap.entries()) {
      const [year, weekNumber] = weekKey.split("-W").map(Number) as [number, number];
      const weekStart = getWeekStart(weekActivities[0]!.startDate);

      const totalDistanceM = weekActivities.reduce((s, a) => s + a.distanceM, 0);
      const totalDurationSec = weekActivities.reduce((s, a) => s + a.movingTimeSec, 0);
      const totalElevationM = weekActivities.reduce((s, a) => s + a.totalElevationGainM, 0);
      const sessionCount = weekActivities.length;
      const runCount = weekActivities.filter((a) =>
        ["Run", "TrailRun", "VirtualRun"].includes(a.type),
      ).length;

      const weekDailyTss = weekActivities.map((a) => {
        const dayKey = a.startDate.toISOString().slice(0, 10);
        return dailyTssMap.get(dayKey) ?? 0;
      });
      const totalTss = weekDailyTss.reduce((s, v) => s + v, 0);
      const monotony = computeMonotony(weekDailyTss);
      const strain = computeStrain(totalTss, monotony);

      // Use load from the last day of the week
      const lastDayKey = weekActivities
        .map((a) => a.startDate.toISOString().slice(0, 10))
        .sort()
        .at(-1)!;
      const load = loadByDay.get(lastDayKey) ?? { ctl: 0, atl: 0, tsb: 0 };

      const effortValues = weekActivities
        .map((a) => a.perceivedEffort)
        .filter((v): v is number => v !== null);
      const avgPerceivedEffort =
        effortValues.length > 0
          ? effortValues.reduce((s, v) => s + v, 0) / effortValues.length
          : null;

      await this.aggregateRepo.upsert({
        userId,
        weekStart,
        weekNumber,
        year,
        totalDistanceM,
        totalDurationSec,
        totalElevationM,
        sessionCount,
        runCount,
        totalTss,
        ctl: load.ctl,
        atl: load.atl,
        tsb: load.tsb,
        monotony,
        strain,
        avgPerceivedEffort,
      });
    }

    await this.invalidateCache(userId);
  }

  /**
   * Returns the full AggregatedContext for the AI layer.
   * Cached in Redis for 1 hour, invalidated after each sync.
   */
  async getContextWindow(userId: string): Promise<AggregatedContext> {
    const cached = await this.cache.get(cacheKey(userId));
    if (cached) {
      return JSON.parse(cached) as AggregatedContext;
    }

    const context = await this.buildContext(userId);
    await this.cache.set(cacheKey(userId), JSON.stringify(context), "EX", CONTEXT_CACHE_TTL_SEC);
    return context;
  }

  async invalidateCache(userId: string): Promise<void> {
    await this.cache.del(cacheKey(userId));
  }

  private async buildContext(userId: string): Promise<AggregatedContext> {
    const [recentActivities, weeklyAggs, feedbacks, goal] = await Promise.all([
      this.activityRepo.findRecent(userId, 10),
      this.aggregateRepo.findRecent(userId, 8),
      this.feedbackRepo.findRecent(userId, 7),
      this.goalRepo.findNextRace(userId),
    ]);

    // Latest load from most recent week
    const latestWeek = weeklyAggs[0];
    const currentCTL = latestWeek?.ctl ?? 0;
    const currentATL = latestWeek?.atl ?? 0;
    const currentTSB = latestWeek?.tsb ?? 0;
    const formStatus = getFormStatus(currentTSB);

    // Subjective averages (7 days)
    const avgFatigue = avg(feedbacks.map((f) => f.fatigue));
    const avgMood = avg(feedbacks.map((f) => f.mood));
    const avgSleep = avg(feedbacks.map((f) => f.sleepQuality));

    // Pain summary
    const latestPain = feedbacks.find((f) => f.painIntensity !== null);
    const painSummary = buildPainSummary(latestPain);
    const lastPainFeedback = latestPain?.notes ?? null;

    // Goal
    const goalContext = goal
      ? {
          description: formatGoal(goal),
          daysRemaining: Math.ceil(
            (goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        }
      : null;

    const activitySummaries: ActivitySummary[] = recentActivities.map((a) => ({
      id: a.id,
      date: a.startDate.toISOString().slice(0, 10),
      distanceM: a.distanceM,
      durationSec: a.movingTimeSec,
      avgPaceSecKm: a.avgPaceSecKm,
      tss: a.tss,
      perceivedEffort: a.perceivedEffort,
    }));

    const weeklySummaries: WeeklyAggregateSummary[] = weeklyAggs.map((w) => ({
      weekNumber: w.weekNumber,
      totalDistanceM: w.totalDistanceM,
      totalTss: w.totalTss,
      tsb: w.tsb,
    }));

    return {
      goal: goalContext,
      athleteLevel: "intermediate", // TODO: derive from VO2max / history
      estimatedVO2max: null,
      weeklyAggs: weeklySummaries,
      recentActivities: activitySummaries,
      currentCTL,
      currentATL,
      currentTSB,
      formStatus,
      avgFatigue,
      avgMood,
      avgSleep,
      painSummary,
      lastPainFeedback,
      currentPlanWeek: null, // TODO: training plan iteration
      totalPlanWeeks: null,
      currentPhase: null,
      plannedSessions: [],
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNumber}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function buildPainSummary(
  feedback: { painLocations: unknown; painIntensity: number | null; date: Date } | null | undefined,
): string | null {
  if (!feedback || !feedback.painIntensity) return null;
  const locations = feedback.painLocations as Array<{ location: string; side?: string }>;
  if (!Array.isArray(locations) || locations.length === 0) return null;
  const daysAgo = Math.ceil(
    (Date.now() - feedback.date.getTime()) / (1000 * 60 * 60 * 24),
  );
  const loc = locations[0]!;
  const side = loc.side ? ` ${loc.side}` : "";
  return `${loc.location}${side} (${daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`})`;
}

function formatGoal(goal: { type: string; targetValue: number; targetDate: Date }): string {
  return `${goal.type} — target ${goal.targetValue} by ${goal.targetDate.toISOString().slice(0, 10)}`;
}
