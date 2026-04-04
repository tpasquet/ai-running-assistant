import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CTASection } from "../CTASection";

describe("CTASection — EmailCapture", () => {
  it("renders the email input and submit button", () => {
    render(<CTASection />);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /s'inscrire/i })).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    render(<CTASection />);
    const input = screen.getByRole("textbox", { name: /email/i });
    const button = screen.getByRole("button", { name: /s'inscrire/i });
    fireEvent.change(input, { target: { value: "not-an-email" } });
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows success message after valid email submission", async () => {
    render(<CTASection />);
    const input = screen.getByRole("textbox", { name: /email/i });
    const button = screen.getByRole("button", { name: /s'inscrire/i });
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/merci/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("does not show error for empty field before interaction", () => {
    render(<CTASection />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
