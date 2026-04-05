import { describe, it, expect, beforeEach, vi } from "vitest";
import { FeedbackRepository } from "../FeedbackRepository.js";

const mockPrisma = {
  dailyFeedback: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
} as any;

const feedbackData = {
  userId: "user-1",
  date: new Date("2024-01-15"),
  fatigue: 6,
  muscleSoreness: 5,
  mood: 7,
  sleepQuality: 6,
  painLocations: [{ location: "knee", side: "left", type: "dull" }],
  painIntensity: 3,
  notes: "Slight knee discomfort",
};

describe("FeedbackRepository", () => {
  let repo: FeedbackRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new FeedbackRepository(mockPrisma);
  });

  it("upserts by userId + date composite key", async () => {
    mockPrisma.dailyFeedback.upsert.mockResolvedValue({ id: "fb-1", ...feedbackData });
    await repo.upsert(feedbackData);
    expect(mockPrisma.dailyFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_date: { userId: "user-1", date: feedbackData.date },
        },
      }),
    );
  });

  it("findRecent filters by date range", async () => {
    mockPrisma.dailyFeedback.findMany.mockResolvedValue([]);
    await repo.findRecent("user-1", 7);
    expect(mockPrisma.dailyFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
        orderBy: { date: "desc" },
      }),
    );
  });

  it("findLatestWithPain filters for non-null painIntensity", async () => {
    mockPrisma.dailyFeedback.findFirst.mockResolvedValue(null);
    await repo.findLatestWithPain("user-1");
    expect(mockPrisma.dailyFeedback.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          painIntensity: { not: null },
        }),
      }),
    );
  });
});
