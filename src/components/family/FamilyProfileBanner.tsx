import { useState } from "react";
import { useFamily } from "@/contexts/FamilyContext";
import { formatDKK } from "@/lib/format";
import FamilyProfileSetup from "./FamilyProfileSetup";

export default function FamilyProfileBanner() {
  const { profile, clearProfile, hasProfile } = useFamily();
  const [editing, setEditing] = useState(false);

  if (!hasProfile || !profile) return null;

  if (editing) {
    return <FamilyProfileSetup onClose={() => setEditing(false)} />;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 rounded-lg bg-primary/10 text-sm text-foreground">
      <span className="font-medium">Din husstand:</span>
      {profile.income != null && (
        <span>{formatDKK(profile.income)}</span>
      )}
      <span>
        {profile.childCount} {profile.childCount === 1 ? "barn" : "børn"}
      </span>
      {profile.singleParent && <span>· enlig forsørger</span>}
      <div className="flex gap-2 ml-auto">
        <button
          onClick={() => setEditing(true)}
          className="text-primary underline underline-offset-2 hover:opacity-80 min-h-[44px] px-1"
        >
          Rediger
        </button>
        <button
          onClick={clearProfile}
          className="text-muted underline underline-offset-2 hover:opacity-80 min-h-[44px] px-1"
        >
          Slet
        </button>
      </div>
    </div>
  );
}
