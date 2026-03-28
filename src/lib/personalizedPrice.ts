import type { FamilyProfile } from "@/contexts/FamilyContext";
import { calculateFriplads } from "@/lib/childcare/friplads";

/**
 * Calculate the personalized monthly price after fripladstilskud.
 *
 * Takes the institution's monthly rate and the family profile,
 * and returns what the family would actually pay per month.
 *
 * Uses childIndex 0 (first/most expensive child) as the default.
 */
export function calculatePersonalizedPrice(
  monthlyRate: number,
  profile: FamilyProfile
): number {
  if (profile.income == null) return monthlyRate;

  const annualRate = monthlyRate * 12;
  const result = calculateFriplads(
    annualRate,
    profile.income,
    profile.singleParent,
    profile.childCount,
    0 // first child (most expensive)
  );

  return result.monthlyPayment;
}
