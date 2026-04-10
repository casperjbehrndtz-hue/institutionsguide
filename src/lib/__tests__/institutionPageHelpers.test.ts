import { describe, it, expect } from "vitest";
import { categoryPath, buildInstitutionFaqs } from "@/lib/institutionPageHelpers";
import type { UnifiedInstitution, InstitutionStats } from "@/lib/types";

// Minimal institution fixture
function makeInst(overrides: Partial<UnifiedInstitution> = {}): UnifiedInstitution {
  return {
    id: "vug-123",
    name: "Solsikken",
    category: "vuggestue",
    subtype: "kommunal",
    municipality: "Aarhus",
    address: "Nørregade 5",
    postalCode: "8000",
    city: "Aarhus C",
    lat: 56.15,
    lng: 10.21,
    monthlyRate: 3500,
    annualRate: null,
    ownership: "Kommunal",
    ...overrides,
  };
}

function makeNearby(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...makeInst({ id: `vug-near-${i}`, name: `Nearby ${i + 1}` }),
    dist: (i + 1) * 0.5,
  }));
}

describe("categoryPath", () => {
  it("returns known category paths", () => {
    expect(categoryPath("vuggestue")).toBe("/vuggestue");
    expect(categoryPath("skole")).toBe("/skole");
    expect(categoryPath("efterskole")).toBe("/efterskole");
    expect(categoryPath("gymnasium")).toBe("/gymnasium");
  });

  it("returns / for unknown categories", () => {
    expect(categoryPath("unknown")).toBe("/");
    expect(categoryPath("")).toBe("/");
  });
});

describe("buildInstitutionFaqs", () => {
  it("includes location FAQ when address exists", () => {
    const inst = makeInst();
    const faqs = buildInstitutionFaqs(inst, "Vuggestuer", [], {});
    const locationFaq = faqs.find((f) => f.q.includes("Hvor ligger"));
    expect(locationFaq).toBeDefined();
    expect(locationFaq!.a).toContain("Nørregade 5");
    expect(locationFaq!.a).toContain("Aarhus Kommune");
  });

  it("includes price FAQ when monthlyRate > 0", () => {
    const inst = makeInst({ monthlyRate: 3500 });
    const faqs = buildInstitutionFaqs(inst, "Vuggestuer", [], {});
    const priceFaq = faqs.find((f) => f.q.includes("koster"));
    expect(priceFaq).toBeDefined();
    expect(priceFaq!.a).toContain("3.500");
  });

  it("skips price FAQ when no monthlyRate", () => {
    const inst = makeInst({ monthlyRate: null });
    const faqs = buildInstitutionFaqs(inst, "Vuggestuer", [], {});
    expect(faqs.find((f) => f.q.includes("koster"))).toBeUndefined();
  });

  it("includes normering FAQ for vuggestue with stats", () => {
    const inst = makeInst({ id: "vug-123", category: "vuggestue" });
    const stats: Record<string, InstitutionStats> = {
      "123": { normering02: 3.2 } as InstitutionStats,
    };
    const faqs = buildInstitutionFaqs(inst, "Vuggestuer", [], stats);
    const normFaq = faqs.find((f) => f.q.includes("normering"));
    expect(normFaq).toBeDefined();
    expect(normFaq!.a).toContain("3.2");
    expect(normFaq!.a).toContain("0-2 år");
  });

  it("includes school quality FAQs", () => {
    const inst = makeInst({
      category: "skole",
      quality: { k: 7.5, ts: 4.2 } as UnifiedInstitution["quality"],
    });
    const faqs = buildInstitutionFaqs(inst, "Skoler", [], {});
    expect(faqs.find((f) => f.q.includes("karaktersnit"))).toBeDefined();
    expect(faqs.find((f) => f.q.includes("god skole"))).toBeDefined();
  });

  it("includes nearby FAQ when >= 3 nearby institutions", () => {
    const inst = makeInst();
    const nearby = makeNearby(3);
    const faqs = buildInstitutionFaqs(inst, "Vuggestuer", nearby, {});
    const nearbyFaq = faqs.find((f) => f.q.includes("tæt på"));
    expect(nearbyFaq).toBeDefined();
    expect(nearbyFaq!.a).toContain("Nearby 1");
    expect(nearbyFaq!.a).toContain("Nearby 2");
    expect(nearbyFaq!.a).toContain("Nearby 3");
  });

  it("skips nearby FAQ when < 3 nearby institutions", () => {
    const inst = makeInst();
    const nearby = makeNearby(2);
    const faqs = buildInstitutionFaqs(inst, "Vuggestuer", nearby, {});
    expect(faqs.find((f) => f.q.includes("tæt på"))).toBeUndefined();
  });

  it("returns empty array for institution with no data", () => {
    const inst = makeInst({ address: "", monthlyRate: null });
    const faqs = buildInstitutionFaqs(inst, "Vuggestuer", [], {});
    // Only address FAQ would be included, but address is empty string (falsy)
    expect(faqs.length).toBe(0);
  });
});
