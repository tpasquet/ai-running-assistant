import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPeakWeeksTool } from "../getPeakWeeks.js";

// ── Mock prisma ────────────────────────────────────────────────────────────────

vi.mock("../../../../infra/db/prisma.js", () => ({
  prisma: {
    weeklyAggregate: { findMany: vi.fn() },
    dailyFeedback:   { findMany: vi.fn() },
  },
}));

import { prisma } from "../../../../infra/db/prisma.js";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const makeWeek = (overrides: Record<string, unknown> = {}) => ({
  weekStart:          new Date("2026-02-03T00:00:00Z"),
  weekNumber:         6,
  year:               2026,
  totalDistanceM:     75_000,
  totalTss:           480,
  ctl:                65.0,
  atl:                72.0,
  tsb:                -7.0,
  strain:             576,
  runCount:           5,
  avgPerceivedEffort: 7.2,
  ...overrides,
});

const makeFeedback = (overrides: Record<string, unknown> = {}) => ({
  fatigue:        7,
  muscleSoreness: 6,
  mood:           5,
  sleepQuality:   6,
  painLocations:  [],
  painIntensity:  null,
  ...overrides,
});

const cfg = { configurable: { userId: "user-abc" } };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("getPeakWeeksTool", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sorts by TSS when rankBy is 'tss'", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dailyFeedback.findMany).mockResolvedValue([]);

    await getPeakWeeksTool.invoke({ rankBy: "tss", topN: 5 }, cfg);

    expect(prisma.weeklyAggregate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { totalTss: "desc" } })
    );
  });

  it("sorts by distance when rankBy is 'distance'", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dailyFeedback.findMany).mockResolvedValue([]);

    await getPeakWeeksTool.invoke({ rankBy: "distance", topN: 3 }, cfg);

    expect(prisma.weeklyAggregate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { totalDistanceM: "desc" } })
    );
  });

  it("enriches each week with feedback averages", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([makeWeek()]);
    vi.mocked(prisma.dailyFeedback.findMany).mockResolvedValue([
      makeFeedback({ fatigue: 8, muscleSoreness: 7, mood: 5, sleepQuality: 6 }),
      makeFeedback({ fatigue: 6, muscleSoreness: 5, mood: 6, sleepQuality: 7 }),
    ]);

    const raw = await getPeakWeeksTool.invoke({ rankBy: "tss", topN: 1 }, cfg);
    const [week] = JSON.parse(raw as string);

    expect(week.feedback).not.toBeNull();
    expect(week.feedback.avgFatigue).toBe(7);
    expect(week.feedback.avgMuscleSoreness).toBe(6);
    expect(week.feedback.hasPain).toBe(false);
  });

  it("detects pain in feedback", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([makeWeek()]);
    vi.mocked(prisma.dailyFeedback.findMany).mockResolvedValue([
      makeFeedback({
        painLocations: [{ location: "knee", side: "left" }],
        painIntensity: 5,
      }),
    ]);

    const raw = await getPeakWeeksTool.invoke({ rankBy: "tss", topN: 1 }, cfg);
    const [week] = JSON.parse(raw as string);

    expect(week.feedback.hasPain).toBe(true);
    expect(week.feedback.avgPainIntensity).toBe(5);
  });

  it("sets feedback to null when no daily feedback exists for that week", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([makeWeek()]);
    vi.mocked(prisma.dailyFeedback.findMany).mockResolvedValue([]);

    const raw = await getPeakWeeksTool.invoke({ rankBy: "tss", topN: 1 }, cfg);
    const [week] = JSON.parse(raw as string);

    expect(week.feedback).toBeNull();
  });

  it("formats output fields correctly", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([makeWeek()]);
    vi.mocked(prisma.dailyFeedback.findMany).mockResolvedValue([]);

    const raw = await getPeakWeeksTool.invoke({ rankBy: "tss", topN: 1 }, cfg);
    const [week] = JSON.parse(raw as string);

    expect(week.week).toBe("2026-W06");
    expect(week.distanceKm).toBe(75);
    expect(week.tss).toBe(480);
    expect(week.ctl).toBe(65);
    expect(week.sessions).toBe(5);
  });

  it("returns error when userId is missing", async () => {
    const raw = await getPeakWeeksTool.invoke({ rankBy: "tss", topN: 3 }, {});
    expect(JSON.parse(raw as string)).toMatchObject({ error: expect.any(String) });
  });
});
