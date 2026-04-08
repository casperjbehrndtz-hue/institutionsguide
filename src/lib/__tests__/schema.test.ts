import { describe, it, expect } from "vitest";
import {
  institutionSchema,
  faqSchema,
  breadcrumbSchema,
  websiteSchema,
  itemListSchema,
} from "../schema";
import type { UnifiedInstitution } from "../types";

const baseInst: UnifiedInstitution = {
  id: "inst-1",
  name: "Test Skole",
  category: "skole",
  subtype: "folkeskole",
  municipality: "København",
  address: "Testvej 1",
  city: "København",
  postalCode: 2100,
  lat: 55.7,
  lng: 12.5,
  ownership: "kommunal",
  monthlyRate: null,
  yearlyPrice: null,
  phone: null,
  email: null,
  web: null,
  quality: null,
};

describe("institutionSchema", () => {
  it("returns School type for skole category", () => {
    const result = institutionSchema(baseInst, "https://example.com") as Record<string, unknown>;
    expect(result["@type"]).toBe("School");
  });

  it("returns ChildCare type for vuggestue category", () => {
    const inst = { ...baseInst, category: "vuggestue" as const };
    const result = institutionSchema(inst, "https://example.com") as Record<string, unknown>;
    expect(result["@type"]).toBe("ChildCare");
  });

  it("includes address fields", () => {
    const result = institutionSchema(baseInst, "https://example.com") as Record<string, Record<string, string>>;
    expect(result.address.streetAddress).toBe("Testvej 1");
    expect(result.address.addressCountry).toBe("DK");
  });

  it("includes phone when present", () => {
    const inst = { ...baseInst, phone: "12345678" };
    const result = institutionSchema(inst, "https://example.com") as Record<string, unknown>;
    expect(result.telephone).toBe("12345678");
  });

  it("omits phone when null", () => {
    const result = institutionSchema(baseInst, "https://example.com") as Record<string, unknown>;
    expect(result).not.toHaveProperty("telephone");
  });

  it("includes aggregateRating when reviewData provided", () => {
    const result = institutionSchema(baseInst, "https://example.com", {
      averageRating: 4.5,
      totalReviews: 10,
    }) as Record<string, Record<string, unknown>>;
    expect(result.aggregateRating.ratingValue).toBe(4.5);
    expect(result.aggregateRating.ratingCount).toBe(10);
  });

  it("uses yearlyPrice for priceRange when available", () => {
    const inst = { ...baseInst, yearlyPrice: 12000 };
    const result = institutionSchema(inst, "https://example.com") as Record<string, unknown>;
    expect(result.priceRange).toBe("12000 DKK/år");
  });

  it("uses monthlyRate for priceRange when no yearlyPrice", () => {
    const inst = { ...baseInst, monthlyRate: 1000 };
    const result = institutionSchema(inst, "https://example.com") as Record<string, unknown>;
    expect(result.priceRange).toBe("1000 DKK/md");
  });
});

describe("faqSchema", () => {
  it("wraps questions in FAQPage schema", () => {
    const result = faqSchema([{ q: "Hvad?", a: "Svar" }]) as Record<string, unknown>;
    expect(result["@type"]).toBe("FAQPage");
    const entities = result.mainEntity as Record<string, string>[];
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe("Hvad?");
  });
});

describe("breadcrumbSchema", () => {
  it("creates BreadcrumbList with positions", () => {
    const result = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Skoler", url: "/skole" },
    ]) as Record<string, unknown>;
    expect(result["@type"]).toBe("BreadcrumbList");
    const items = result.itemListElement as Record<string, unknown>[];
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
  });
});

describe("websiteSchema", () => {
  it("includes SearchAction", () => {
    const result = websiteSchema("https://example.com") as Record<string, Record<string, string>>;
    expect(result["@type"]).toBe("WebSite");
    expect(result.potentialAction["@type"]).toBe("SearchAction");
  });
});

describe("itemListSchema", () => {
  it("limits to 10 items", () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      name: `Item ${i}`,
      url: `/item/${i}`,
    }));
    const result = itemListSchema(items, "https://example.com") as Record<string, unknown>;
    expect(result.numberOfItems).toBe(15);
    expect((result.itemListElement as unknown[]).length).toBe(10);
  });

  it("includes listName when provided", () => {
    const result = itemListSchema([], "https://example.com", "Test List") as Record<string, unknown>;
    expect(result.name).toBe("Test List");
  });
});
