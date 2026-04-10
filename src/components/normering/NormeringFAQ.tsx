interface Props {
  kommuneName: string;
  normering02: string;
  latestYear: number;
}

export default function NormeringFAQ({ kommuneName, normering02, latestYear }: Props) {
  return (
    <section className="max-w-3xl mx-auto px-4 py-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">
        Ofte stillede spørgsmål
      </h2>
      <div className="space-y-4">
        <details className="card card-static p-4 group" open>
          <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between">
            Hvad er normering?
            <span className="text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="text-sm text-muted mt-2">
            Normering angiver forholdet mellem antal børn og antal voksne i et dagtilbud.
            Et lavere tal betyder færre børn per voksen og dermed mere opmærksomhed til det
            enkelte barn. I {kommuneName} er normeringen for 0-2 år {normering02} børn
            per voksen ({latestYear}).
          </p>
        </details>
        <details className="card card-static p-4 group">
          <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between">
            Hvad er minimumsnormering?
            <span className="text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="text-sm text-muted mt-2">
            Minimumsnormeringen kræver mindst 1 voksen per 3 børn i vuggestuer (0-2 år) og
            mindst 1 voksen per 6 børn i børnehaver (3-5 år). Det svarer til en normering på
            henholdsvis 3,0 og 6,0.
          </p>
        </details>
        <details className="card card-static p-4 group">
          <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between">
            Hvornår trådte minimumsnormeringen i kraft?
            <span className="text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="text-sm text-muted mt-2">
            Lovkravet om minimumsnormering trådte i kraft den 1. januar 2024. Kommunerne havde
            frem til da til at indfase normeringen gradvist. Data på denne side viser udviklingen
            fra 2017 og frem.
          </p>
        </details>
      </div>
    </section>
  );
}
