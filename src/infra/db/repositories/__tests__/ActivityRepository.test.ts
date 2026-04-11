import { describe, it, expect, beforeEach, vi } from "vitest";
import { ActivityRepository } from "../ActivityRepository.js";

const mockPrisma = {
  activity: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
} as any;

describe("ActivityRepository", () => {
  let repo: ActivityRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ActivityRepository(mockPrisma);
  });

  it("upserts an activity by stravaId", async () => {
    const activity = {
      userId: "user-1",
      stravaId: BigInt(123456),
      type: "Run",
      startDate: new Date("2024-01-15"),
      distanceM: 10000,
      movingTimeSec: 3600,
      elapsedTimeSec: 3700,
      totalElevationGainM: 150,
      averageSpeedMS: 2.78,
      maxSpeedMS: 4.0,
      avgPaceSecKm: 360,
      avgHrBpm: 155,
      maxHrBpm: 175,
      calories: null,
      avgCadence: null,
      avgTemp: null,
      perceivedEffort: null,
      tss: null,
      polyline: null,
      gearId: null,
    };

    mockPrisma.activity.upsert.mockResolvedValue({ id: "act-1" });

    const result = await repo.upsert(activity);

    expect(result).toEqual({ id: "act-1" });
    expect(mockPrisma.activity.upsert).toHaveBeenCalledWith({
      where: { stravaId: BigInt(123456) },
      create: { ...activity },
      update: expect.objectContaining({ distanceM: 10000 }),
      select: { id: true },
    });
  });

  it("finds recent activities for a user", async () => {
    mockPrisma.activity.findMany.mockResolvedValue([]);

    await repo.findRecent("user-1", 10);

    expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", type: { in: ["Run", "TrailRun", "VirtualRun"] } },
      orderBy: { startDate: "desc" },
      take: 10,
    });
  });
});
