import { useState, useMemo, useCallback } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Baby,
  CheckCircle2,
  MapPin,
  Wallet,
  Star,
} from "lucide-react";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/schema";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAllMunicipalities, getChildcareRates } from "@/lib/childcare/rates";
import { calculateFriplads } from "@/lib/childcare/friplads";
import type { InstitutionType } from "@/lib/childcare/types";
import type { AgeGroup, Priority, WizardState } from "@/lib/guideEngine";
import {
  STEPS,
  MAX_PRIORITIES,
  AGE_OPTIONS,
  PRIORITY_OPTIONS,
  getRecommendation,
} from "@/lib/guideEngine";
import GuideResults from "@/components/guide/GuideResults";
import DataFreshness from "@/components/shared/DataFreshness";
import Button from "@/components/ui/Button";

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
  }, [rates, recommendation.primary, wizard.income]);

  // Step icons for progress
  const stepIcons = [Baby, CheckCircle2, MapPin, Wallet, Star];

  return (
    <>
      <SEOHead
        title={
          isDa
            ? "Dagpleje eller vuggestue? Find den rigtige pasningstype — Institutionsguiden"
            : "Childminder or nursery? Find the right childcare type — Institutionsguiden"
        }
        description={
          isDa
            ? "Brug vores gratis guide til at finde ud af om dagpleje, vuggestue eller børnehave er bedst for dit barn. Få personlige anbefalinger med priser for din kommune."
            : "Use our free guide to find out if childminder, nursery or kindergarten is best for your child. Get personalized recommendations with prices for your municipality."
        }
        path="/guide"
      />
      <JsonLd data={breadcrumbSchema([
        { name: isDa ? "Hjem" : "Home", url: "https://www.institutionsguiden.dk/" },
        { name: isDa ? "Pasningsguide" : "Childcare guide", url: "https://www.institutionsguiden.dk/guide" },
      ])} />

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
                    <opt.icon className="w-6 h-6 text-muted mb-2" />
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
                    ? `Vælg op til ${MAX_PRIORITIES} prioriteter (${wizard.priorities.length}/${MAX_PRIORITIES} valgt)`
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
                      <opt.icon className="w-5 h-5 text-muted mb-1" />
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
                    ? "Vi bruger det til at vise priser og institutioner i dit område."
                    : "We use this to show prices and institutions in your area."}
                </p>
              </div>
              <div className="max-w-sm mx-auto">
                <label htmlFor="guide-municipality" className="sr-only">
                  {isDa ? "Vælg kommune" : "Select municipality"}
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
            <GuideResults
              wizard={wizard}
              recommendation={recommendation}
              rates={rates}
              priceEstimate={priceEstimate}
              validMunicipality={validMunicipality}
              isDa={isDa}
            />
          )}
        </div>

        {/* Navigation buttons */}
        {step < 5 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="secondary"
              size="md"
              onClick={back}
              disabled={step === 1}
              leadingIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {isDa ? "Tilbage" : "Back"}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={next}
              disabled={!canNext()}
              trailingIcon={<ArrowRight className="w-4 h-4" />}
            >
              {step === 4
                ? isDa
                  ? "Se anbefaling"
                  : "See recommendation"
                : isDa
                ? "Næste"
                : "Next"}
            </Button>
          </div>
        )}

        {/* Start over button on results */}
        {step === 5 && (
          <div className="text-center pt-4">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setStep(1);
                setWizard({ age: null, priorities: [], municipality: validMunicipality, income: null });
                setIncomeInput("");
                setSkipIncome(false);
              }}
              leadingIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {isDa ? "Start forfra" : "Start over"}
            </Button>
          </div>
        )}
      </main>

      <DataFreshness />
    </>
  );
}
