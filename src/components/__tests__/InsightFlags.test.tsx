import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import InsightFlags from "../insights/InsightFlags";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { InsightFlag } from "@/lib/insights";

function renderWithProvider(flags: InsightFlag[]) {
  return render(
    <LanguageProvider>
      <InsightFlags flags={flags} />
    </LanguageProvider>
  );
}

const redFlag: InsightFlag = {
  severity: "red",
  metric: "fravaer",
  title: { da: "Højt fravær", en: "High absence" },
  detail: { da: "Detaljer om fravær", en: "Details about absence" },
  value: 10.0,
  reference: 7.4,
  percentileTier: "bottom10",
};

const greenFlag: InsightFlag = {
  severity: "green",
  metric: "inklusion",
  title: { da: "Stærk social inklusion", en: "Strong social inclusion" },
  detail: { da: "Detaljer om inklusion", en: "Details about inclusion" },
  value: 3.3,
  reference: 3.1,
  percentileTier: "top10",
};

describe("InsightFlags", () => {
  it("returns null for empty flags", () => {
    const { container } = renderWithProvider([]);
    expect(container.innerHTML).toBe("");
  });

  it("renders red flags with warning text", () => {
    renderWithProvider([redFlag]);
    expect(screen.getByText("Højt fravær")).toBeInTheDocument();
    expect(screen.getByText("Detaljer om fravær")).toBeInTheDocument();
    // Red flags section has the advarsel header
    expect(screen.getByText(/advarsel/i)).toBeInTheDocument();
  });

  it("renders green flags with strengths text", () => {
    renderWithProvider([greenFlag]);
    expect(screen.getByText("Stærk social inklusion")).toBeInTheDocument();
    expect(screen.getByText("Styrker")).toBeInTheDocument();
  });

  it("renders red flags before green flags", () => {
    renderWithProvider([redFlag, greenFlag]);
    const advarsel = screen.getByText(/advarsel/i);
    const styrker = screen.getByText("Styrker");
    // advarsel should come before styrker in the DOM
    expect(
      advarsel.compareDocumentPosition(styrker) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("applies destructive styling classes to red flag cards", () => {
    renderWithProvider([redFlag]);
    const title = screen.getByText("Højt fravær");
    expect(title.className).toContain("text-destructive");
  });

  it("applies success styling classes to green flag cards", () => {
    renderWithProvider([greenFlag]);
    const title = screen.getByText("Stærk social inklusion");
    expect(title.className).toContain("text-success");
  });
});
