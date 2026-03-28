import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, RotateCcw, Baby, Users, GraduationCap, BookOpen, MapPin, Heart, Coins, DollarSign, Home, Building2, SlidersHorizontal, Sparkles, Clock, Star, ChevronRight } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import { formatDKK } from "@/lib/format";
import {
  scoreInstitutions,
  getCategoryPath,
  type QuizAnswers,
  type AgeRange,
  type Priority,
  type TypePreference,
} from "@/lib/quizScoring";

const TOTAL_STEPS = 5;

const AGE_OPTIONS: { value: AgeRange; icon: typeof Baby }[] = [
  { value: "0-1", icon: Baby },
  { value: "1-2", icon: Baby },
  { value: "3-5", icon: Users },
  { value: "6-9", icon: BookOpen },
  { value: "10-16", icon: GraduationCap },
];

const PRIORITY_OPTIONS: { value: Priority; icon: typeof Coins }[] = [
  { value: "lowPrice", icon: Coins },
  { value: "proximity", icon: MapPin },
  { value: "quality", icon: Star },
  { value: "smallGroups", icon: Users },
  { value: "flexibleHours", icon: Clock },
];

const TYPE_OPTIONS: { value: TypePreference; icon: typeof Building2 }[] = [
  { value: "municipal", icon: Building2 },
  { value: "private", icon: Home },
  { value: "childminder", icon: Heart },
  { value: "noPreference", icon: SlidersHorizontal },
];

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
            i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-center mb-8">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted">{desc}</p>
    </div>
  );
}

