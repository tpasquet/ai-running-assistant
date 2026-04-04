import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "../HeroSection";

describe("HeroSection", () => {
  it("renders the main headline", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the primary CTA button linking to #cta", () => {
    render(<HeroSection />);
    const cta = screen.getByRole("link", { name: /rejoindre la beta/i });
    expect(cta).toHaveAttribute("href", "#cta");
  });

  it("renders the demo link", () => {
    render(<HeroSection />);
    expect(screen.getByRole("link", { name: /voir la démo/i })).toBeInTheDocument();
  });
});
