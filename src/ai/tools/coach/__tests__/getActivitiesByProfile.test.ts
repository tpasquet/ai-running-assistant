import { describe, it, expect, vi, beforeEach } from "vitest";
import { getActivitiesByProfileTool } from "../getActivitiesByProfile.js";

vi.mock("../../../../infra/db/prisma.js", () => ({
  prisma: { activity: { findMany: vi.fn() } },
}));

import { prisma } from "../../../../infra/db/prisma.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeActivity = (overrides: Record<string, unknown> = {}) => ({
  name:                null,
  startDate:           new Date("2026-03-15T08:00:00Z"),
  distanceM:           10_000,
  movingTimeSec:       3_600,
  avgPaceSecKm:        360,
  avgHrBpm:            140,
  tss:                 70,
  perceivedEffort:     null,
  workoutType:         null,
  totalElevationGainM: 80,
  isTrainer:           false,
  laps:                [],
  ...overrides,
});

const cfg = { configurable: { userId: "user-abc" } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getActivitiesByProfileTool", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── workoutType-based classification ──────────────────────────────────────

  it("returns race when workoutType=1", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ workoutType: 1, name: "Morning run" }),
    ]);
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "race" }, cfg);
    const [a] = JSON.parse(raw as string);
    expect(a.type).toBe("race");
  });

  it("returns long_run when workoutType=2", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ workoutType: 2, distanceM: 22_000 }),
    ]);
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "long_run" }, cfg);
    const [a] = JSON.parse(raw as string);
    expect(a.type).toBe("long_run");
  });

  it("returns workout when workoutType=3", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ workoutType: 3 }),
    ]);
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "workout" }, cfg);
    const [a] = JSON.parse(raw as string);
    expect(a.type).toBe("workout");
  });

  it("classifies as race when name matches race keyword (workoutType null)", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ name: "Paris Marathon 2025", workoutType: null }),
    ]);
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "race" }, cfg);
    const [a] = JSON.parse(raw as string);
    expect(a.type).toBe("race");
  });

  // ── Heuristic classification (workoutType null) ───────────────────────────

  it("classifies as long_run when distance ≥ 16km (workoutType null)", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ distanceM: 20_000, workoutType: null }),
    ]);
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "long_run" }, cfg);
    const [a] = JSON.parse(raw as string);
    expect(a.type).toBe("long_run");
  });

  it("classifies as workout when laps have pace zone ≥ 4 (workoutType null)", async () => {
    const laps = [
      { lapIndex: 1, distanceM: 2000, avgPaceSecKm: 280, avgHrBpm: 165, paceZone: 4 },
      { lapIndex: 2, distanceM: 2000, avgPaceSecKm: 330, avgHrBpm: 145, paceZone: 2 },
    ];
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ distanceM: 10_000, workoutType: null, laps }),
    ]);
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "workout" }, cfg);
    const [a] = JSON.parse(raw as string);
    expect(a.type).toBe("workout");
  });

  it("classifies as easy when distance < 16km and no high zones (workoutType null)", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ distanceM: 8_000, workoutType: null, laps: [] }),
    ]);
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "easy" }, cfg);
    const [a] = JSON.parse(raw as string);
    expect(a.type).toBe("easy");
  });

  // ── Distance filters ──────────────────────────────────────────────────────

  it("applies both min and max distance filters in meters", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
    await getActivitiesByProfileTool.invoke({ sessionType: "any", minDistanceKm: 15, maxDistanceKm: 25 }, cfg);
    const call = vi.mocked(prisma.activity.findMany).mock.calls[0][0];
    expect(call.where.distanceM).toEqual({ gte: 15_000, lte: 25_000 });
  });

  // ── Output format ─────────────────────────────────────────────────────────

  it("rounds paceSecKm to integer", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ avgPaceSecKm: 307.088 }),
    ]);
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "any" }, cfg);
    const [a] = JSON.parse(raw as string);
    expect(a.avgPaceSecKm).toBe(307);
    expect(Number.isInteger(a.avgPaceSecKm)).toBe(true);
  });

  it("includes laps array only when activity has multiple laps", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      makeActivity({ laps: [] }),
      makeActivity({
        laps: [
          { lapIndex: 1, distanceM: 5000, avgPaceSecKm: 300, avgHrBpm: 155, paceZone: 3 },
          { lapIndex: 2, distanceM: 5000, avgPaceSecKm: 295, avgHrBpm: 160, paceZone: 4 },
        ],
      }),
    ]);
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "any" }, cfg);
    const [a, b] = JSON.parse(raw as string);
    expect(a.laps).toBeUndefined();
    expect(b.laps).toHaveLength(2);
    expect(b.laps[0].paceSecKm).toBe(300);
  });

  it("returns error when userId is missing", async () => {
    const raw = await getActivitiesByProfileTool.invoke({ sessionType: "easy" }, {});
    expect(JSON.parse(raw as string)).toMatchObject({ error: expect.any(String) });
  });
});
