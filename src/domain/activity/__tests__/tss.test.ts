import { describe, it, expect } from "vitest";
import { computeTSSWithHR, computeTSSFromPace } from "../tss.js";

describe("computeTSSWithHR", () => {
  it("computes TSS for a moderate 1h run", () => {
    // 1h @ 155bpm, max 180, resting 50
    const tss = computeTSSWithHR(3600, 155, 180, 50);
    expect(tss).toBeGreaterThan(50);
    expect(tss).toBeLessThan(120);
  });

  it("returns 0 for zero duration", () => {
    expect(computeTSSWithHR(0, 155, 180)).toBe(0);
  });

  it("returns 0 when avgHr <= restingHr", () => {
    expect(computeTSSWithHR(3600, 50, 180, 50)).toBe(0);
  });

  it("scales linearly with duration", () => {
    const tss1h = computeTSSWithHR(3600, 155, 180, 50);
    const tss2h = computeTSSWithHR(7200, 155, 180, 50);
    expect(tss2h).toBeCloseTo(tss1h * 2, 0);
  });

  it("higher HR produces higher TSS", () => {
    const low = computeTSSWithHR(3600, 140, 185, 50);
    const high = computeTSSWithHR(3600, 170, 185, 50);
    expect(high).toBeGreaterThan(low);
  });
});

describe("computeTSSFromPace", () => {
  it("computes TSS for a 1h easy run", () => {
    // 1h @ 6:00/km, threshold at 4:30/km
    const tss = computeTSSFromPace(3600, 360, 270);
    expect(tss).toBeGreaterThan(30);
    expect(tss).toBeLessThan(80);
  });

  it("returns 0 for zero duration", () => {
    expect(computeTSSFromPace(0, 360, 270)).toBe(0);
  });

  it("returns 0 for zero pace", () => {
    expect(computeTSSFromPace(3600, 0, 270)).toBe(0);
  });

  it("faster pace produces higher TSS", () => {
    const easy = computeTSSFromPace(3600, 360, 270); // 6:00/km
    const tempo = computeTSSFromPace(3600, 285, 270); // 4:45/km
    expect(tempo).toBeGreaterThan(easy);
  });

  it("caps intensity factor at 1.15", () => {
    // Pace faster than threshold should be capped
    const capped = computeTSSFromPace(3600, 200, 270); // 3:20/km vs 4:30 threshold
    const atCap = computeTSSFromPace(3600, 235, 270); // exactly at cap
    expect(capped).toBeCloseTo(atCap, 0);
  });
});
