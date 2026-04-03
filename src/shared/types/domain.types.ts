// Domain types for RunCoach AI
// These types represent the core business entities

export type ActivityType = "Run" | "TrailRun" | "VirtualRun" | "Walk" | "Other";

export type GoalType =
  | "SUB_X_5K"
  | "SUB_X_10K"
  | "SUB_X_HALF"
  | "SUB_X_MARATHON"
  | "FINISH_5K"
  | "FINISH_10K"
  | "FINISH_HALF"
  | "FINISH_MARATHON"
  | "WEEKLY_DISTANCE"
  | "CUSTOM";

export type FormStatus = "fresh" | "optimal" | "tired" | "overreached";

export type AthleteLevel = "beginner" | "intermediate" | "advanced";

export type BodyLocation =
  | "knee"
  | "ankle"
  | "achilles"
  | "plantar_fascia"
  | "shin"
  | "calf"
  | "hamstring"
  | "quad"
  | "hip"
  | "it_band"
  | "lower_back"
  | "foot"
  | "other";

export type BodySide = "left" | "right" | "both";

export type PainType = "sharp" | "dull" | "burning" | "tightness";

export interface Activity {
  id: string;
  userId: string;
  stravaId: bigint;
  type: ActivityType;
  startDate: Date;

  // Core metrics from Strava
  distanceM: number;           // distance in meters
  movingTimeSec: number;       // moving_time from Strava
  elapsedTimeSec: number;      // elapsed_time from Strava
  totalElevationGainM: number; // total_elevation_gain

  // Speed/Pace (calculated from Strava data)
  averageSpeedMS: number;      // average_speed (m/s) from Strava
  maxSpeedMS: number;          // max_speed (m/s) from Strava
  avgPaceSecKm: number;        // calculated: (movingTimeSec / (distanceM/1000))

  // Heart rate
  avgHrBpm: number | null;     // average_heartrate
  maxHrBpm: number | null;     // max_heartrate

  // Additional metrics from Strava
  calories: number | null;
  avgCadence: number | null;   // average_cadence (steps/min)
  avgTemp: number | null;      // average_temp (celsius)

  // Calculated/User-input metrics (NOT from Strava API)
  perceivedEffort: number | null; // RPE 1-10, user-input after activity
  tss: number | null;             // calculated by us using HR or pace

  // Optional
  polyline: string | null;     // encoded polyline for map
  gearId: string | null;       // gear_id from Strava
}

export interface ActivitySummary {
  id: string;
  date: string;
  distanceM: number;
  durationSec: number;
  avgPaceSecKm: number;
  tss: number | null;
  perceivedEffort: number | null;
}

export interface WeeklyAggregate {
  id: string;
  userId: string;
  weekStart: Date;
  weekNumber: number;
  year: number;
  totalDistanceM: number;
  totalDurationSec: number;
  totalElevationM: number;
  sessionCount: number;
  runCount: number;
  totalTss: number;
  ctl: number;
  atl: number;
  tsb: number;
  monotony: number;
  strain: number;
  avgPerceivedEffort: number | null;
}

export interface WeeklyAggregateSummary {
  weekNumber: number;
  totalDistanceM: number;
  totalTss: number;
  tsb: number;
}

export interface PainLocation {
  location: BodyLocation;
  side?: BodySide;
  type?: PainType;
}

export interface DailyFeedback {
  id: string;
  userId: string;
  date: Date;
  fatigue: number; // 1-10
  muscleSoreness: number; // 1-10
  mood: number; // 1-10
  sleepQuality: number; // 1-10
  painLocations: PainLocation[];
  painIntensity: number | null; // 1-10
  notes: string | null;
}

export interface Goal {
  id: string;
  userId: string;
  type: GoalType;
  targetValue: number; // seconds for time goals, meters for distance
  targetDate: Date;
  status: "ACTIVE" | "ACHIEVED" | "ABANDONED" | "EXPIRED";
  context: string | null;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  goalId: string;
  startDate: Date;
  endDate: Date;
  totalWeeks: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "SUPERSEDED";
  planData: unknown; // JSON structure
}

/**
 * Aggregated context provided to AI agents
 * This is what gets transformed into LLM-ready text
 */
export interface AggregatedContext {
  // Goal
  goal: {
    description: string;
    daysRemaining: number;
  } | null;

  // Athlete profile
  athleteLevel: AthleteLevel;
  estimatedVO2max: number | null;

  // Training load history (8 weeks)
  weeklyAggs: WeeklyAggregateSummary[];

  // Recent activities (last 10)
  recentActivities: ActivitySummary[];

  // Current load metrics
  currentCTL: number;
  currentATL: number;
  currentTSB: number;
  formStatus: FormStatus;

  // Subjective feedback (7 days avg)
  avgFatigue: number;
  avgMood: number;
  avgSleep: number;
  painSummary: string | null; // e.g. "knee left (2 days ago)"
  lastPainFeedback: string | null;

  // Current plan (if exists)
  currentPlanWeek: number | null;
  totalPlanWeeks: number | null;
  currentPhase: string | null;
  plannedSessions: string[];
}
