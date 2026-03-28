import type { FamilyProfile } from "@/contexts/FamilyContext";
import { calculatePersonalizedPrice } from "@/lib/personalizedPrice";
import { formatDKK } from "@/lib/format";

interface Props {
  municipality: string;
  dagplejeAvgPrice: number;
  vuggestueAvgPrice: number;
  profile?: FamilyProfile | null;
}

interface OptionCardProps {
  label: string;
  avgPrice: number;
  personalizedPrice: number | null;
}

function OptionCard({ label, avgPrice, personalizedPrice }: OptionCardProps) {
  return (
    <div className="flex-1 p-4 rounded-lg border border-border bg-bg-card space-y-2 text-center">
      <h4 className="font-display font-semibold text-foreground">{label}</h4>
      <p className="text-sm text-muted">Gns. pris</p>
      <p className="font-mono text-lg font-bold text-foreground">{formatDKK(avgPrice)}/md</p>
      {personalizedPrice !== null && (
        <>
          <p className="text-sm text-muted">Din pris</p>
          <p className="font-mono text-lg font-bold text-primary">
            {formatDKK(personalizedPrice)}/md
          </p>
        </>
      )}
    </div>
  );
}

export default function DagplejeVsVuggestue({
  municipality,
  dagplejeAvgPrice,
  vuggestueAvgPrice,
  profile,
}: Props) {
  const hasProfile = profile != null && profile.income != null;

  const dagplejePersonalized = hasProfile
    ? calculatePersonalizedPrice(dagplejeAvgPrice, profile!)
    : null;
  const vuggestuePersonalized = hasProfile
    ? calculatePersonalizedPrice(vuggestueAvgPrice, profile!)
    : null;

  // Calculate savings (dagpleje vs vuggestue)
  const savingsBase = vuggestueAvgPrice - dagplejeAvgPrice;
  const savingsPersonalized =
    dagplejePersonalized !== null && vuggestuePersonalized !== null
      ? vuggestuePersonalized - dagplejePersonalized
      : null;

  const savings = savingsPersonalized ?? savingsBase;
  const cheaperIsDagpleje = savings > 0;
  const cheaperLabel = cheaperIsDagpleje ? "dagpleje" : "vuggestue";
  const absSavings = Math.abs(savings);

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Dagpleje vs. vuggestue i {municipality}
      </h3>

      <div className="flex gap-3">
        <OptionCard
          label="Dagpleje"
          avgPrice={dagplejeAvgPrice}
          personalizedPrice={dagplejePersonalized}
        />
        <OptionCard
          label="Vuggestue"
          avgPrice={vuggestueAvgPrice}
          personalizedPrice={vuggestuePersonalized}
        />
      </div>

      {absSavings > 0 && (
        <p className="text-center text-sm font-medium text-success">
          Du sparer {formatDKK(absSavings)}/md med {cheaperLabel}
        </p>
      )}

      {!hasProfile && (
        <p className="text-xs text-muted text-center">
          Opret en husstandsprofil for at se din personlige pris efter fripladstilskud.
        </p>
      )}
    </div>
  );
}
