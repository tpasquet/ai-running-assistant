import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesSection } from "../FeaturesSection";

describe("FeaturesSection", () => {
  it("renders exactly 6 feature cards", () => {
    render(<FeaturesSection />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(6);
  });

  it("renders the section heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("renders CTL/ATL feature", () => {
    render(<FeaturesSection />);
    expect(screen.getByText(/CTL\/ATL/i)).toBeInTheDocument();
  });
});
