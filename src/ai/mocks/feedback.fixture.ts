import type { DailyFeedback } from "../../shared/types/domain.types";

/**
 * Mock daily feedback data
 * Captures subjective metrics: fatigue, soreness, mood, sleep, pain
 */

const today = new Date("2025-03-28");

function daysAgo(days: number): Date {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date;
}

// ============================================================================
// SCENARIO 1: Overreached Athlete
// High fatigue, declining mood, poor sleep
// ============================================================================

const overreachedFeedback: DailyFeedback[] = [
  {
    id: "fb-or-1",
    userId: "mock-user-overreached",
    date: daysAgo(7),
    fatigue: 7,
    muscleSoreness: 6,
    mood: 6,
    sleepQuality: 5,
    painLocations: [],
    painIntensity: null,
    notes: "Legs felt heavy on the run",
  },
  {
    id: "fb-or-2",
    userId: "mock-user-overreached",
    date: daysAgo(6),
    fatigue: 8,
    muscleSoreness: 7,
    mood: 5,
    sleepQuality: 5,
    painLocations: [],
    painIntensity: null,
    notes: "Woke up tired despite 8h sleep",
  },
  {
    id: "fb-or-3",
    userId: "mock-user-overreached",
    date: daysAgo(5),
    fatigue: 8,
    muscleSoreness: 7,
    mood: 5,
    sleepQuality: 4,
    painLocations: [],
    painIntensity: null,
    notes: "Hard time falling asleep, restless night",
  },
  {
    id: "fb-or-4",
    userId: "mock-user-overreached",
    date: daysAgo(4),
    fatigue: 9,
    muscleSoreness: 8,
    mood: 4,
    sleepQuality: 5,
    painLocations: [],
    painIntensity: null,
    notes: "Exhausted, really don't want to run",
  },
  {
    id: "fb-or-5",
    userId: "mock-user-overreached",
    date: daysAgo(3),
    fatigue: 9,
    muscleSoreness: 8,
    mood: 4,
    sleepQuality: 4,
    painLocations: [],
    painIntensity: null,
    notes: "Everything hurts, feeling mentally drained",
  },
  {
    id: "fb-or-6",
    userId: "mock-user-overreached",
    date: daysAgo(2),
    fatigue: 8,
    muscleSoreness: 7,
    mood: 5,
    sleepQuality: 6,
    painLocations: [],
    painIntensity: null,
    notes: "Slightly better after rest day",
  },
  {
    id: "fb-or-7",
    userId: "mock-user-overreached",
    date: daysAgo(1),
    fatigue: 8,
    muscleSoreness: 7,
    mood: 4,
    sleepQuality: 5,
    painLocations: [],
    painIntensity: null,
    notes: "Still feel worn down",
  },
];

// ============================================================================
// SCENARIO 2: Fresh Athlete
// Low fatigue, good mood, excellent sleep
// ============================================================================

const freshFeedback: DailyFeedback[] = [
  {
    id: "fb-fresh-1",
    userId: "mock-user-fresh",
    date: daysAgo(7),
    fatigue: 3,
    muscleSoreness: 3,
    mood: 8,
    sleepQuality: 8,
    painLocations: [],
    painIntensity: null,
    notes: "Feeling strong and recovered",
  },
  {
    id: "fb-fresh-2",
    userId: "mock-user-fresh",
    date: daysAgo(6),
    fatigue: 3,
    muscleSoreness: 2,
    mood: 8,
    sleepQuality: 8,
    painLocations: [],
    painIntensity: null,
    notes: "Great sleep, eager to train",
  },
  {
    id: "fb-fresh-3",
    userId: "mock-user-fresh",
    date: daysAgo(5),
    fatigue: 2,
    muscleSoreness: 2,
    mood: 9,
    sleepQuality: 9,
    painLocations: [],
    painIntensity: null,
    notes: "Feeling fresh and energetic",
  },
  {
    id: "fb-fresh-4",
    userId: "mock-user-fresh",
    date: daysAgo(4),
    fatigue: 2,
    muscleSoreness: 2,
    mood: 9,
    sleepQuality: 8,
    painLocations: [],
    painIntensity: null,
    notes: "Legs feel bouncy, ready for quality session",
  },
  {
    id: "fb-fresh-5",
    userId: "mock-user-fresh",
    date: daysAgo(3),
    fatigue: 2,
    muscleSoreness: 3,
    mood: 8,
    sleepQuality: 8,
    painLocations: [],
    painIntensity: null,
    notes: "Slightly sore from yesterday but good overall",
  },
  {
    id: "fb-fresh-6",
    userId: "mock-user-fresh",
    date: daysAgo(2),
    fatigue: 2,
    muscleSoreness: 2,
    mood: 8,
    sleepQuality: 9,
    painLocations: [],
    painIntensity: null,
    notes: "Perfect recovery, ready to go",
  },
  {
    id: "fb-fresh-7",
    userId: "mock-user-fresh",
    date: daysAgo(1),
    fatigue: 2,
    muscleSoreness: 2,
    mood: 9,
    sleepQuality: 8,
    painLocations: [],
    painIntensity: null,
    notes: "Feeling amazing, best shape in months",
  },
];

