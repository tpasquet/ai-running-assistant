import { describe, it, expect, beforeEach, vi } from "vitest";
import { AggregateRepository } from "../AggregateRepository.js";

const mockPrisma = {
  weeklyAggregate: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  },
} as any;

const baseData = {
  userId: "user-1",
  weekStart: new Date("2024-01-01"),
  weekNumber: 1,
  year: 2024,
  totalDistanceM: 42000,
  totalDurationSec: 14400,
  totalElevationM: 350,
  sessionCount: 4,
  runCount: 4,
  totalTss: 280,
  ctl: 45.2,
  atl: 52.1,
  tsb: -6.9,
  monotony: 1.4,
  strain: 392,
  avgPerceivedEffort: 6.5,
};

describe("AggregateRepository", () => {
  let repo: AggregateRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new AggregateRepository(mockPrisma);
  });

  it("upserts by userId + weekStart composite key", async () => {
    mockPrisma.weeklyAggregate.upsert.mockResolvedValue({ id: "agg-1", ...baseData });
    await repo.upsert(baseData);
    expect(mockPrisma.weeklyAggregate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_weekStart: { userId: "user-1", weekStart: baseData.weekStart } },
      }),
    );
  });

  it("findRecent returns descending weeks with limit", async () => {
    mockPrisma.weeklyAggregate.findMany.mockResolvedValue([]);
    await repo.findRecent("user-1", 8);
    expect(mockPrisma.weeklyAggregate.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { weekStart: "desc" },
      take: 8,
    });
  });

  it("deleteForUser removes all aggregates for the user", async () => {
    mockPrisma.weeklyAggregate.deleteMany.mockResolvedValue({ count: 5 });
    await repo.deleteForUser("user-1");
    expect(mockPrisma.weeklyAggregate.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });
});
