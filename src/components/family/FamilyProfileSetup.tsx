import { useState } from "react";
import { useFamily, type FamilyProfile } from "@/contexts/FamilyContext";

interface Props {
  onClose?: () => void;
}

export default function FamilyProfileSetup({ onClose }: Props) {
  const { profile, setProfile } = useFamily();

  const [income, setIncome] = useState<string>(
    profile?.income != null ? String(profile.income) : ""
  );
  const [singleParent, setSingleParent] = useState(profile?.singleParent ?? false);
  const [childCount, setChildCount] = useState(profile?.childCount ?? 1);

  function handleSave() {
    const parsed = income.trim() === "" ? null : Number(income.replace(/\D/g, ""));
    const p: FamilyProfile = {
      income: parsed,
      singleParent,
      childCount,
    };
    setProfile(p);
    onClose?.();
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Din husstandsprofil
      </h3>
      <p className="text-sm text-muted">
        Udfyld for at se din personlige pris efter fripladstilskud.
      </p>

      {/* Household income */}
      <div>
        <label htmlFor="family-income" className="block text-sm text-muted mb-1">
          Husstandsindkomst (kr/år)
        </label>
        <input
          id="family-income"
          type="text"
          inputMode="numeric"
          placeholder="fx 450.000"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Single parent */}
      <div className="flex items-center gap-3">
        <input
          id="family-single"
          type="checkbox"
          checked={singleParent}
          onChange={(e) => setSingleParent(e.target.checked)}
          className="w-5 h-5 accent-primary cursor-pointer"
        />
        <label htmlFor="family-single" className="text-sm text-foreground cursor-pointer">
          Enlig forsørger?
        </label>
      </div>

      {/* Child count */}
      <div>
        <label htmlFor="family-children" className="block text-sm text-muted mb-1">
          Antal børn i dagtilbud
        </label>
        <select
          id="family-children"
          value={childCount}
          onChange={(e) => setChildCount(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "barn" : "børn"}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium min-h-[44px] hover:opacity-90 transition-opacity"
        >
          Gem profil
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted min-h-[44px] hover:bg-bg-card transition-colors"
          >
            Annuller
          </button>
        )}
      </div>
    </div>
  );
}
