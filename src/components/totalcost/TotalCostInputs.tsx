import { FRIPLADS_CONSTANTS } from "@/lib/totalCostCalculator";

interface TotalCostInputsProps {
  municipality: string;
  setMunicipality: (v: string) => void;
  municipalities: string[];
  children: number;
  setChildren: (v: number) => void;
  income: number;
  setIncome: (v: number) => void;
  singleParent: boolean;
  setSingleParent: (v: boolean) => void;
  isDa: boolean;
}

export default function TotalCostInputs({
  municipality, setMunicipality, municipalities,
  children, setChildren, income, setIncome,
  singleParent, setSingleParent, isDa,
}: TotalCostInputsProps) {
  return (
    <section className="card p-6 sm:p-8 space-y-6">
      <h2 className="font-display text-xl font-semibold text-foreground">
        {isDa ? "Din situation" : "Your situation"}
      </h2>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="tc-municipality" className="block text-sm font-medium text-foreground mb-1.5">
            {isDa ? "Kommune" : "Municipality"}
          </label>
          <select
            id="tc-municipality"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {municipalities.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tc-children" className="block text-sm font-medium text-foreground mb-1.5">
            {isDa ? "Born under 18" : "Children under 18"}
          </label>
          <select
            id="tc-children"
            value={children}
            onChange={(e) => setChildren(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? (isDa ? "barn" : "child") : (isDa ? "børn" : "children")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="tc-income" className="block text-sm font-medium text-foreground mb-1.5">
          {isDa ? "Husstandsindkomst (årlig)" : "Household income (annual)"}
        </label>
        <div className="flex items-center justify-end gap-2 mb-2">
          <input
            type="text"
            inputMode="numeric"
            value={income.toLocaleString("da-DK")}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              const num = Number(raw);
              if (!isNaN(num)) setIncome(Math.min(num, 1_200_000));
            }}
            className="font-mono text-2xl text-foreground font-bold text-right bg-transparent border-b-2 border-border focus:border-primary outline-none w-40 transition-colors"
            aria-label={isDa ? "Husstandsindkomst" : "Household income"}
          />
          <span className="font-mono text-2xl text-foreground font-bold">kr.</span>
        </div>
        <input
          id="tc-income"
          type="range"
          min={0}
          max={1_200_000}
          step={10_000}
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="w-full h-3 accent-primary cursor-pointer min-h-[44px]"
          aria-valuetext={`${income.toLocaleString("da-DK")} kr.`}
        />
        <div className="flex justify-between text-[10px] text-muted font-mono mt-0.5 px-0.5">
          <span>0</span>
          <span>300.000</span>
          <span>600.000</span>
          <span>900.000</span>
          <span>1.200.000</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="tc-single"
          type="checkbox"
          checked={singleParent}
          onChange={(e) => setSingleParent(e.target.checked)}
          className="w-5 h-5 accent-primary cursor-pointer min-w-[44px] min-h-[44px]"
        />
        <label htmlFor="tc-single" className="text-sm text-foreground cursor-pointer">
          {isDa ? "Enlig forsorger" : "Single parent"}
          <span className="block text-xs text-muted">
            {isDa
              ? `+${FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} kr. i indkomstgrnse`
              : `+${FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} DKK threshold`}
          </span>
        </label>
      </div>
    </section>
  );
}
