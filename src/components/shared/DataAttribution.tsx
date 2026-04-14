import { dataVersions } from "@/lib/dataVersions";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Data source attribution footer for programmatic SEO pages.
 * Shows where data comes from — builds E-E-A-T trust signal.
 */
export default function DataAttribution({ category }: { category?: string }) {
  const { language } = useLanguage();
  const isDa = language === "da";
  const isSchool = category === "skole" || category === "efterskole";
  const isDagtilbud = !isSchool;

  return (
    <section className="max-w-4xl mx-auto px-4 py-6">
      <div className="border-t border-border pt-4">
        <p className="text-[11px] text-muted leading-relaxed">
          <strong>{isDa ? "Datakilder:" : "Data sources:"}</strong>{" "}
          {isDa ? "Priser" : "Prices"}: Danmarks Statistik ({dataVersions.prices.year})
          {isDagtilbud && <> · {isDa ? "Normering" : "Staff ratios"}: {isDa ? "Børne- og Undervisningsministeriet" : "Ministry of Children and Education"} (BUVM)</>}
          {isSchool && (
            <>
              {" "}· {isDa ? "Kvalitet" : "Quality"}: {isDa ? "Undervisningsministeriet" : "Ministry of Education"} ({dataVersions.schoolQuality.schoolYear})
            </>
          )}
          {" "}· {isDa ? "Fripladstilskud" : "Childcare subsidy"}: {isDa ? "Børne- og Socialministeriet" : "Ministry of Children and Social Affairs"} ({dataVersions.friplads.year})
          {" "}· {isDa ? "Sidst opdateret: marts 2026" : "Last updated: March 2026"}
        </p>
      </div>
    </section>
  );
}