// ============================================================================
// SCENARIO 3: Knee Pain Athlete
// Pain tracking, cautious return
// ============================================================================

const kneePainFeedback: DailyFeedback[] = [
  {
    id: "fb-knee-1",
    userId: "mock-user-knee-pain",
    date: daysAgo(10),
    fatigue: 4,
    muscleSoreness: 5,
    mood: 6,
    sleepQuality: 7,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "sharp",
      },
    ],
    painIntensity: 4,
    notes: "Pain started during run, had to slow down",
  },
  {
    id: "fb-knee-2",
    userId: "mock-user-knee-pain",
    date: daysAgo(9),
    fatigue: 5,
    muscleSoreness: 6,
    mood: 5,
    sleepQuality: 6,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "dull",
      },
    ],
    painIntensity: 5,
    notes: "Knee hurts when walking down stairs",
  },
  {
    id: "fb-knee-3",
    userId: "mock-user-knee-pain",
    date: daysAgo(8),
    fatigue: 5,
    muscleSoreness: 6,
    mood: 4,
    sleepQuality: 6,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "sharp",
      },
    ],
    painIntensity: 6,
    notes: "Tried to run, had to stop after 6k. Frustrated.",
  },
  {
    id: "fb-knee-4",
    userId: "mock-user-knee-pain",
    date: daysAgo(7),
    fatigue: 4,
    muscleSoreness: 5,
    mood: 5,
    sleepQuality: 7,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "dull",
      },
    ],
    painIntensity: 4,
    notes: "Rest day, icing knee. Still painful.",
  },
  {
    id: "fb-knee-5",
    userId: "mock-user-knee-pain",
    date: daysAgo(6),
    fatigue: 3,
    muscleSoreness: 4,
    mood: 6,
    sleepQuality: 7,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "dull",
      },
    ],
    painIntensity: 3,
    notes: "Slight improvement, less pain today",
  },
  {
    id: "fb-knee-6",
    userId: "mock-user-knee-pain",
    date: daysAgo(5),
    fatigue: 3,
    muscleSoreness: 3,
    mood: 6,
    sleepQuality: 7,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "dull",
      },
    ],
    painIntensity: 3,
    notes: "Continuing rest and PT exercises",
  },
  {
    id: "fb-knee-7",
    userId: "mock-user-knee-pain",
    date: daysAgo(4),
    fatigue: 3,
    muscleSoreness: 3,
    mood: 7,
    sleepQuality: 8,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "dull",
      },
    ],
    painIntensity: 2,
    notes: "Much better, almost no pain walking",
  },
  {
    id: "fb-knee-8",
    userId: "mock-user-knee-pain",
    date: daysAgo(3),
    fatigue: 3,
    muscleSoreness: 3,
    mood: 7,
    sleepQuality: 8,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "dull",
      },
    ],
    painIntensity: 2,
    notes: "PT exercises going well",
  },
  {
    id: "fb-knee-9",
    userId: "mock-user-knee-pain",
    date: daysAgo(2),
    fatigue: 4,
    muscleSoreness: 4,
    mood: 7,
    sleepQuality: 7,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "dull",
      },
    ],
    painIntensity: 3,
    notes: "Tested with 4k run, slight discomfort but manageable",
  },
  {
    id: "fb-knee-10",
    userId: "mock-user-knee-pain",
    date: daysAgo(1),
    fatigue: 4,
    muscleSoreness: 4,
    mood: 6,
    sleepQuality: 7,
    painLocations: [
      {
        location: "knee",
        side: "left",
        type: "dull",
      },
    ],
    painIntensity: 2,
    notes: "Knee feels OK, cautiously optimistic",
  },
];

// ============================================================================
// SCENARIO 4: Pre-Competition Athlete
// Tapering, feeling good, slight nerves
// ============================================================================

