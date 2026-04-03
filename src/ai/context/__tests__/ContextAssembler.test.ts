import { describe, it, expect } from "vitest";
import { ContextAssembler } from "../ContextAssembler.js";
import { SCENARIO_OVERREACHED, SCENARIO_FRESH } from "../../mocks/scenarios.fixture.js";

describe("ContextAssembler", () => {
  const assembler = new ContextAssembler();

  it("should assemble overreached athlete context", () => {
    const result = assembler.assemble(SCENARIO_OVERREACHED);

    expect(result).toContain("## Athlete Profile");
    expect(result).toContain("Sub-35:00 10K");
    expect(result).toContain("Level: intermediate");
    expect(result).toContain("## Training Load");
    expect(result).toContain("## Current State");
    expect(result).toContain("TSB: -25");
    expect(result).toContain("Status: OVERREACHED");
    expect(result).toContain("## Recent Activities");
    expect(result).toContain("## Subjective Feedback");
  });

  it("should assemble fresh athlete context", () => {
    const result = assembler.assemble(SCENARIO_FRESH);

    expect(result).toContain("Level: intermediate");
    expect(result).toContain("TSB: +8");
    expect(result).toContain("Status: OPTIMAL");
  });

  it("should format pace correctly", () => {
    const result = assembler.assemble(SCENARIO_OVERREACHED);

    // Should contain pace in format M:SS/km
    expect(result).toMatch(/\d:\d{2}\/km/);
  });

  it("should limit recent activities to 5", () => {
    const result = assembler.assemble(SCENARIO_OVERREACHED);

    expect(result).toContain("Recent Activities (last 5)");
  });

  it("should include pain summary if present", () => {
    const result = assembler.assemble(SCENARIO_OVERREACHED);

    // Overreached scenario has no pain, so should say "none reported"
    expect(result).toContain("Pain: none reported");
  });

  it("should produce reasonable token count", () => {
    const result = assembler.assemble(SCENARIO_OVERREACHED);

    // Rough estimation: ~4 chars per token
    // Target: 800-1000 tokens = 3200-4000 characters
    const charCount = result.length;

    expect(charCount).toBeGreaterThan(500);
    expect(charCount).toBeLessThan(6000);
  });
});
