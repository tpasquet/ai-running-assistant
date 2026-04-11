import { describe, it, expect, vi, beforeEach } from "vitest";
import { getActivitiesByProfileTool } from "../getActivitiesByProfile.js";

// ── Mock prisma ────────────────────────────────────────────────────────────────

vi.mock("../../../../infra/db/prisma.js", () => ({
  prisma: {
    activity: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../../infra/db/prisma.js";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const makeActivity = (overrides: Record<string, unknown> = {}) => ({
  startDate:          new Date("2026-03-15T08:00:00Z"),
  type:               "Run",
  distanceM:          21_100,
  movingTimeSec:      6_600,
  avgPaceSecKm:       312,
  avgHrBpm:           155,
  tss:                130,
  perceivedEffort:    7,
  workoutType:        2,  // long_run
  totalElevationGainM: 180,
  isTrainer:          false,
  laps:               [],
  ...overrides,
});

const cfg = { configurable: { userId: "user-abc" } };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("getActivitiesByProfileTool", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps 'long_run' sessionType to workoutType 2 in the query", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

    await getActivitiesByProfileTool.invoke({ sessionType: "long_run" }, cfg);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workoutType: 2 }),
      })
    );
  });

  it("maps 'race' sessionType to workoutType 1", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

    await getActivitiesByProfileTool.invoke({ sessionType: "race" }, cfg);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workoutType: 1 }),
      })
    );
  });

  it("applies no workoutType filter for 'any'", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

    await getActivitiesByProfileTool.invoke({ sessionType: "any" }, cfg);

    const call = vi.mocked(prisma.activity.findMany).mock.calls[0][0];
    expect(call.where).not.toHaveProperty("workoutType");
  });

  it("applies distance filters in meters", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

    await getActivitiesByProfileTool.invoke({ sessionType: "any", minDistanceKm: 15, maxDistanceKm: 25 }, cfg);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          distanceM: { gte: 15_000, lte: 25_000 },
        }),
      })
    );
  });

  it("formats activity fields correctly", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([makeActivity()]);

    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "long_run" }, cfg);
    const [a] = JSON.parse(raw as string);

    expect(a.date).toBe("2026-03-15");
    expect(a.type).toBe("long_run");
    expect(a.distanceKm).toBe(21.1);
    expect(a.durationMin).toBe(110);
    expect(a.avgPaceSecKm).toBe(312);
    expect(a.tss).toBe(130);
    expect(a.rpe).toBe(7);
    expect(a.indoor).toBe(false);
  });

  it("omits laps field when activity has 0 or 1 lap", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ laps: [] }),
      makeActivity({ laps: [{ lapIndex: 1, distanceM: 21100, avgPaceSecKm: 312, avgHrBpm: 155, paceZone: 3 }] }),
    ]);

    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "any" }, cfg);
    const results = JSON.parse(raw as string);

    expect(results[0].laps).toBeUndefined();
    expect(results[1].laps).toBeUndefined();
  });

  it("includes laps when activity has multiple laps", async () => {
    const laps = [
      { lapIndex: 1, distanceM: 5000, avgPaceSecKm: 300, avgHrBpm: 150, paceZone: 3 },
      { lapIndex: 2, distanceM: 5000, avgPaceSecKm: 295, avgHrBpm: 158, paceZone: 4 },
    ];
    vi.mocked(prisma.activity.findMany).mockResolvedValue([makeActivity({ laps })]);

    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "workout" }, cfg);
    const [a] = JSON.parse(raw as string);

    expect(a.laps).toHaveLength(2);
    expect(a.laps[0].paceSecKm).toBe(300);
    expect(a.laps[1].zone).toBe(4);
  });

  it("returns error when userId is missing", async () => {
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "easy" }, {});
    expect(JSON.parse(raw as string)).toMatchObject({ error: expect.any(String) });
  });
});
