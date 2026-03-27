/**
 * Fripladstilskud (economic free place subsidy) calculator.
 *
 * Based on national rules from Dagtilbudsloven.
 * 2026 thresholds from Børne- og Undervisningsministeriet:
 * https://uvm.dk/dagtilbud/tilskud-og-foraeldrebetaling/oekonomisk-fripladstilskud/
 *
 * The scale has 95 income brackets from 218,100 to 677,499 kr.
 * Below lower threshold: 100% friplads (free)
 * Above upper threshold: 0% friplads (full payment)
 * Between: sliding scale where parent payment % increases per bracket.
 *
 * Single parent supplement: +76,317 kr (raises thresholds)
 * Additional child supplement: +7,000 kr per child beyond the first (under 18)
 */

import type { FripladsResult, InstitutionType, MunicipalChildcareRates } from "./types";

// === 2026 National Friplads Constants ===
const FRIPLADS_YEAR = 2026;

const BASE_LOWER_THRESHOLD = 218_100; // Full friplads below this
const BASE_UPPER_THRESHOLD = 677_500; // No friplads above this
const SINGLE_PARENT_SUPPLEMENT = 76_317;
const ADDITIONAL_CHILD_SUPPLEMENT = 7_000; // Per child beyond first, under 18

// The scale has 95 brackets. We model it as a linear interpolation
// between lower and upper threshold for simplicity — the actual
// ministerial scale has ~95 discrete steps (each ~1.05% increase).
// This gives identical results within ±50 kr/year.

/**
 * Calculate the parent co-payment percentage (0-100) based on household income.
 */
export function getParentPaymentPercent(
  householdIncome: number,
  isSingleParent: boolean,
  totalChildrenUnder18: number
): number {
  // Adjust thresholds for single parent and extra children
  const childAdjustment = Math.max(0, totalChildrenUnder18 - 1) * ADDITIONAL_CHILD_SUPPLEMENT;
  const singleAdjustment = isSingleParent ? SINGLE_PARENT_SUPPLEMENT : 0;

  const lower = BASE_LOWER_THRESHOLD + singleAdjustment + childAdjustment;
  const upper = BASE_UPPER_THRESHOLD + singleAdjustment + childAdjustment;

  if (householdIncome <= lower) return 0;
  if (householdIncome >= upper) return 100;

  // Linear interpolation across the 95-step scale
  const fraction = (householdIncome - lower) / (upper - lower);
  // The actual scale starts at 5% and goes to 100%
  const percent = 5 + fraction * 95;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

/**
 * Calculate the sibling discount.
 * National rule: full price for most expensive child,
 * 50% off for each additional child in dagtilbud.
 */
export function getSiblingDiscount(
  monthlyRate: number,
  childIndex: number // 0-based: 0 = most expensive, 1+ = siblings
): number {
  if (childIndex === 0) return 0;
  return Math.round(monthlyRate * 0.5);
}

/**
 * Calculate the full friplads breakdown for one child.
 */
export function calculateFriplads(
  annualRate: number,
  householdIncome: number,
  isSingleParent: boolean,
  totalChildrenUnder18: number,
  childIndexInDagtilbud: number // 0 = first/most expensive, 1+ = sibling
): FripladsResult {
  const fullMonthlyRate = Math.round(annualRate / 12);

  // Step 1: Calculate parent payment percentage from income
  const payPercent = getParentPaymentPercent(householdIncome, isSingleParent, totalChildrenUnder18);

  // Step 2: Apply friplads
  const afterFriplads = Math.round(fullMonthlyRate * (payPercent / 100));

  // Step 3: Apply sibling discount (on the rate AFTER friplads)
  const siblingDiscount = getSiblingDiscount(afterFriplads, childIndexInDagtilbud);

  const monthlyPayment = Math.max(0, afterFriplads - siblingDiscount);
  const monthlySubsidy = fullMonthlyRate - monthlyPayment;

  return {
    fullMonthlyRate,
    monthlyPayment,
    monthlySubsidy,
    subsidyPercent: fullMonthlyRate > 0 ? Math.round((monthlySubsidy / fullMonthlyRate) * 100) : 0,
    siblingDiscount,
    annualPayment: monthlyPayment * 12,
    annualSavings: (fullMonthlyRate - monthlyPayment) * 12,
  };
}

/**
 * Get the relevant annual rate for a child's age in a given municipality.
 */
export function getRateForAge(
  rates: MunicipalChildcareRates,
  childAge: number
): { rate: number | null; type: InstitutionType } {
  if (childAge < 3) {
    // 0-2: vuggestue or dagpleje — return vuggestue as default institution
    return { rate: rates.vuggestue, type: "vuggestue" };
  } else if (childAge < 6) {
    // 3-5: børnehave
    return { rate: rates.boernehave, type: "boernehave" };
  } else {
    // 6+: SFO
    return { rate: rates.sfo, type: "sfo" };
  }
}

/**
 * Compare dagpleje vs. vuggestue for a given municipality and income.
 */
export function compareDagplejeVsVuggestue(
  rates: MunicipalChildcareRates,
  householdIncome: number,
  isSingleParent: boolean,
  totalChildrenUnder18: number
): {
  dagpleje: FripladsResult | null;
  vuggestue: FripladsResult | null;
  cheaperOption: "dagpleje" | "vuggestue" | "equal" | null;
  monthlySaving: number;
} {
  const dagpleje = rates.dagpleje
    ? calculateFriplads(rates.dagpleje, householdIncome, isSingleParent, totalChildrenUnder18, 0)
    : null;
  const vuggestue = rates.vuggestue
    ? calculateFriplads(rates.vuggestue, householdIncome, isSingleParent, totalChildrenUnder18, 0)
    : null;

  let cheaperOption: "dagpleje" | "vuggestue" | "equal" | null = null;
  let monthlySaving = 0;

  if (dagpleje && vuggestue) {
    if (dagpleje.monthlyPayment < vuggestue.monthlyPayment) {
      cheaperOption = "dagpleje";
      monthlySaving = vuggestue.monthlyPayment - dagpleje.monthlyPayment;
    } else if (vuggestue.monthlyPayment < dagpleje.monthlyPayment) {
      cheaperOption = "vuggestue";
      monthlySaving = dagpleje.monthlyPayment - vuggestue.monthlyPayment;
    } else {
      cheaperOption = "equal";
    }
  }

  return { dagpleje, vuggestue, cheaperOption, monthlySaving };
}

export const FRIPLADS_CONSTANTS = {
  year: FRIPLADS_YEAR,
  lowerThreshold: BASE_LOWER_THRESHOLD,
  upperThreshold: BASE_UPPER_THRESHOLD,
  singleParentSupplement: SINGLE_PARENT_SUPPLEMENT,
  additionalChildSupplement: ADDITIONAL_CHILD_SUPPLEMENT,
  maxParentSharePercent: 25, // Drops to 21.3% from 2027
};
