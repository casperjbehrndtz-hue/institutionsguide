import { useLanguage } from "@/contexts/LanguageContext";

export default function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    { title: t.home.step1Title, desc: t.home.step1Desc },
    { title: t.home.step2Title, desc: t.home.step2Desc },
    { title: t.home.step3Title, desc: t.home.step3Desc },
    { title: t.home.step4Title, desc: t.home.step4Desc },
  ];

  return (
    <section aria-labelledby="how-it-works-heading" className="bg-[var(--color-border)]/25 border-y border-border/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="mb-12 sm:mb-16 max-w-2xl">
          <h2
            id="how-it-works-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight mb-3"
          >
            {t.home.howItWorks}
          </h2>
          <p className="text-muted text-base sm:text-lg leading-relaxed">
            {t.home.howItWorksSubtitle}
          </p>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-border/70">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="py-8 sm:py-10 sm:px-6 lg:px-8 border-b border-border/70 sm:border-r last:sm:border-r-0 lg:border-b-0"
            >
              <p className="font-mono text-[11px] text-muted/60 tracking-widest mb-6">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground leading-tight tracking-tight mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