export default function QuizPage() {
  const { institutions, loading, municipalities } = useData();
  const { t, language } = useLanguage();

  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswers>({
    ageRange: null,
    municipality: "",
    priorities: [],
    budget: 3000,
    typePreference: "noPreference",
  });

  const municipalityNames = useMemo(
    () => municipalities.map((m) => m.municipality).sort((a, b) => a.localeCompare(b, "da")),
    [municipalities]
  );

  const results = useMemo(() => {
    if (!showResults) return [];
    return scoreInstitutions(answers, institutions);
  }, [showResults, answers, institutions]);

  const topResults = useMemo(() => results.slice(0, 10), [results]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return answers.ageRange !== null;
      case 1: return true; // Municipality is optional
      case 2: return answers.priorities.length > 0;
      case 3: return true; // Budget always has a default
      case 4: return true; // Type preference always has a default
      default: return false;
    }
  }, [step, answers]);

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      setShowResults(true);
    }
  }

  function handleBack() {
    if (showResults) {
      setShowResults(false);
    } else if (step > 0) {
      setStep(step - 1);
    }
  }

  function handleStartOver() {
    setStep(0);
    setShowResults(false);
    setAnswers({
      ageRange: null,
      municipality: "",
      priorities: [],
      budget: 3000,
      typePreference: "noPreference",
    });
  }

  function togglePriority(p: Priority) {
    setAnswers((prev) => {
      const has = prev.priorities.includes(p);
      if (has) {
        return { ...prev, priorities: prev.priorities.filter((x) => x !== p) };
      }
      if (prev.priorities.length >= 2) {
        return { ...prev, priorities: [prev.priorities[1], p] };
      }
      return { ...prev, priorities: [...prev.priorities, p] };
    });
  }

  const ageLabels: Record<AgeRange, string> = {
    "0-1": t.quiz.ageRanges.baby,
    "1-2": t.quiz.ageRanges.toddler,
    "3-5": t.quiz.ageRanges.preschool,
    "6-9": t.quiz.ageRanges.youngSchool,
    "10-16": t.quiz.ageRanges.olderSchool,
  };

  const priorityLabels: Record<Priority, string> = {
    lowPrice: t.quiz.priorities.lowPrice,
    proximity: t.quiz.priorities.proximity,
    quality: t.quiz.priorities.quality,
    smallGroups: t.quiz.priorities.smallGroups,
    flexibleHours: t.quiz.priorities.flexibleHours,
  };

  const typeLabels: Record<TypePreference, string> = {
    municipal: t.quiz.typeOptions.municipal,
    private: t.quiz.typeOptions.private,
    childminder: t.quiz.typeOptions.childminder,
    noPreference: t.quiz.typeOptions.noPreference,
  };

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      vuggestue: t.categories.vuggestue,
      boernehave: t.categories.boernehave,
      dagpleje: t.categories.dagpleje,
      skole: t.categories.skole,
      sfo: t.categories.sfo,
    };
    return map[cat] || cat;
  };

  const CATEGORY_BADGE_COLORS: Record<string, string> = {
    vuggestue: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    boernehave: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dagpleje: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    skole: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    sfo: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Results view
  if (showResults) {
    return (
      <>
        <SEOHead
          title={language === "da" ? "Quiz-resultater — Institutionsguide" : "Quiz Results — Institutionsguide"}
          description={language === "da" ? "Dine personlige anbefalinger baseret på quizzen." : "Your personalized recommendations based on the quiz."}
        />
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {t.quiz.resultsTitle}
            </h1>
            <p className="text-sm text-muted">{t.quiz.resultsSubtitle}</p>
          </div>

          {topResults.length > 0 ? (
            <>
              <p className="text-xs text-muted mb-4 font-medium">{t.quiz.topMatches}</p>
              <div className="space-y-3">
                {topResults.map(({ institution: inst, matchPercent }, idx) => (
                  <Link
                    key={inst.id}
                    to={`/institution/${inst.id}`}
                    className="card p-4 flex items-center gap-4 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${CATEGORY_BADGE_COLORS[inst.category] || "bg-gray-100 text-gray-600"}`}>
                          {categoryLabel(inst.category)}
                        </span>
                        {inst.ownership && (
                          <span className="text-[10px] text-muted">{inst.ownership}</span>
                        )}
                      </div>
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {inst.name}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {inst.municipality} {inst.monthlyRate ? `· ${formatDKK(inst.monthlyRate)}/md.` : ""}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary">{matchPercent}%</span>
                        <p className="text-[10px] text-muted">{t.quiz.matchScore}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-muted text-sm">{t.common.noResults}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-border bg-bg-card text-foreground hover:bg-primary/5 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t.quiz.adjustFilters}
            </button>
            <button
              onClick={handleStartOver}
              className="flex-1 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-border bg-bg-card text-foreground hover:bg-primary/5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t.quiz.startOver}
            </button>
          </div>

          {answers.ageRange && (
            <Link
              to={getCategoryPath(answers)}
              className="block mt-4 px-4 py-3 rounded-xl font-medium text-sm text-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t.quiz.seeAll} <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          )}
        </div>
      </>
    );
  }

  // Wizard steps
  return (
    <>
      <SEOHead
        title={language === "da" ? "Quiz — Hvad passer til jeres familie? — Institutionsguide" : "Quiz — What fits your family? — Institutionsguide"}
        description={language === "da" ? "Tag vores quiz og få personlige anbefalinger til vuggestue, børnehave, dagpleje eller skole." : "Take our quiz and get personalized recommendations for nursery, kindergarten, childminder or school."}
      />
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">
            {t.quiz.title}
          </h1>
          <p className="text-sm text-muted">{t.quiz.subtitle}</p>
        </div>

        <ProgressBar step={step} total={TOTAL_STEPS} />

        {/* Step 1: Age */}
        {step === 0 && (
          <div>
            <StepHeader title={t.quiz.step1Title} desc={t.quiz.step1Desc} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AGE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = answers.ageRange === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAnswers({ ...answers, ageRange: opt.value })}
                    className={`card p-4 text-center transition-all ${
                      selected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "hover:border-primary/30"
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${selected ? "text-primary" : "text-muted"}`} />
                    <p className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}>
                      {ageLabels[opt.value]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Municipality */}
        {step === 1 && (
          <div>
            <StepHeader title={t.quiz.step2Title} desc={t.quiz.step2Desc} />
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" />
              <select
                value={answers.municipality}
                onChange={(e) => setAnswers({ ...answers, municipality: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none"
              >
                <option value="">{t.common.allMunicipalities}</option>
                {municipalityNames.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Priorities */}
        {step === 2 && (
          <div>
            <StepHeader title={t.quiz.step3Title} desc={t.quiz.step3Desc} />
            <p className="text-xs text-muted text-center mb-4">
              {t.quiz.pickTwo} ({answers.priorities.length}/2 {t.quiz.selected})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRIORITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = answers.priorities.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => togglePriority(opt.value)}
                    className={`card p-4 flex items-center gap-3 text-left transition-all ${
                      selected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "hover:border-primary/30"
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${selected ? "text-primary" : "text-muted"}`} />
                    <span className={`font-medium text-sm ${selected ? "text-primary" : "text-foreground"}`}>
                      {priorityLabels[opt.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Budget */}
        {step === 3 && (
          <div>
            <StepHeader title={t.quiz.step4Title} desc={t.quiz.step4Desc} />
            <div className="card p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-6">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-foreground font-mono">
                  {answers.budget.toLocaleString("da-DK")}
                </span>
                <span className="text-sm text-muted">{t.quiz.perMonth}</span>
              </div>
              <input
                type="range"
                min={500}
                max={6000}
                step={100}
                value={answers.budget}
                onChange={(e) => setAnswers({ ...answers, budget: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted mt-2">
                <span>500 kr</span>
                <span>6.000 kr</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Type preference */}
        {step === 4 && (
          <div>
            <StepHeader title={t.quiz.step5Title} desc={t.quiz.step5Desc} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = answers.typePreference === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAnswers({ ...answers, typePreference: opt.value })}
                    className={`card p-4 flex items-center gap-3 text-left transition-all ${
                      selected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "hover:border-primary/30"
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${selected ? "text-primary" : "text-muted"}`} />
                    <span className={`font-medium text-sm ${selected ? "text-primary" : "text-foreground"}`}>
                      {typeLabels[opt.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-border bg-bg-card text-foreground hover:bg-primary/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.quiz.back}
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              canProceed()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-border text-muted cursor-not-allowed"
            }`}
          >
            {step === TOTAL_STEPS - 1 ? (
              <>
                <Sparkles className="w-4 h-4" />
                {language === "da" ? "Se resultater" : "See results"}
              </>
            ) : (
              <>
                {t.quiz.next}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
