import { describe, it, expect } from "vitest";
import {
  updateLoadMetrics,
  recalculateLoadFromScratch,
  getFormStatus,
  computeMonotony,
  computeStrain,
} from "../load.js";

describe("updateLoadMetrics", () => {
  it("increases ATL faster than CTL on a high TSS day", () => {
    const result = updateLoadMetrics(50, 50, 150);
    expect(result.atl).toBeGreaterThan(result.ctl);
    expect(result.tsb).toBeLessThan(0);
  });

  it("ATL decays faster than CTL on rest days", () => {
    // Start from a fatigued state
    const fatigued = updateLoadMetrics(50, 70, 0);
    const nextDay = updateLoadMetrics(fatigued.ctl, fatigued.atl, 0);
    const atlDrop = fatigued.atl - nextDay.atl;
    const ctlDrop = fatigued.ctl - nextDay.ctl;
    expect(atlDrop).toBeGreaterThan(ctlDrop);
  });

  it("TSB is approximately CTL - ATL (within rounding margin)", () => {
    const result = updateLoadMetrics(45, 55, 80);
    // Each value is rounded independently; allow ±0.2 tolerance
    expect(Math.abs(result.tsb - (result.ctl - result.atl))).toBeLessThanOrEqual(0.2);
  });

  it("starts from zero correctly", () => {
    const result = updateLoadMetrics(0, 0, 100);
    expect(result.ctl).toBeGreaterThan(0);
    expect(result.atl).toBeGreaterThan(result.ctl);
  });

  it("returns rounded values to 1 decimal", () => {
    const result = updateLoadMetrics(42.3, 48.7, 95);
    expect(result.ctl.toString()).toMatch(/^\d+(\.\d)?$/);
  });
});

describe("recalculateLoadFromScratch", () => {
  it("returns empty array for empty input", () => {
    expect(recalculateLoadFromScratch([])).toEqual([]);
  });

  it("sorts by date before calculating", () => {
    const d1 = new Date("2024-01-01");
    const d2 = new Date("2024-01-02");
    // Pass unsorted
    const result = recalculateLoadFromScratch([
      { date: d2, tss: 80 },
      { date: d1, tss: 60 },
    ]);
    expect(result[0]!.date).toEqual(d1);
    expect(result[1]!.date).toEqual(d2);
    // CTL after d2 must be higher than after d1
    expect(result[1]!.ctl).toBeGreaterThan(result[0]!.ctl);
  });

  it("accumulates load over multiple days", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      tss: 80,
    }));
    const result = recalculateLoadFromScratch(days);
    const last = result[result.length - 1]!;
    // After 14 days of 80 TSS: ATL should be close to 80, CTL lower
    expect(last.atl).toBeGreaterThan(last.ctl);
    expect(last.ctl).toBeGreaterThan(0);
  });
});

describe("getFormStatus", () => {
  it("returns 'fresh' for TSB > 10", () => {
    expect(getFormStatus(15)).toBe("fresh");
    expect(getFormStatus(11)).toBe("fresh");
  });

  it("returns 'optimal' for TSB between -10 and +10", () => {
    expect(getFormStatus(0)).toBe("optimal");
    expect(getFormStatus(-10)).toBe("optimal");
    expect(getFormStatus(10)).toBe("optimal");
  });

  it("returns 'tired' for TSB between -20 and -10", () => {
    expect(getFormStatus(-11)).toBe("tired");
    expect(getFormStatus(-20)).toBe("tired");
  });

  it("returns 'overreached' for TSB < -20", () => {
    expect(getFormStatus(-21)).toBe("overreached");
    expect(getFormStatus(-35)).toBe("overreached");
  });
});

describe("computeMonotony", () => {
  it("returns 0 for empty input", () => {
    expect(computeMonotony([])).toBe(0);
  });

  it("returns 0 when all values are identical (no variation)", () => {
    expect(computeMonotony([80, 80, 80, 80])).toBe(0);
  });

  it("returns higher value for less variation", () => {
    const highVariation = computeMonotony([0, 150, 0, 150, 0]);
    const lowVariation = computeMonotony([70, 80, 75, 80, 75]);
    expect(lowVariation).toBeGreaterThan(highVariation);
  });
});

describe("computeStrain", () => {
  it("multiplies weekly TSS by monotony", () => {
    expect(computeStrain(400, 2)).toBe(800);
    expect(computeStrain(500, 1.5)).toBe(750);
  });

  it("returns 0 when monotony is 0", () => {
    expect(computeStrain(400, 0)).toBe(0);
  });
});
