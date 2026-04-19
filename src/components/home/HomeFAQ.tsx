import { useLanguage } from "@/contexts/LanguageContext";

interface FAQItem {
  q: string;
  a: string;
}

export default function HomeFAQ({ items, title }: { items: FAQItem[]; title: string }) {
  const { language } = useLanguage();
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <div className="mb-12 sm:mb-16 max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted/60 mb-4">
          {language === "da" ? "Spørgsmål & svar" : "Questions & answers"}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-border/70 border-t border-b border-border/70">
        {items.map((faq) => (
          <details key={faq.q} className="group">
            <summary className="font-medium text-foreground cursor-pointer list-none flex justify-between items-start gap-6 py-6 min-h-[44px]">
              <span className="font-display text-lg sm:text-xl leading-snug tracking-tight pt-0.5">{faq.q}</span>
              <span
                aria-hidden="true"
                className="text-2xl leading-none text-muted/60 group-open:rotate-45 transition-transform font-light shrink-0 mt-1"
              >
                +
              </span>
            </summary>
            <p className="text-muted text-[15px] leading-relaxed pb-6 pr-10 max-w-3xl">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