const preCompetitionFeedback: DailyFeedback[] = [
  {
    id: "fb-comp-1",
    userId: "mock-user-competition",
    date: daysAgo(7),
    fatigue: 2,
    muscleSoreness: 2,
    mood: 8,
    sleepQuality: 8,
    painLocations: [],
    painIntensity: null,
    notes: "Taper week, feeling fresh. Race next week!",
  },
  {
    id: "fb-comp-2",
    userId: "mock-user-competition",
    date: daysAgo(6),
    fatigue: 2,
    muscleSoreness: 2,
    mood: 8,
    sleepQuality: 7,
    painLocations: [],
    painIntensity: null,
    notes: "Legs bouncy, excited for race",
  },
  {
    id: "fb-comp-3",
    userId: "mock-user-competition",
    date: daysAgo(5),
    fatigue: 2,
    muscleSoreness: 2,
    mood: 7,
    sleepQuality: 6,
    painLocations: [],
    painIntensity: null,
    notes: "Starting to feel nervous about race",
  },
  {
    id: "fb-comp-4",
    userId: "mock-user-competition",
    date: daysAgo(4),
    fatigue: 2,
    muscleSoreness: 2,
    mood: 7,
    sleepQuality: 7,
    painLocations: [],
    painIntensity: null,
    notes: "Light shakeout felt great",
  },
  {
    id: "fb-comp-5",
    userId: "mock-user-competition",
    date: daysAgo(3),
    fatigue: 1,
    muscleSoreness: 1,
    mood: 8,
    sleepQuality: 8,
    painLocations: [],
    painIntensity: null,
    notes: "Peak freshness, ready to race",
  },
  {
    id: "fb-comp-6",
    userId: "mock-user-competition",
    date: daysAgo(2),
    fatigue: 1,
    muscleSoreness: 1,
    mood: 7,
    sleepQuality: 6,
    painLocations: [],
    painIntensity: null,
    notes: "Hard to sleep, pre-race jitters",
  },
  {
    id: "fb-comp-7",
    userId: "mock-user-competition",
    date: daysAgo(1),
    fatigue: 2,
    muscleSoreness: 1,
    mood: 7,
    sleepQuality: 5,
    painLocations: [],
    painIntensity: null,
    notes: "Nervous but excited. Race tomorrow!",
  },
];

// ============================================================================
// SCENARIO 5: Burnout Athlete
// Declining mood, poor motivation, inconsistent sleep
// ============================================================================

const burnoutFeedback: DailyFeedback[] = [
  {
    id: "fb-burn-1",
    userId: "mock-user-burnout",
    date: daysAgo(7),
    fatigue: 6,
    muscleSoreness: 5,
    mood: 4,
    sleepQuality: 5,
    painLocations: [],
    painIntensity: null,
    notes: "Don't feel like running at all",
  },
  {
    id: "fb-burn-2",
    userId: "mock-user-burnout",
    date: daysAgo(6),
    fatigue: 6,
    muscleSoreness: 5,
    mood: 4,
    sleepQuality: 6,
    painLocations: [],
    painIntensity: null,
    notes: "Skipped run, no motivation",
  },
  {
    id: "fb-burn-3",
    userId: "mock-user-burnout",
    date: daysAgo(5),
    fatigue: 7,
    muscleSoreness: 5,
    mood: 3,
    sleepQuality: 5,
    painLocations: [],
    painIntensity: null,
    notes: "Feeling down, lost my running mojo",
  },
  {
    id: "fb-burn-4",
    userId: "mock-user-burnout",
    date: daysAgo(4),
    fatigue: 6,
    muscleSoreness: 4,
    mood: 4,
    sleepQuality: 6,
    painLocations: [],
    painIntensity: null,
    notes: "Another skipped run. What's the point?",
  },
  {
    id: "fb-burn-5",
    userId: "mock-user-burnout",
    date: daysAgo(3),
    fatigue: 6,
    muscleSoreness: 4,
    mood: 5,
    sleepQuality: 7,
    painLocations: [],
    painIntensity: null,
    notes: "Better sleep but still unmotivated",
  },
  {
    id: "fb-burn-6",
    userId: "mock-user-burnout",
    date: daysAgo(2),
    fatigue: 5,
    muscleSoreness: 4,
    mood: 5,
    sleepQuality: 6,
    painLocations: [],
    painIntensity: null,
    notes: "Forced myself to run 5k, felt OK actually",
  },
  {
    id: "fb-burn-7",
    userId: "mock-user-burnout",
    date: daysAgo(1),
    fatigue: 5,
    muscleSoreness: 4,
    mood: 5,
    sleepQuality: 6,
    painLocations: [],
    painIntensity: null,
    notes: "Slightly better but still struggling with consistency",
  },
];

// ============================================================================
// EXPORTS
// ============================================================================

export const MOCK_DAILY_FEEDBACK: DailyFeedback[] = [
  ...overreachedFeedback,
  ...freshFeedback,
  ...kneePainFeedback,
  ...preCompetitionFeedback,
  ...burnoutFeedback,
];

export function getFeedbackForUser(userId: string): DailyFeedback[] {
  return MOCK_DAILY_FEEDBACK
    .filter((fb) => fb.userId === userId)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getRecentFeedback(userId: string, days: number = 7): DailyFeedback[] {
  const cutoffDate = daysAgo(days);
  return MOCK_DAILY_FEEDBACK
    .filter((fb) => fb.userId === userId && fb.date >= cutoffDate)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getLatestPainFeedback(userId: string): DailyFeedback | null {
  return (
    MOCK_DAILY_FEEDBACK
      .filter((fb) => fb.userId === userId && fb.painLocations.length > 0)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0] || null
  );
}
