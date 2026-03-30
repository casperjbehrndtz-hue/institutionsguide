import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Baby,
  CheckCircle2,
  MapPin,
  Wallet,
  Sparkles,
  Users,
  Home,
  Building2,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAllMunicipalities, getChildcareRates } from "@/lib/childcare/rates";
import { calculateFriplads } from "@/lib/childcare/friplads";
import { formatDKK } from "@/lib/format";
import { toSlug } from "@/lib/slugs";
import type { InstitutionType } from "@/lib/childcare/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgeGroup = "0-1" | "1-2" | "2-3" | "3-5" | "6+";

type Priority =
  | "lav-pris"
  | "lille-gruppe"
  | "uddannet-personale"
  | "taet-paa-hjemmet"
  | "fleksible-tider"
  | "naturoplevelser";

interface WizardState {
  age: AgeGroup | null;
  priorities: Priority[];
  municipality: string;
  income: number | null; // null = skipped
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = 5;

const AGE_OPTIONS: { value: AgeGroup; da: string; en: string; emoji: string }[] = [
  { value: "0-1", da: "0-1 år", en: "0-1 years", emoji: "👶" },
  { value: "1-2", da: "1-2 år", en: "1-2 years", emoji: "🧒" },
  { value: "2-3", da: "2-3 år", en: "2-3 years", emoji: "🧒" },
  { value: "3-5", da: "3-5 år", en: "3-5 years", emoji: "👧" },
  { value: "6+", da: "6+ år", en: "6+ years", emoji: "🎒" },
];

const PRIORITY_OPTIONS: { value: Priority; da: string; en: string; icon: string }[] = [
  { value: "lav-pris", da: "Lav pris", en: "Low price", icon: "💰" },
  { value: "lille-gruppe", da: "Lille gruppe", en: "Small group", icon: "👥" },
  { value: "uddannet-personale", da: "Uddannet personale", en: "Qualified staff", icon: "🎓" },
  { value: "taet-paa-hjemmet", da: "Tæt på hjemmet", en: "Close to home", icon: "🏠" },
  { value: "fleksible-tider", da: "Fleksible åbningstider", en: "Flexible hours", icon: "🕐" },
  { value: "naturoplevelser", da: "Naturoplevelser", en: "Nature experiences", icon: "🌿" },
];

const MAX_PRIORITIES = 3;

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------

type RecommendedType = "dagpleje" | "vuggestue" | "boernehave" | "sfo";

interface Recommendation {
  primary: RecommendedType;
  alternatives: RecommendedType[];
  reasons: { da: string; en: string }[];
}

function getRecommendation(state: WizardState): Recommendation {
  const { age, priorities } = state;
  const pSet = new Set(priorities);

  // Age-based filtering
  if (age === "6+") {
    return {
      primary: "sfo",
      alternatives: [],
      reasons: [
        {
          da: "Til børn over 6 år er SFO (skolefritidsordning) det naturlige valg efter skolestart.",
          en: "For children over 6, SFO (after-school care) is the natural choice after school starts.",
        },
      ],
    };
  }

  if (age === "3-5") {
    const reasons: { da: string; en: string }[] = [
      {
        da: "Til børn mellem 3-5 år er børnehave den oplagte pasningsform.",
        en: "For children aged 3-5, kindergarten is the obvious childcare type.",
      },
    ];
    if (pSet.has("naturoplevelser")) {
      reasons.push({
        da: "Mange børnehaver har fokus på udeliv og naturoplevelser — søg efter skov- eller naturbørnehaver.",
        en: "Many kindergartens focus on outdoor life and nature — look for forest or nature kindergartens.",
      });
    }
    return { primary: "boernehave", alternatives: [], reasons };
  }

  // Age 0-3: dagpleje vs vuggestue
  const dagplejeScore = computeScore("dagpleje", pSet);
  const vuggestueScore = computeScore("vuggestue", pSet);

  if (dagplejeScore > vuggestueScore) {
    return {
      primary: "dagpleje",
      alternatives: ["vuggestue"],
      reasons: buildReasons("dagpleje", pSet),
    };
  }
  if (vuggestueScore > dagplejeScore) {
    return {
      primary: "vuggestue",
      alternatives: ["dagpleje"],
      reasons: buildReasons("vuggestue", pSet),
    };
  }

  // Tie — default to vuggestue as "safe" recommendation
  return {
    primary: "vuggestue",
    alternatives: ["dagpleje"],
    reasons: [
      {
        da: "Både dagpleje og vuggestue passer godt til dine prioriteter. Vuggestue giver bredere sociale rammer, mens dagpleje tilbyder en mere hjemlig atmosfære.",
        en: "Both childminder and nursery fit your priorities. Nursery offers a broader social setting, while childminder provides a more home-like atmosphere.",
      },
    ],
  };
}

function computeScore(type: "dagpleje" | "vuggestue", pSet: Set<Priority>): number {
  let score = 0;
  if (type === "dagpleje") {
    if (pSet.has("lav-pris")) score += 2;
    if (pSet.has("lille-gruppe")) score += 3;
    if (pSet.has("taet-paa-hjemmet")) score += 2;
    if (pSet.has("naturoplevelser")) score += 1;
    if (pSet.has("fleksible-tider")) score += 1;
    if (pSet.has("uddannet-personale")) score -= 1;
  } else {
    if (pSet.has("uddannet-personale")) score += 3;
    if (pSet.has("fleksible-tider")) score += 2;
    if (pSet.has("naturoplevelser")) score += 1;
    if (pSet.has("lille-gruppe")) score -= 1;
    if (pSet.has("lav-pris")) score -= 1;
  }
  return score;
}

function buildReasons(type: "dagpleje" | "vuggestue", pSet: Set<Priority>): { da: string; en: string }[] {
  const reasons: { da: string; en: string }[] = [];
  if (type === "dagpleje") {
    if (pSet.has("lille-gruppe"))
      reasons.push({
        da: "Dagpleje har typisk kun 3-4 børn per voksen — perfekt til dig, der ønsker en lille gruppe.",
        en: "Childminders typically have only 3-4 children per adult — perfect for small group preference.",
      });
    if (pSet.has("lav-pris"))
      reasons.push({
        da: "Dagpleje er i de fleste kommuner billigere end vuggestue.",
        en: "Childminders are cheaper than nurseries in most municipalities.",
      });
    if (pSet.has("taet-paa-hjemmet"))
      reasons.push({
        da: "Dagplejere er spredt ud i lokalområdet, så der er ofte en tæt på dit hjem.",
        en: "Childminders are spread across neighborhoods, so there is often one close to your home.",
      });
    if (reasons.length === 0)
      reasons.push({
        da: "Dagpleje giver en hjemlig og tryg ramme med få børn og en fast voksen.",
        en: "Childminders provide a home-like, secure setting with few children and a dedicated adult.",
      });
  } else {
    if (pSet.has("uddannet-personale"))
      reasons.push({
        da: "Vuggestuer har typisk uddannede pædagoger med en pædagogisk læreplan.",
        en: "Nurseries typically have qualified pedagogues with an educational curriculum.",
      });
    if (pSet.has("fleksible-tider"))
      reasons.push({
        da: "Vuggestuer har ofte længere åbningstider end dagpleje.",
        en: "Nurseries often have longer opening hours than childminders.",
      });
    if (reasons.length === 0)
      reasons.push({
        da: "Vuggestue giver bred socialisering med andre børn og et struktureret pædagogisk miljø.",
        en: "Nursery provides broad socialization with other children and a structured pedagogical environment.",
      });
  }
  return reasons;
}

// ---------------------------------------------------------------------------
// Comparison data
// ---------------------------------------------------------------------------

interface ComparisonRow {
  da: string;
  en: string;
  dagpleje: { da: string; en: string };
  vuggestue: { da: string; en: string };
  boernehave: { da: string; en: string };
}

const COMPARISON_TABLE: ComparisonRow[] = [
  {
    da: "Alder",
    en: "Age",
    dagpleje: { da: "0-2 år", en: "0-2 years" },
    vuggestue: { da: "0-2 år", en: "0-2 years" },
    boernehave: { da: "3-5 år", en: "3-5 years" },
  },
  {
    da: "Typisk gruppestørrelse",
    en: "Typical group size",
    dagpleje: { da: "3-4 børn", en: "3-4 children" },
    vuggestue: { da: "10-14 børn", en: "10-14 children" },
    boernehave: { da: "20-25 børn", en: "20-25 children" },
  },
  {
    da: "Normering (børn pr. voksen)",
    en: "Staff ratio (children per adult)",
    dagpleje: { da: "3-4:1", en: "3-4:1" },
    vuggestue: { da: "3:1 (lovkrav)", en: "3:1 (legal min.)" },
    boernehave: { da: "6:1 (lovkrav)", en: "6:1 (legal min.)" },
  },
  {
    da: "Personale",
    en: "Staff",
    dagpleje: { da: "Uddannet dagplejer", en: "Trained childminder" },
    vuggestue: { da: "Pædagoger + medhjælpere", en: "Pedagogues + assistants" },
    boernehave: { da: "Pædagoger + medhjælpere", en: "Pedagogues + assistants" },
  },
  {
    da: "Rammer",
    en: "Setting",
    dagpleje: { da: "Privat hjem", en: "Private home" },
    vuggestue: { da: "Institution", en: "Institution" },
    boernehave: { da: "Institution", en: "Institution" },
  },
  {
    da: "Fordele",
    en: "Pros",
    dagpleje: { da: "Hjemlig, lille gruppe, ofte billigere", en: "Home-like, small group, often cheaper" },
    vuggestue: { da: "Uddannet personale, længere åbningstid, social stimulering", en: "Qualified staff, longer hours, social stimulation" },
    boernehave: { da: "Skoleforberedende, store legepladser, mange aktiviteter", en: "School preparation, large playgrounds, many activities" },
  },
  {
    da: "Ulemper",
    en: "Cons",
    dagpleje: { da: "Sårbar ved sygdom, færre børn at lege med", en: "Vulnerable to illness, fewer playmates" },
    vuggestue: { da: "Større grupper, kan være dyrere", en: "Larger groups, can be more expensive" },
    boernehave: { da: "Store grupper, mere støj", en: "Large groups, more noise" },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS_DA: Record<RecommendedType, string> = {
  dagpleje: "Dagpleje",
  vuggestue: "Vuggestue",
  boernehave: "Børnehave",
  sfo: "SFO",
};

const TYPE_LABELS_EN: Record<RecommendedType, string> = {
  dagpleje: "Childminder",
  vuggestue: "Nursery",
  boernehave: "Kindergarten",
  sfo: "After-school care",
};

const TYPE_ICONS: Record<RecommendedType, typeof Home> = {
  dagpleje: Users,
  vuggestue: Home,
  boernehave: Building2,
  sfo: GraduationCap,
};

const TYPE_URL: Record<RecommendedType, string> = {
  dagpleje: "dagpleje",
  vuggestue: "vuggestue",
  boernehave: "boernehave",
  sfo: "sfo",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GuidePage() {
  const { language } = useLanguage();
  const isDa = language === "da";
  const municipalities = useMemo(() => getAllMunicipalities(), []);

  // Wizard state
  const [step, setStep] = useState(1);
  const [wizard, setWizard] = useState<WizardState>({
    age: null,
    priorities: [],
    municipality: "København",
    income: null,
  });
  const [incomeInput, setIncomeInput] = useState("");
  const [skipIncome, setSkipIncome] = useState(false);

  // Ensure municipality defaults to a valid one
  const validMunicipality = municipalities.includes(wizard.municipality)
    ? wizard.municipality
    : municipalities.find((m) => m === "København") ?? municipalities[0];

  // Navigation
  const canNext = useCallback((): boolean => {
    if (step === 1) return wizard.age !== null;
    if (step === 2) return wizard.priorities.length >= 1;
    if (step === 3) return true;
    if (step === 4) return true;
    return false;
  }, [step, wizard]);

  const next = useCallback(() => {
    if (step < STEPS && canNext()) setStep((s) => s + 1);
  }, [step, canNext]);

  const back = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
  }, [step]);

  // Handlers
  const selectAge = useCallback((age: AgeGroup) => {
    setWizard((w) => ({ ...w, age }));
  }, []);

  const togglePriority = useCallback((p: Priority) => {
    setWizard((w) => {
      const has = w.priorities.includes(p);
      if (has) return { ...w, priorities: w.priorities.filter((x) => x !== p) };
      if (w.priorities.length >= MAX_PRIORITIES) return w;
      return { ...w, priorities: [...w.priorities, p] };
    });
  }, []);

  const selectMunicipality = useCallback((m: string) => {
    setWizard((w) => ({ ...w, municipality: m }));
  }, []);

  const handleIncomeChange = useCallback((raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    setIncomeInput(cleaned ? Number(cleaned).toLocaleString("da-DK") : "");
    const num = Number(cleaned);
    setWizard((w) => ({ ...w, income: cleaned && !isNaN(num) ? num : null }));
  }, []);

  // --- Result computation ---
  const recommendation = useMemo(() => getRecommendation(wizard), [wizard]);

  const rates = useMemo(() => getChildcareRates(validMunicipality), [validMunicipality]);

  const priceEstimate = useMemo(() => {
    if (!rates) return null;
    const t = recommendation.primary as InstitutionType;
    const annualRate = rates[t] ?? null;
    if (!annualRate) return null;
    const monthlyFull = Math.round(annualRate / 12);

    if (wizard.income && wizard.income > 0) {
      const result = calculateFriplads(annualRate, wizard.income, false, 1, 0);
      return { monthlyFull, monthlyAfter: result.monthlyPayment, subsidyPercent: result.subsidyPercent, hasFriplads: result.subsidyPercent > 0 };
    }
    return { monthlyFull, monthlyAfter: null, subsidyPercent: 0, hasFriplads: false };
  }, [rates, recommendation.primary, wizard.income, validMunicipality]);

  // Step icons for progress
  const stepIcons = [Baby, CheckCircle2, MapPin, Wallet, Sparkles];

  const ctaUrl = `/${TYPE_URL[recommendation.primary]}/${toSlug(validMunicipality)}`;

  return (
    <>
      <SEOHead
        title={
          isDa
            ? "Dagpleje eller vuggestue? Find den rigtige pasningstype — Institutionsguide"
            : "Childminder or nursery? Find the right childcare type — Institutionsguide"
        }
        description={
          isDa
            ? "Brug vores gratis guide til at finde ud af om dagpleje, vuggestue eller børnehave er bedst for dit barn. Få personlige anbefalinger med priser for din kommune."
            : "Use our free guide to find out if childminder, nursery or kindergarten is best for your child. Get personalized recommendations with prices for your municipality."
        }
        path="/guide"
      />

      <Breadcrumbs
        items={[
          { label: isDa ? "Hjem" : "Home", href: "/" },
          { label: isDa ? "Pasningsguide" : "Childcare guide" },
        ]}
      />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {isDa ? "Trin" : "Step"} {Math.min(step, STEPS)}/{STEPS}
            </span>
            <span>{Math.round((Math.min(step, STEPS) / STEPS) * 100)}%</span>
          </div>
          <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(Math.min(step, STEPS) / STEPS) * 100}%` }}
            />
          </div>
          {/* Step indicators */}
          <div className="flex justify-between px-1">
            {stepIcons.map((Icon, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                  i + 1 <= step
                    ? "bg-primary text-white"
                    : "bg-bg-muted text-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Step container with animation */}
        <div className="relative min-h-[360px]">
          {/* ----- STEP 1: Age ----- */}
          {step === 1 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  {isDa ? "Hvor gammelt er dit barn?" : "How old is your child?"}
                </h1>
                <p className="text-muted text-sm">
                  {isDa
                    ? "Alderen bestemmer hvilke pasningsformer der er relevante."
                    : "Age determines which childcare types are relevant."}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => selectAge(opt.value)}
                    className={`card p-5 text-center transition-all min-h-[44px] ${
                      wizard.age === opt.value
                        ? "ring-2 ring-primary bg-primary/5 border-primary"
                        : "hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl block mb-2">{opt.emoji}</span>
                    <span className="font-semibold text-foreground text-sm">
                      {isDa ? opt.da : opt.en}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ----- STEP 2: Priorities ----- */}
          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  {isDa ? "Hvad er vigtigst for dig?" : "What matters most to you?"}
                </h2>
                <p className="text-muted text-sm">
                  {isDa
                    ? `Vaelg op til ${MAX_PRIORITIES} prioriteter (${wizard.priorities.length}/${MAX_PRIORITIES} valgt)`
                    : `Pick up to ${MAX_PRIORITIES} priorities (${wizard.priorities.length}/${MAX_PRIORITIES} selected)`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PRIORITY_OPTIONS.map((opt) => {
                  const selected = wizard.priorities.includes(opt.value);
                  const disabled = !selected && wizard.priorities.length >= MAX_PRIORITIES;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => togglePriority(opt.value)}
                      disabled={disabled}
                      className={`card p-4 text-left transition-all min-h-[44px] ${
                        selected
                          ? "ring-2 ring-primary bg-primary/5 border-primary"
                          : disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg block mb-1">{opt.icon}</span>
                      <span className="font-semibold text-foreground text-sm">
                        {isDa ? opt.da : opt.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----- STEP 3: Municipality ----- */}
          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  {isDa ? "Hvilken kommune bor du i?" : "Which municipality do you live in?"}
                </h2>
                <p className="text-muted text-sm">
                  {isDa
                    ? "Vi bruger det til at vise priser og institutioner i dit omrade."
                    : "We use this to show prices and institutions in your area."}
                </p>
              </div>
              <div className="max-w-sm mx-auto">
                <label htmlFor="guide-municipality" className="sr-only">
                  {isDa ? "Vaelg kommune" : "Select municipality"}
                </label>
                <select
                  id="guide-municipality"
                  value={validMunicipality}
                  onChange={(e) => selectMunicipality(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-bg-card text-foreground text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {municipalities.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ----- STEP 4: Income (optional) ----- */}
          {step === 4 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  {isDa ? "Hvad er jeres husstandsindkomst?" : "What is your household income?"}
                </h2>
                <p className="text-muted text-sm">
                  {isDa
                    ? "Valgfrit — vi bruger det til at beregne evt. fripladstilskud."
                    : "Optional — we use this to calculate any childcare subsidy."}
                </p>
              </div>
              <div className="max-w-sm mx-auto space-y-4">
                <div className="relative">
                  <label htmlFor="guide-income" className="sr-only">
                    {isDa ? "Arlig husstandsindkomst" : "Annual household income"}
                  </label>
                  <input
                    id="guide-income"
                    type="text"
                    inputMode="numeric"
                    value={incomeInput}
                    onChange={(e) => handleIncomeChange(e.target.value)}
                    disabled={skipIncome}
                    placeholder={isDa ? "Fx 550.000" : "E.g. 550,000"}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-bg-card text-foreground text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm">
                    kr.
                  </span>
                </div>
                <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipIncome}
                    onChange={(e) => {
                      setSkipIncome(e.target.checked);
                      if (e.target.checked) {
                        setWizard((w) => ({ ...w, income: null }));
                        setIncomeInput("");
                      }
                    }}
                    className="w-4 h-4 accent-primary min-w-[44px] min-h-[44px]"
                  />
                  {isDa ? "Spring over — vis pris uden fripladstilskud" : "Skip — show price without subsidy"}
                </label>
              </div>
            </div>
          )}

          {/* ----- STEP 5: Results ----- */}
          {step === 5 && (
            <div className="animate-fade-in space-y-8">
              <div className="text-center space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  {isDa ? "Vores anbefaling til dig" : "Our recommendation for you"}
                </h2>
                <p className="text-muted text-sm">
                  {isDa
                    ? `Baseret på dit barns alder, dine prioriteter og priser i ${validMunicipality}`
                    : `Based on your child's age, your priorities and prices in ${validMunicipality}`}
                </p>
              </div>

              {/* Primary recommendation card */}
              <ScrollReveal>
                <div className="card p-6 sm:p-8 border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = TYPE_ICONS[recommendation.primary];
                      return <Icon className="w-8 h-8 text-primary" />;
                    })()}
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wide font-medium">
                        {isDa ? "Anbefalet pasningstype" : "Recommended childcare type"}
                      </p>
                      <p className="font-display text-2xl font-bold text-foreground">
                        {isDa
                          ? TYPE_LABELS_DA[recommendation.primary]
                          : TYPE_LABELS_EN[recommendation.primary]}
                      </p>
                    </div>
                  </div>

                  {/* Reasons */}
                  <div className="space-y-2">
                    {recommendation.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm text-muted">{isDa ? r.da : r.en}</p>
                      </div>
                    ))}
                  </div>

