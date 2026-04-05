export default function CrossSellNudges({ language }: { language: string }) {
  return (
    <section className="max-w-4xl mx-auto px-4 py-6">
      <p className="text-xs text-muted mb-3 text-center">
        {language === "da" ? "Nyttige værktøjer til din familieøkonomi" : "Useful tools for your family finances"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href="https://nemtbudget.nu?source=institutionsguide"
          target="_blank"
          rel="noopener noreferrer"
          className="card p-4 text-center hover:bg-primary/5 transition-colors"
        >
          <p className="font-semibold text-sm text-foreground">NemtBudget</p>
          <p className="text-xs text-muted mt-1">
            {language === "da" ? "Lav et familiebudget med pasningsudgifter" : "Create a family budget with childcare costs"}
          </p>
        </a>
        <a
          href="https://parfinans.dk?source=institutionsguide"
          target="_blank"
          rel="noopener noreferrer"
          className="card p-4 text-center hover:bg-primary/5 transition-colors"
        >
          <p className="font-semibold text-sm text-foreground">ParFinans</p>
          <p className="text-xs text-muted mt-1">
            {language === "da" ? "Privatøkonomi for forældre" : "Personal finance for parents"}
          </p>
        </a>
        <a
          href={"https://xn--brneskat-54a.dk?source=institutionsguide"}
          target="_blank"
          rel="noopener noreferrer"
          className="card p-4 text-center hover:bg-primary/5 transition-colors"
        >
          <p className="font-semibold text-sm text-foreground">Børneskat</p>
          <p className="text-xs text-muted mt-1">
            {language === "da" ? "Spar på skat med børnefradrag" : "Save on taxes with child deductions"}
          </p>
        </a>
      </div>
    </section>
  );
}
