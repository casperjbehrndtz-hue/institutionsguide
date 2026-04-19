import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { toSlug } from "@/lib/slugs";
import type { InstitutionType } from "@/lib/childcare/types";
import ScrollReveal from "@/components/shared/ScrollReveal";
import Button from "@/components/ui/Button";

const CATEGORY_URL_MAP: Record<InstitutionType, string> = {
  vuggestue: "vuggestue", boernehave: "boernehave", dagpleje: "dagpleje", sfo: "sfo",
};

interface Props {
  municipality: string;
  categoryLabels: Record<InstitutionType, string>;
  isDa: boolean;
}

export default function FripladsBottomCTAs({ municipality, categoryLabels, isDa }: Props) {
  return (
    <>
      <ScrollReveal>
        <section className="card p-6 sm:p-8 text-center space-y-4">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {isDa ? "Hvad koster børnepasning i alt?" : "What does childcare cost in total?"}
          </h2>
          <p className="text-muted text-sm max-w-lg mx-auto">
            {isDa
              ? "Se den samlede pris for vuggestue, børnehave og SFO over 10 år i din kommune."
              : "See the total cost of nursery, kindergarten and after-school care over 10 years in your municipality."}
          </p>
          <Button
            as="link"
            to="/samlet-pris"
            variant="primary"
            size="md"
            trailingIcon={<ArrowRight className="w-4 h-4" />}
          >
            {isDa ? "Se samlet pris" : "See total cost"}
          </Button>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="card p-6 sm:p-8 text-center space-y-4 bg-primary/5">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {isDa ? "Find institutioner i din kommune" : "Find childcare in your municipality"}
          </h2>
          <p className="text-muted text-sm max-w-lg mx-auto">
            {isDa
              ? "Se alle vuggestuer, børnehaver, dagplejere og SFO'er med priser, afstand og beregnet fripladstilskud."
              : "See all nurseries, kindergartens, childminders and after-school care with prices, distance and calculated subsidy."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {(["vuggestue", "boernehave", "dagpleje", "sfo"] as InstitutionType[]).map((cat) => (
              <Link
                key={cat}
                to={`/${CATEGORY_URL_MAP[cat]}/${toSlug(municipality)}`}
                className="inline-flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-border px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
              >
                {categoryLabels[cat].split(" (")[0]}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </section>
      </ScrollReveal>
    </>
  );
}
