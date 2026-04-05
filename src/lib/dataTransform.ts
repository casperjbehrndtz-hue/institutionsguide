import type { UnifiedInstitution, CompactSchool } from "@/lib/types";

/** Compact dagtilbud record (short keys from compact-data.mjs) */
export interface CompactDagtilbud {
  id: string;
  n: string;
  tp: string;
  ow: string;
  m: string;
  a?: string;
  z?: string;
  c?: string;
  la?: number;
  lo?: number;
  e?: string;
  ph?: string;
  ar?: number;
  mr?: number;
}

export interface CompactDagtilbudData {
  i: CompactDagtilbud[];
}

export interface CompactNormering {
  m: string;   // municipality
  ag: string;  // ageGroup
  y: number;   // year
  r: number;   // ratio
}

function mapSchoolType(t: "f" | "p" | "e" | "u"): string {
  switch (t) {
    case "f": return "folkeskole";
    case "p": return "friskole";
    case "e": return "efterskole";
    case "u": return "ungdomsskole";
    default: return "skole";
  }
}

export function schoolToUnified(s: CompactSchool): UnifiedInstitution | null {
  if (!s.la || !s.lo) return null;
  if (s.t === "u") return null;
  const isEfterskole = s.t === "e";
  return {
    id: `school-${s.id}`,
    name: s.n,
    category: isEfterskole ? "efterskole" : "skole",
    subtype: mapSchoolType(s.t),
    municipality: s.m.replace(" Kommune", ""),
    address: s.a,
    postalCode: s.z,
    city: s.c,
    lat: s.la,
    lng: s.lo,
    monthlyRate: isEfterskole ? (s.wp || null) : (s.sfo || null),
    annualRate: isEfterskole ? (s.yp || null) : (s.sfo ? s.sfo * 12 : null),
    leader: s.l,
    web: s.w,
    email: s.e,
    quality: s.q,
    yearlyPrice: s.yp,
    weeklyPrice: s.wp,
    profiles: s.pr,
    schoolType: s.sc,
    classLevels: s.cl,
    availableSpots: s.av,
    imageUrl: s.img ? `https://www.efterskolerne.dk${s.img}` : undefined,
    edkUrl: s.url ? `https://www.efterskolerne.dk${s.url}` : undefined,
  };
}

export function dagtilbudCategory(type: string): "vuggestue" | "boernehave" | "dagpleje" | "sfo" | "fritidsklub" {
  switch (type) {
    case "dagpleje": return "dagpleje";
    case "sfo": return "sfo";
    case "klub": return "fritidsklub";
    case "boernehave": return "boernehave";
    default: return "vuggestue";
  }
}

export function compactDagtilbudToUnified(d: CompactDagtilbud, prefix: string): UnifiedInstitution | null {
  if (!d.la || !d.lo) return null;
  return {
    id: `${prefix}-${d.id}`,
    name: d.n,
    category: dagtilbudCategory(d.tp),
    subtype: d.ow,
    municipality: d.m,
    address: d.a || "",
    postalCode: d.z || "",
    city: d.c || "",
    lat: d.la,
    lng: d.lo,
    monthlyRate: d.mr || null,
    annualRate: d.ar || null,
    ownership: d.ow,
    email: d.e,
    phone: d.ph,
  };
}
