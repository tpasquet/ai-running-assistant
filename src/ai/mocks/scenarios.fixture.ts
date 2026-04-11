import type {
  AggregatedContext,
  ActivitySummary,
  WeeklyAggregateSummary,
  FormStatus,
  AthleteLevel,
} from "../../shared/types/domain.types";
import { getActivitiesForUser, getRecentActivities } from "./activities.fixture";
import { getAggregatesForUser, getLatestAggregate } from "./aggregates.fixture";
import { getFeedbackForUser, getRecentFeedback } from "./feedback.fixture";
import { getGoalForUser } from "./goals.fixture";

/**
 * Complete test scenarios with assembled contexts
 * Ready for AI agent consumption
 */

const today = new Date("2025-03-28");

function convertToActivitySummary(activity: any): ActivitySummary {
  return {
    id: activity.id,
    date: activity.startDate.toISOString().split("T")[0],
    distanceM: activity.distanceM,
    durationSec: activity.movingTimeSec,
    avgPaceSecKm: activity.avgPaceSecKm,
    tss: activity.tss,
    perceivedEffort: activity.perceivedEffort,
    laps: [], // mock scenarios have no lap detail
  };
}

function convertToWeeklySummary(agg: any): WeeklyAggregateSummary {
  return {
    weekNumber: agg.weekNumber,
    totalDistanceM: agg.totalDistanceM,
    totalTss: agg.totalTss,
    tsb: agg.tsb,
  };
}

function buildPainSummary(feedbacks: any[]): string | null {
  const recentPain = feedbacks
    .filter((f) => f.painLocations && f.painLocations.length > 0)
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  if (!recentPain) return null;

  const daysAgo = Math.floor(
    (today.getTime() - recentPain.date.getTime()) / (1000 * 60 * 60 * 24)
  );
  const location = recentPain.painLocations[0];
  const locationStr = location.side
    ? `${location.location} ${location.side}`
    : location.location;

  return `${locationStr} (${daysAgo} days ago)`;
}

function buildLastPainFeedback(feedbacks: any[]): string | null {
  const recentPain = feedbacks
    .filter((f) => f.painIntensity !== null && f.painIntensity > 0)
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  if (!recentPain) return null;

  return `Pain intensity ${recentPain.painIntensity}/10 - ${recentPain.notes || "No notes"}`;
}

function calculateAverageFatigue(feedbacks: any[]): number {
  if (feedbacks.length === 0) return 5;
  const sum = feedbacks.reduce((acc, f) => acc + f.fatigue, 0);
  return Math.round((sum / feedbacks.length) * 10) / 10;
}

function calculateAverageMood(feedbacks: any[]): number {
  if (feedbacks.length === 0) return 5;
  const sum = feedbacks.reduce((acc, f) => acc + f.mood, 0);
  return Math.round((sum / feedbacks.length) * 10) / 10;
}

function calculateAverageSleep(feedbacks: any[]): number {
  if (feedbacks.length === 0) return 5;
  const sum = feedbacks.reduce((acc, f) => acc + f.sleepQuality, 0);
  return Math.round((sum / feedbacks.length) * 10) / 10;
}

function determineFormStatus(tsb: number): FormStatus {
  if (tsb < -10) return "overreached";
  if (tsb < 0) return "tired";
  if (tsb < 10) return "optimal";
  return "fresh";
}

// ============================================================================
// SCENARIO BUILDERS
// ============================================================================

