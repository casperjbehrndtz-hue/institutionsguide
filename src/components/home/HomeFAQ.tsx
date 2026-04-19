import ScrollReveal from "@/components/shared/ScrollReveal";

interface FAQItem {
  q: string;
  a: string;
}

export default function HomeFAQ({ items, title }: { items: FAQItem[]; title: string }) {
  return (
    <ScrollReveal>
      <section className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[11px] uppercase tracking-widest text-accent font-semibold mb-2">FAQ</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
        </div>
        <div className="space-y-2">
          {items.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-xl bg-[var(--color-bg-card)] border border-border/60 hover:border-primary/30 transition-colors"
            >
              <summary className="font-semibold text-foreground cursor-pointer list-none flex justify-between items-center gap-4 p-5 min-h-[44px]">
                <span className="text-sm sm:text-base">{faq.q}</span>
                <span
                  aria-hidden="true"
                  className="w-6 h-6 rounded-full bg-primary/8 text-primary flex items-center justify-center shrink-0 group-open:rotate-45 transition-transform text-lg font-light leading-none"
                >
                  +
                </span>
              </summary>
              <p className="text-muted text-sm leading-relaxed px-5 pb-5 -mt-1">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
