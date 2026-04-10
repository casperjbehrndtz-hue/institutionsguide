import { Link } from "react-router-dom";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { dataVersions } from "@/lib/dataVersions";

export default function PrissammenligningFAQ() {
  return (
    <ScrollReveal><section className="max-w-3xl mx-auto px-4 py-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">
        Om prissammenligning
      </h2>
      <div className="space-y-4 text-sm text-muted">
        <p>
          <strong className="text-foreground">Hvor kommer priserne fra?</strong><br />
          Taksterne er baseret på data fra Danmarks Statistik (StatBank RES88) og viser de
          kommunale takster for {dataVersions.prices.year}. Priserne er omregnet til månedlige beløb.
        </p>
        <p>
          <strong className="text-foreground">Hvorfor varierer priserne?</strong><br />
          Kommunerne fastsætter selv taksterne for børnepasning. Forskellen skyldes bl.a.
          kommunens økonomi, serviceniveau og lokale politiske prioriteringer. Forældre
          betaler maks. 25% af de faktiske udgifter.
        </p>
        <p>
          <strong className="text-foreground">Kan jeg få tilskud?</strong><br />
          Ja — familier med lav indkomst kan søge om hel eller delvis friplads.
          Beregn dit tilskud på vores{" "}
          <Link to="/friplads" className="text-primary hover:underline">
            fripladsberegner
          </Link>.
        </p>
      </div>
    </section></ScrollReveal>
  );
}
