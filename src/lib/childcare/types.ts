/** Annual rates in DKK from Danmarks Statistik (RES88) */
export interface MunicipalChildcareRates {
  municipality: string;
  /** Kommunal dagpleje (0-2 år) inkl. frokost — annual */
  dagpleje: number | null;
  /** Vuggestue (0-2 år) — annual */
  vuggestue: number | null;
  /** Børnehave (3-5 år) — annual */
  boernehave: number | null;
  /** Skolefritidsordninger/SFO (6-9 år) — annual */
  sfo: number | null;
  /** Fritidshjem (6-9 år) — annual, mostly null (merged into SFO) */
  fritidshjem: number | null;
}

export type InstitutionType = "dagpleje" | "vuggestue" | "boernehave" | "sfo";

export interface FripladsResult {
  /** Full municipal rate (monthly) */
  fullMonthlyRate: number;
  /** What parent actually pays after subsidy (monthly) */
  monthlyPayment: number;
  /** Subsidy amount (monthly) */
  monthlySubsidy: number;
  /** Subsidy percentage (0-100) */
  subsidyPercent: number;
  /** Sibling discount applied (monthly) */
  siblingDiscount: number;
  /** Annual total parent payment */
  annualPayment: number;
  /** Annual savings vs full rate */
  annualSavings: number;
}

export interface ChildcareComparison {
  municipality: string;
  type: InstitutionType;
  annualRate: number;
  monthlyRate: number;
  afterFriplads: FripladsResult;
}

export interface ChildcareInput {
  municipality: string;
  householdIncome: number;
  numberOfChildrenInDagtilbud: number;
  childAges: number[]; // Age of each child — determines vuggestue vs børnehave
  isSingleParent: boolean;
}
