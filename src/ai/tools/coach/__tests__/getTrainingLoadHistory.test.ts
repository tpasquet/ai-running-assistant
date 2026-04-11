import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTrainingLoadHistoryTool } from "../getTrainingLoadHistory.js";

// ── Mock prisma ────────────────────────────────────────────────────────────────

vi.mock("../../../../infra/db/prisma.js", () => ({
  prisma: {
    weeklyAggregate: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../../infra/db/prisma.js";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const makeWeek = (weekNumber: number, overrides: Partial<typeof BASE_WEEK> = {}) => ({
  ...BASE_WEEK,
  weekNumber,
  year: 2026,
  weekStart: new Date(`2026-01-${String(weekNumber).padStart(2, "0")}T00:00:00Z`),
  ...overrides,
});

const BASE_WEEK = {
  weekStart:          new Date("2026-01-01T00:00:00Z"),
  weekNumber:         1,
  year:               2026,
  totalDistanceM:     50_000,
  totalTss:           320,
  ctl:                52.4,
  atl:                58.1,
  tsb:                -5.7,
  monotony:           1.2,
  strain:             384,
  runCount:           4,
  avgPerceivedEffort: 6.5,
};

const cfg = { configurable: { userId: "user-abc" } };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("getTrainingLoadHistoryTool", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries the correct userId and week count", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([makeWeek(1)]);

    await getTrainingLoadHistoryTool.invoke({ weeks: 8 }, cfg);

    expect(prisma.weeklyAggregate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-abc" },
        take:  8,
        orderBy: { weekStart: "desc" },
      })
    );
  });

  it("returns weeks in chronological order (oldest first)", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([
      makeWeek(3),
      makeWeek(2),
      makeWeek(1),
    ]);

    const raw = await getTrainingLoadHistoryTool.invoke({ weeks: 3 }, cfg);
    const result = JSON.parse(raw as string);

    expect(result[0].week).toBe("2026-W01");
    expect(result[2].week).toBe("2026-W03");
  });

  it("formats fields correctly", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([makeWeek(5)]);

    const raw = await getTrainingLoadHistoryTool.invoke({ weeks: 1 }, cfg);
    const [week] = JSON.parse(raw as string);

    expect(week.distanceKm).toBe(50);
    expect(week.tss).toBe(320);
    expect(week.ctl).toBe(52.4);
    expect(week.atl).toBe(58.1);
    expect(week.tsb).toBe(-5.7);
    expect(week.sessions).toBe(4);
    expect(week.avgRpe).toBe(6.5);
  });

  it("returns null avgRpe when avgPerceivedEffort is null", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([
      makeWeek(1, { avgPerceivedEffort: null }),
    ]);

    const raw = await getTrainingLoadHistoryTool.invoke({ weeks: 1 }, cfg);
    const [week] = JSON.parse(raw as string);

    expect(week.avgRpe).toBeNull();
  });

  it("returns empty array when no aggregates found", async () => {
    vi.mocked(prisma.weeklyAggregate.findMany).mockResolvedValue([]);

    const raw = await getTrainingLoadHistoryTool.invoke({ weeks: 12 }, cfg);
    expect(JSON.parse(raw as string)).toEqual([]);
  });

  it("returns error when userId is missing", async () => {
    const raw = await getTrainingLoadHistoryTool.invoke({ weeks: 4 }, {});
    expect(JSON.parse(raw as string)).toMatchObject({ error: expect.any(String) });
  });
});
