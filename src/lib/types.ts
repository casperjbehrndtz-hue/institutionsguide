// Compact school format (from skole-data.json)
export interface CompactSchool {
  id: string;
  n: string; // name
  t: "f" | "p" | "e"; // folkeskole/friskole/efterskole
  m: string; // municipality
  a: string; // address
  z: string; // postalCode
  c: string; // city
  la: number; // lat
  lo: number; // lng
  sfo?: number; // sfoMonthlyRate
  l?: string; // leader
  w?: string; // web
  e?: string; // email
  q?: SchoolQuality;
}

export interface SchoolQuality {
  r?: number; // ratingScore 0-5
  o?: number; // overall: 1=over middel, 0=middel, -1=under middel
  ts?: number; tf?: number; tsi?: number; tro?: number; tg?: number; // trivsel
  k?: number; // karaktersnit
  fp?: number; // fravær pct
  kp?: number; // kompetence pct
  sr?: string; // socref niveau
  kv?: number; // klassekvotient
  el?: number; // elevtal
}

// Dagtilbud institution format (from vuggestue/dagpleje data)
export interface DagtilbudInstitution {
  id: string;
  name: string;
  type: "vuggestue" | "boernehave" | "aldersintegreret" | "dagpleje" | "sfo" | "klub" | "andet";
  typeCode: string;
  typeName: string;
  ownership: "kommunal" | "selvejende" | "privat" | "udliciteret";
  municipality: string;
  municipalityCode: string;
  address: string;
  postalCode: string;
  city: string;
  lat: number | null;
  lng: number | null;
  email: string;
  phone: string;
  cvr: string;
  annualRate: number | null;
  monthlyRate: number | null;
}

export interface MunicipalitySummary {
  municipality: string;
  code: string;
  vuggestueCount: number;
  boernehaveCount: number;
  dagplejeCount: number;
  sfoCount: number;
  folkeskoleCount: number;
  friskoleCount: number;
  rates: {
    dagpleje: number | null;
    vuggestue: number | null;
    boernehave: number | null;
    sfo: number | null;
  };
}

// Unified institution for display
export interface UnifiedInstitution {
  id: string;
  name: string;
  category: "vuggestue" | "boernehave" | "dagpleje" | "skole" | "sfo";
  subtype: string; // "folkeskole", "friskole", "kommunal", "privat" etc.
  municipality: string;
  address: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
  monthlyRate: number | null;
  annualRate: number | null;
  ownership?: string;
  leader?: string;
  web?: string;
  email?: string;
  phone?: string;
  quality?: SchoolQuality;
}

// Normering (children-per-staff ratio) — from BUVM API
export interface NormeringEntry {
  municipality: string;
  ageGroup: string; // "dagpleje" | "0-2" | "3-5"
  year: number;
  ratio: number;
}

export type InstitutionCategory = "alle" | "vuggestue" | "boernehave" | "dagpleje" | "skole" | "sfo";
export type AgeGroup = "" | "0-2" | "3-5" | "6-9" | "10-16";
export type SortKey = "name" | "price" | "municipality" | "rating" | "grades" | "absence" | "distance";

// Reviews
export interface Review {
  id: string;
  institutionId: string;
  rating: number; // 1-5
  title: string;
  body: string;
  authorName: string; // display name only
  relationship: 'parent' | 'employee' | 'student' | 'other';
  createdAt: string;
  helpful: number;
  verified: boolean;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
