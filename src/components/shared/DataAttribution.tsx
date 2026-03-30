import { dataVersions } from "@/lib/dataVersions";

/**
 * Data source attribution footer for programmatic SEO pages.
 * Shows where data comes from — builds E-E-A-T trust signal.
 */
export default function DataAttribution({ category }: { category?: string }) {
  const isSchool = category === "skole" || category === "efterskole";
  const isDagtilbud = !isSchool;

  return (
    <section className="max-w-4xl mx-auto px-4 py-6">
      <div className="border-t border-border pt-4">
        <p className="text-[11px] text-muted leading-relaxed">
          <strong>Datakilder:</strong>{" "}
          Priser: Danmarks Statistik ({dataVersions.prices.year}-tal)
          {isDagtilbud && <> · Normering: Børne- og Undervisningsministeriet (BUVM)</>}
          {isSchool && (
            <>
              {" "}· Kvalitet: Undervisningsministeriet ({dataVersions.schoolQuality.schoolYear})
            </>
          )}
          {" "}· Fripladstilskud: Børne- og Socialministeriet ({dataVersions.friplads.year})
          {" "}· Sidst opdateret: marts 2026
        </p>
      </div>
    </section>
  );
}
