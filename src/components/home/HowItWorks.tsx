import { Search, BarChart3, FileText, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    { icon: Search, title: t.home.step1Title, desc: t.home.step1Desc },
    { icon: BarChart3, title: t.home.step2Title, desc: t.home.step2Desc },
    { icon: FileText, title: t.home.step3Title, desc: t.home.step3Desc },
    { icon: Heart, title: t.home.step4Title, desc: t.home.step4Desc },
  ];

  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="bg-bg border-y border-border/60"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-2xl mb-8 sm:mb-10">
          <h2
            id="how-it-works-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2"
          >
            {t.home.howItWorks}
          </h2>
          <p className="text-muted text-sm sm:text-base">
            {t.home.howItWorksSubtitle}
          </p>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-border bg-bg-card p-5 sm:p-6 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/8 text-primary border border-primary/15">
                  <step.icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <span
                  aria-hidden="true"
                  className="font-mono text-[11px] font-semibold tracking-widest text-muted/70"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-base leading-snug mb-1.5">
                  {step.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