                  {/* Score breakdown — transparency */}
                  {wizard.age && ["0-1", "1-2", "2-3"].includes(wizard.age) && (
                    <div className="border-t border-border/50 pt-3">
                      <p className="text-[11px] text-muted/70 mb-2">
                        {isDa ? "Sådan scorer vi dine prioriteter:" : "How we score your priorities:"}
                      </p>
                      <div className="flex gap-4">
                        {(["dagpleje", "vuggestue"] as const).map((type) => {
                          const score = computeScore(type, new Set(wizard.priorities));
                          const isSelected = recommendation.primary === type;
                          return (
                            <div key={type} className={`flex-1 text-center p-2 rounded-lg ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "bg-bg-card"}`}>
                              <p className="text-[11px] text-muted">{isDa ? TYPE_LABELS_DA[type] : TYPE_LABELS_EN[type]}</p>
                              <p className={`font-mono text-lg font-bold ${isSelected ? "text-primary" : "text-muted"}`}>{score > 0 ? `+${score}` : score}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Price estimate */}
                  {priceEstimate && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <p className="text-xs text-muted uppercase tracking-wide font-medium">
                        {isDa
                          ? `Pris i ${validMunicipality}`
                          : `Price in ${validMunicipality}`}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <p className="text-xs text-muted">{isDa ? "Fuld pris" : "Full price"}</p>
                          <p className="font-mono text-lg font-bold text-foreground">
                            {formatDKK(priceEstimate.monthlyFull)}
                            <span className="text-xs text-muted font-normal">/md.</span>
                          </p>
                        </div>
                        {priceEstimate.monthlyAfter !== null && (
                          <div>
                            <p className="text-xs text-muted">
                              {isDa ? "Med fripladstilskud" : "With subsidy"}
                            </p>
                            <p className="font-mono text-lg font-bold text-success">
                              {formatDKK(priceEstimate.monthlyAfter)}
                              <span className="text-xs text-muted font-normal">/md.</span>
                            </p>
                          </div>
                        )}
                        {priceEstimate.hasFriplads && (
                          <div className="flex items-end">
                            <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">
                              {isDa ? "Du sparer" : "You save"} {priceEstimate.subsidyPercent}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    to={ctaUrl}
                    className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors min-h-[44px]"
                  >
                    {isDa
                      ? `Se alle ${TYPE_LABELS_DA[recommendation.primary].toLowerCase()} i ${validMunicipality}`
                      : `See all ${TYPE_LABELS_EN[recommendation.primary].toLowerCase()} in ${validMunicipality}`}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </ScrollReveal>

              {/* Alternative types */}
              {recommendation.alternatives.length > 0 && (
                <ScrollReveal>
                  <div className="space-y-3">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {isDa ? "Overvej også" : "Also consider"}
                    </h3>
                    {recommendation.alternatives.map((alt) => {
                      const AltIcon = TYPE_ICONS[alt];
                      const altRate = rates?.[alt as InstitutionType] ?? null;
                      const altMonthly = altRate ? Math.round(altRate / 12) : null;
                      return (
                        <Link
                          key={alt}
                          to={`/${TYPE_URL[alt]}/${toSlug(validMunicipality)}`}
                          className="card p-4 flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <AltIcon className="w-6 h-6 text-muted" />
                            <div>
                              <p className="font-semibold text-foreground text-sm">
                                {isDa ? TYPE_LABELS_DA[alt] : TYPE_LABELS_EN[alt]}
                              </p>
                              {altMonthly && (
                                <p className="text-xs text-muted">
                                  {isDa ? "Fra" : "From"} {formatDKK(altMonthly)}/md.
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </ScrollReveal>
              )}

              {/* Comparison table */}
              <ScrollReveal>
                <div className="space-y-3">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {isDa ? "Sammenligning: dagpleje vs. vuggestue vs. børnehave" : "Comparison: childminder vs. nursery vs. kindergarten"}
                  </h3>
                  <div className="overflow-x-auto -mx-4 px-4">
                    <table className="w-full text-sm border-collapse min-w-[520px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-3 text-muted font-medium w-[140px]" />
                          <th className="text-left py-2 px-3 font-semibold text-foreground">
                            {isDa ? "Dagpleje" : "Childminder"}
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">
                            {isDa ? "Vuggestue" : "Nursery"}
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">
                            {isDa ? "Børnehave" : "Kindergarten"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Price row from actual data */}
                        {rates && (
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-3 text-muted font-medium">
                              {isDa ? "Pris i " + validMunicipality : "Price in " + validMunicipality}
                            </td>
                            <td className="py-2 px-3 font-mono text-foreground">
                              {rates.dagpleje ? formatDKK(Math.round(rates.dagpleje / 12)) + "/md." : "—"}
                            </td>
                            <td className="py-2 px-3 font-mono text-foreground">
                              {rates.vuggestue ? formatDKK(Math.round(rates.vuggestue / 12)) + "/md." : "—"}
                            </td>
                            <td className="py-2 px-3 font-mono text-foreground">
                              {rates.boernehave ? formatDKK(Math.round(rates.boernehave / 12)) + "/md." : "—"}
                            </td>
                          </tr>
                        )}
                        {COMPARISON_TABLE.map((row, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 pr-3 text-muted font-medium">
                              {isDa ? row.da : row.en}
                            </td>
                            <td className="py-2 px-3 text-foreground">
                              {isDa ? row.dagpleje.da : row.dagpleje.en}
                            </td>
                            <td className="py-2 px-3 text-foreground">
                              {isDa ? row.vuggestue.da : row.vuggestue.en}
                            </td>
                            <td className="py-2 px-3 text-foreground">
                              {isDa ? row.boernehave.da : row.boernehave.en}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ScrollReveal>

              {/* Related tools */}
              <ScrollReveal>
                <div className="card p-6 bg-primary/5 text-center space-y-3">
                  <p className="font-display text-lg font-semibold text-foreground">
                    {isDa ? "Vil du vide mere?" : "Want to know more?"}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link
                      to="/friplads"
                      className="inline-flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-border px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
                    >
                      {isDa ? "Beregn fripladstilskud" : "Calculate subsidy"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/normering"
                      className="inline-flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-border px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
                    >
                      {isDa ? "Se normering" : "See staff ratios"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/prissammenligning"
                      className="inline-flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-border px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
                    >
                      {isDa ? "Sammenlign priser" : "Compare prices"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        {step < 5 && (
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={back}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium text-foreground border border-border hover:bg-bg-muted transition-colors min-h-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              {isDa ? "Tilbage" : "Back"}
            </button>
            <button
              onClick={next}
              disabled={!canNext()}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {step === 4
                ? isDa
                  ? "Se anbefaling"
                  : "See recommendation"
                : isDa
                ? "Næste"
                : "Next"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Start over button on results */}
        {step === 5 && (
          <div className="text-center pt-4">
            <button
              onClick={() => {
                setStep(1);
                setWizard({ age: null, priorities: [], municipality: validMunicipality, income: null });
                setIncomeInput("");
                setSkipIncome(false);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium text-muted border border-border hover:bg-bg-muted transition-colors min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              {isDa ? "Start forfra" : "Start over"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
