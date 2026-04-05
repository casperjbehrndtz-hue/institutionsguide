import { HelpCircle } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

interface FAQItem {
  q: string;
  a: string;
}

export default function HomeFAQ({ items, title }: { items: FAQItem[]; title: string }) {
  return (
    <ScrollReveal><section className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-primary" />
        {title}
      </h2>
      <div className="space-y-4">
        {items.map((faq) => (
          <details key={faq.q} className="card card-static p-4 group">
            <summary className="font-semibold text-foreground cursor-pointer list-none flex justify-between items-center min-h-[44px]">
              {faq.q}
              <span className="text-muted group-open:rotate-180 transition-transform ml-2 shrink-0">&#x25BC;</span>
            </summary>
            <p className="text-muted text-sm mt-3 leading-relaxed">{faq.a}</p>
          </details>
        ))}
      </div>
    </section></ScrollReveal>
  );
}
