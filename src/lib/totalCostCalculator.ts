import { calculateFriplads, FRIPLADS_CONSTANTS } from "@/lib/childcare/friplads";
import { getChildcareRates, CHILDCARE_RATES_2025 } from "@/lib/childcare/rates";

// Duration in months for each phase
export const VUGGESTUE_MONTHS = 36; // 0-2 years
export const BOERNEHAVE_MONTHS = 36; // 3-5 years
export const SFO_MONTHS = 48; // 6-9 years (4 years)
export const TOTAL_MONTHS = VUGGESTUE_MONTHS + BOERNEHAVE_MONTHS + SFO_MONTHS;

export interface PhaseResult {
  label: string;
  labelEn: string;
  ageRange: string;
  ageRangeEn: string;
  months: number;
  monthlyFull: number;
  monthlyAfterFriplads: number;
  totalFull: number;
  totalAfterFriplads: number;
  available: boolean;
}

export interface MunicipalTotal {
  municipality: string;
  grandTotal: number;
  grandTotalFull: number;
}

interface PhaseConfig {
  label: string;
  labelEn: string;
  ageRange: string;
  ageRangeEn: string;
  months: number;
  rateKey: "vuggestue" | "boernehave" | "sfo";
}

const PHASE_CONFIGS: PhaseConfig[] = [
  { label: "Vuggestue", labelEn: "Nursery", ageRange: "0-2 år", ageRangeEn: "0-2 yrs", months: VUGGESTUE_MONTHS, rateKey: "vuggestue" },
  { label: "Børnehave", labelEn: "Kindergarten", ageRange: "3-5 år", ageRangeEn: "3-5 yrs", months: BOERNEHAVE_MONTHS, rateKey: "boernehave" },
  { label: "SFO", labelEn: "After-school care", ageRange: "6-9 år", ageRangeEn: "6-9 yrs", months: SFO_MONTHS, rateKey: "sfo" },
];

export function computePhases(
  municipality: string,
  income: number,
  singleParent: boolean,
  children: number
): PhaseResult[] {
  const rates = getChildcareRates(municipality);
  if (!rates) return [];

  return PHASE_CONFIGS.map((config) => {
    const rate = rates[config.rateKey];
    if (rate !== null) {
      const calc = calculateFriplads(rate, income, singleParent, children, 0);
      return {
        label: config.label,
        labelEn: config.labelEn,
        ageRange: config.ageRange,
        ageRangeEn: config.ageRangeEn,
        months: config.months,
        monthlyFull: calc.fullMonthlyRate,
        monthlyAfterFriplads: calc.monthlyPayment,
        totalFull: calc.fullMonthlyRate * config.months,
        totalAfterFriplads: calc.monthlyPayment * config.months,
        available: true,
      };
    }
    return {
      label: config.label,
      labelEn: config.labelEn,
      ageRange: config.ageRange,
      ageRangeEn: config.ageRangeEn,
      months: config.months,
      monthlyFull: 0,
      monthlyAfterFriplads: 0,
      totalFull: 0,
      totalAfterFriplads: 0,
      available: false,
    };
  });
}

export function computeAllMunicipalTotals(
  income: number,
  singleParent: boolean,
  children: number
): MunicipalTotal[] {
  return CHILDCARE_RATES_2025.map((r) => {
    const phases = computePhases(r.municipality, income, singleParent, children);
    const grandTotal = phases.reduce((sum, p) => sum + p.totalAfterFriplads, 0);
    const grandTotalFull = phases.reduce((sum, p) => sum + p.totalFull, 0);
    return { municipality: r.municipality, grandTotal, grandTotalFull };
  }).sort((a, b) => a.grandTotal - b.grandTotal);
}

export { FRIPLADS_CONSTANTS };
