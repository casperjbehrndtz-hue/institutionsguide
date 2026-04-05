import { ExternalLink } from "lucide-react";
import type { UnifiedInstitution } from "@/lib/types";

export default function EfterskoleDetails({ inst, language }: { inst: UnifiedInstitution; language: string }) {
  if (inst.category !== "efterskole") return null;
  if (!inst.profiles?.length && inst.availableSpots == null && !inst.classLevels?.length && !inst.edkUrl) return null;

  return (
    <section className="max-w-[1020px] mx-auto px-4 pb-4">
      <div className="card p-5 space-y-4">
        {inst.schoolType && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{language === "da" ? "Type" : "Type"}:</span>
            <span className="text-sm font-medium text-foreground">{inst.schoolType}</span>
          </div>
        )}
        {inst.classLevels && inst.classLevels.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{language === "da" ? "Klassetrin" : "Grades"}:</span>
            <span className="text-sm font-medium text-foreground">{inst.classLevels.join(". + ")}. klasse</span>
          </div>
        )}
        {inst.availableSpots != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{language === "da" ? "Ledige pladser" : "Available spots"}:</span>
            <span className={`text-sm font-medium ${inst.availableSpots > 0 ? "text-green-600" : "text-red-500"}`}>
              {inst.availableSpots > 0
                ? `${inst.availableSpots} ${language === "da" ? "ledige linjer" : "available lines"}`
                : (language === "da" ? "Ingen ledige" : "No availability")}
            </span>
          </div>
        )}
        {inst.profiles && inst.profiles.length > 0 && (
          <div>
            <span className="text-xs text-muted block mb-2">{language === "da" ? "Profiler" : "Profiles"}:</span>
            <div className="flex flex-wrap gap-1.5">
              {inst.profiles.map((p) => (
                <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400 font-medium">
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
              ))}
            </div>
          </div>
        )}
        {inst.edkUrl && (
          <a
            href={inst.edkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium min-h-[44px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {language === "da" ? "Se på efterskolerne.dk" : "View on efterskolerne.dk"}
          </a>
        )}
      </div>
    </section>
  );
}