function buildContext(userId: string, athleteLevel: AthleteLevel): AggregatedContext {
  const activities = getActivitiesForUser(userId);
  const recentActivities = getRecentActivities(userId, 10).map(convertToActivitySummary);
  const aggregates = getAggregatesForUser(userId);
  const weeklyAggs = aggregates.map(convertToWeeklySummary);
  const latestAgg = getLatestAggregate(userId);
  const feedbacks = getRecentFeedback(userId, 7);
  const goal = getGoalForUser(userId);

  const currentCTL = latestAgg?.ctl ?? 0;
  const currentATL = latestAgg?.atl ?? 0;
  const currentTSB = latestAgg?.tsb ?? 0;
  const formStatus = determineFormStatus(currentTSB);

  const avgFatigue = calculateAverageFatigue(feedbacks);
  const avgMood = calculateAverageMood(feedbacks);
  const avgSleep = calculateAverageSleep(feedbacks);
  const painSummary = buildPainSummary(feedbacks);
  const lastPainFeedback = buildLastPainFeedback(feedbacks);

  let goalDescription = null;
  let daysRemaining = 0;

  if (goal) {
    daysRemaining = Math.floor(
      (goal.targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    switch (goal.type) {
      case "SUB_X_10K":
        goalDescription = `Sub-${formatTime(goal.targetValue)} 10K`;
        break;
      case "SUB_X_HALF":
        goalDescription = `Sub-${formatTime(goal.targetValue)} half marathon`;
        break;
      case "FINISH_10K":
        goalDescription = "Finish 10K";
        break;
      case "WEEKLY_DISTANCE":
        goalDescription = `${goal.targetValue / 1000}km per week`;
        break;
      default:
        goalDescription = goal.context || "Custom goal";
    }
  }

  return {
    goal: goalDescription
      ? {
          description: goalDescription,
          daysRemaining,
        }
      : null,
    athleteLevel,
    estimatedVO2max: null,
    weeklyAggs,
    recentActivities,
    currentCTL,
    currentATL,
    currentTSB,
    formStatus,
    avgFatigue,
    avgMood,
    avgSleep,
    painSummary,
    lastPainFeedback,
    currentPlanWeek: null,
    totalPlanWeeks: null,
    currentPhase: null,
    plannedSessions: [],
  };
}

// ============================================================================
// SCENARIO EXPORTS
// ============================================================================

export const SCENARIO_OVERREACHED: AggregatedContext = buildContext(
  "mock-user-overreached",
  "intermediate"
);

export const SCENARIO_FRESH: AggregatedContext = buildContext(
  "mock-user-fresh",
  "intermediate"
);

export const SCENARIO_KNEE_PAIN: AggregatedContext = buildContext(
  "mock-user-knee-pain",
  "intermediate"
);

export const SCENARIO_PRE_COMPETITION: AggregatedContext = buildContext(
  "mock-user-competition",
  "advanced"
);

export const SCENARIO_BURNOUT: AggregatedContext = buildContext(
  "mock-user-burnout",
  "beginner"
);

// ============================================================================
// SCENARIO CATALOG
// ============================================================================

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  context: AggregatedContext;
  expectedBehavior: string[];
}

export const ALL_SCENARIOS: ScenarioDefinition[] = [
  {
    id: "overreached",
    name: "Overreached Athlete",
    description:
      "Intermediate runner with progressive overload leading to overtraining (TSB -25)",
    context: SCENARIO_OVERREACHED,
    expectedBehavior: [
      "Coach should recommend immediate rest or deload week",
      "Physio should flag high injury risk from accumulated fatigue",
      "Mental coach should address motivation/burnout concerns",
      "All agents should coordinate to prevent further overtraining",
    ],
  },
  {
    id: "fresh",
    name: "Fresh Athlete",
    description: "Well-recovered intermediate runner ready for quality work (TSB +8)",
    context: SCENARIO_FRESH,
    expectedBehavior: [
      "Coach should suggest quality session or threshold work",
      "Physio should give green light for hard training",
      "Mental coach should reinforce positive momentum",
      "System should recommend intensity increase",
    ],
  },
  {
    id: "knee-pain",
    name: "Knee Pain Recovery",
    description: "Intermediate runner returning from knee injury, cautious progression",
    context: SCENARIO_KNEE_PAIN,
    expectedBehavior: [
      "Physio should be primary decision-maker",
      "Coach should recommend conservative load increases",
      "Mental coach should address injury-related anxiety",
      "System should prioritize injury prevention over performance",
    ],
  },
  {
    id: "pre-competition",
    name: "Pre-Competition Taper",
    description: "Advanced runner 7 days before race, entering taper (TSB +37)",
    context: SCENARIO_PRE_COMPETITION,
    expectedBehavior: [
      "Coach should recommend light maintenance work only",
      "Physio should focus on race-day readiness checks",
      "Mental coach should build race-day confidence",
      "System should avoid any risky training suggestions",
    ],
  },
  {
    id: "burnout",
    name: "Burnout & Low Motivation",
    description: "Beginner with inconsistent training and declining motivation",
    context: SCENARIO_BURNOUT,
    expectedBehavior: [
      "Mental coach should be primary focus",
      "Coach should recommend enjoyable, low-pressure sessions",
      "System should focus on rebuilding habit and joy, not performance",
      "Avoid aggressive goal-setting or intensity prescriptions",
    ],
  },
];

// ============================================================================
// HELPER TO GET SCENARIO BY ID
// ============================================================================

export function getScenarioById(id: string): ScenarioDefinition | null {
  return ALL_SCENARIOS.find((s) => s.id === id) || null;
}

export function getContextByUserId(userId: string): AggregatedContext | null {
  switch (userId) {
    case "mock-user-overreached":
      return SCENARIO_OVERREACHED;
    case "mock-user-fresh":
      return SCENARIO_FRESH;
    case "mock-user-knee-pain":
      return SCENARIO_KNEE_PAIN;
    case "mock-user-competition":
      return SCENARIO_PRE_COMPETITION;
    case "mock-user-burnout":
      return SCENARIO_BURNOUT;
    default:
      return null;
  }
}
