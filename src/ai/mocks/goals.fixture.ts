import type { Goal } from "../../shared/types/domain.types";

/**
 * Mock goals for different scenarios
 */

const today = new Date("2025-03-28");

function daysFromNow(days: number): Date {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date;
}

export const MOCK_GOALS: Goal[] = [
  // Overreached athlete - ambitious goal driving overtraining
  {
    id: "goal-1",
    userId: "mock-user-overreached",
    type: "SUB_X_10K",
    targetValue: 2100, // 35:00 (seconds)
    targetDate: daysFromNow(45),
    status: "ACTIVE",
    context: "Sub-35min 10K at local race",
  },

  // Fresh athlete - realistic goal, well-paced training
  {
    id: "goal-2",
    userId: "mock-user-fresh",
    type: "SUB_X_HALF",
    targetValue: 5400, // 1:30:00 (90 minutes)
    targetDate: daysFromNow(60),
    status: "ACTIVE",
    context: "First half marathon, aiming for sub-90",
  },

  // Knee pain athlete - conservative comeback goal
  {
    id: "goal-3",
    userId: "mock-user-knee-pain",
    type: "FINISH_10K",
    targetValue: 10000, // distance goal (10K)
    targetDate: daysFromNow(90),
    status: "ACTIVE",
    context: "Return to racing after knee injury",
  },

  // Pre-competition athlete - race is imminent!
  {
    id: "goal-4",
    userId: "mock-user-competition",
    type: "SUB_X_10K",
    targetValue: 2400, // 40:00 (seconds)
    targetDate: daysFromNow(7), // Race in 7 days!
    status: "ACTIVE",
    context: "Spring 10K championship",
  },

  // Burnout athlete - lost motivation, old goal
  {
    id: "goal-5",
    userId: "mock-user-burnout",
    type: "WEEKLY_DISTANCE",
    targetValue: 50000, // 50km per week
    targetDate: daysFromNow(30),
    status: "ACTIVE",
    context: "Build base fitness",
  },
];

export function getGoalForUser(userId: string): Goal | null {
  return MOCK_GOALS.find((g) => g.userId === userId && g.status === "ACTIVE") || null;
}
