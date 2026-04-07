import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

export default function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="card overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-muted/50 transition-colors min-h-[44px]"
            aria-expanded={openIndex === idx}
          >
            <span className="font-display text-sm font-semibold text-foreground pr-4">{item.q}</span>
            {openIndex === idx ? (
              <ChevronUp className="w-4 h-4 text-muted shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted shrink-0" />
            )}
          </button>
          {openIndex === idx && (
            <div className="px-4 pb-4 text-sm text-muted leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
