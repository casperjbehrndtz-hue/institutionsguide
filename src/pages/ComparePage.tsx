import { useLocation, Link } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import type { UnifiedInstitution } from "@/lib/types";
import { ComparisonTable } from "@/components/compare/CompareBar";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import SEOHead from "@/components/shared/SEOHead";
import { formatDKK } from "@/lib/format";

const COLORS = ["#0E7490", "#1B8F5F", "#F4B82C", "#D73C3C"];

export default function ComparePage() {
  const location = useLocation();
  const { t, language } = useLanguage();
  const { compareList } = useCompare();
  // Backwards compat: prefer context, fall back to location.state
  const locationInstitutions: UnifiedInstitution[] = (location.state as { institutions?: UnifiedInstitution[] })?.institutions || [];
  const institutions = compareList.length >= 2 ? compareList : locationInstitutions;

  if (institutions.length < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">
            {t.compare.noSelection}
          </h1>
          <p className="text-muted mb-6">
            {t.compare.selectAtLeast2}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.compare.backToSearch}
          </Link>
        </div>
      </div>
    );
  }

  const rateData = institutions.map((inst) => ({
    name: inst.name.length > 20 ? inst.name.slice(0, 20) + "..." : inst.name,
    [t.detail.monthlyRate]: inst.monthlyRate || 0,
  }));

  const hasQuality = institutions.some((i) => i.quality);
  const radarData = hasQuality
    ? [
        { metric: t.detail.wellbeing, ...Object.fromEntries(institutions.map((i, idx) => [`inst${idx}`, i.quality?.ts || 0])) },
        { metric: t.detail.grades, ...Object.fromEntries(institutions.map((i, idx) => [`inst${idx}`, (i.quality?.k || 0) / 12 * 5])) },
        { metric: t.detail.competenceCoverage, ...Object.fromEntries(institutions.map((i, idx) => [`inst${idx}`, (i.quality?.kp || 0) / 100 * 5])) },
        { metric: t.detail.absence, ...Object.fromEntries(institutions.map((i, idx) => [`inst${idx}`, i.quality?.fp ? (15 - i.quality.fp) / 15 * 5 : 0])) },
      ]
    : [];

  return (
    <>
      <SEOHead
        title={t.compare.title}
        description={`${t.compare.title} — ${institutions.map(i => i.name).join(", ")}`}
        path="/sammenlign"
        noIndex
      />

      <Breadcrumbs items={[
        { label: language === "da" ? "Forside" : "Home", href: "/" },
        { label: language === "da" ? "Sammenlign" : "Compare" },
      ]} />

      {/* Header */}
      <section className="px-4 py-10 sm:py-14 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary hover:underline text-sm mb-4 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.compare.backToSearch}
          </Link>
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {t.compare.title}
            </h1>
            <button
              onClick={() => window.print()}
              className="print:hidden inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-bg-card text-sm font-medium text-foreground hover:bg-primary/5 transition-colors min-h-[44px]"
            >
              <Printer className="w-4 h-4" />
              {t.compare.print}
            </button>
          </div>
          <p className="text-muted">
            {institutions.length} {t.common.institutions}
          </p>
        </div>
      </section>

      {/* Rate comparison bar chart */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          {t.compare.monthlyRates}
        </h2>
        <div className="card p-4" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rateData} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8DFD7" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${v.toLocaleString("da-DK")} kr`} />
              <Tooltip
                formatter={(value) => [formatDKK(Number(value)), t.sort.price]}
                contentStyle={{ borderRadius: 12, border: "1px solid #E8DFD7" }}
              />
              <Bar dataKey={t.detail.monthlyRate} fill="#0E7490" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Quality radar (schools only) */}
      {hasQuality && radarData.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            {t.compare.qualityComparison}
          </h2>
          <div className="card p-4" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E8DFD7" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                {institutions.map((inst, idx) => (
                  <Radar
                    key={inst.id}
                    name={inst.name.length > 15 ? inst.name.slice(0, 15) + "..." : inst.name}
                    dataKey={`inst${idx}`}
                    stroke={COLORS[idx]}
                    fill={COLORS[idx]}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          {t.compare.detailedComparison}
        </h2>
        <div className="card p-4">
          <ComparisonTable institutions={institutions} />
        </div>
      </section>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          section { break-inside: avoid; }
          .card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>
    </>
  );
}
