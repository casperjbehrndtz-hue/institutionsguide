import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Mail, Phone, ExternalLink, Star, ArrowLeft, ChevronRight } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { formatDKK as _formatDKK } from "@/lib/format";
import FripladsCalculator from "@/components/detail/FripladsCalculator";
import InstitutionMap from "@/components/map/InstitutionMap";
import type { UnifiedInstitution } from "@/lib/types";

function formatDKK(val: number | null): string {
  if (val === null) return "Ukendt";
  return _formatDKK(val);
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    vuggestue: "Vuggestue", boernehave: "Børnehave", dagpleje: "Dagpleje",
    skole: "Skole", sfo: "SFO",
  };
  return labels[cat] || cat;
}

function categoryPath(cat: string): string {
  const paths: Record<string, string> = {
    vuggestue: "/vuggestue", boernehave: "/boernehave", dagpleje: "/dagpleje",
    skole: "/skole", sfo: "/sfo",
  };
  return paths[cat] || "/";
}

function subtypeLabel(sub: string): string {
  const labels: Record<string, string> = {
    folkeskole: "Folkeskole", friskole: "Friskole", efterskole: "Efterskole",
    kommunal: "Kommunal", selvejende: "Selvejende", privat: "Privat",
  };
  return labels[sub] || sub;
}

function overallLabel(o: number | undefined): string {
  if (o === 1) return "Over middel";
  if (o === 0) return "Middel";
  if (o === -1) return "Under middel";
  return "";
}

function QualityDot({ value, max = 5 }: { value: number | undefined; max?: number }) {
  if (value === undefined) return <span className="text-xs text-muted">-</span>;
  const pct = (value / max) * 100;
  const color = pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="font-mono text-sm">{value.toLocaleString("da-DK")}</span>
    </div>
  );
}

export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>();
  const { institutions, loading, nationalAverages } = useData();

  const inst = useMemo(
    () => institutions.find((i) => i.id === id),
    [institutions, id]
  );

  // Nearby institutions (same category, within ~5km)
  const nearby = useMemo(() => {
    if (!inst) return [];
    return institutions
      .filter((i) => i.id !== inst.id && i.category === inst.category)
      .map((i) => ({
        ...i,
        dist: Math.hypot(i.lat - inst.lat, i.lng - inst.lng) * 111, // rough km
      }))
      .filter((i) => i.dist < 5)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [institutions, inst]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!inst) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Institution ikke fundet</h1>
          <p className="text-muted mb-4">Den valgte institution kunne ikke findes.</p>
          <Link to="/" className="text-primary hover:underline">Gå til forsiden</Link>
        </div>
      </div>
    );
  }

  const q = inst.quality;

  return (
    <>
      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": inst.category === "skole" ? "School" : "ChildCare",
            name: inst.name,
            address: {
              "@type": "PostalAddress",
              streetAddress: inst.address,
              postalCode: inst.postalCode,
              addressLocality: inst.city,
              addressRegion: inst.municipality,
              addressCountry: "DK",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: inst.lat,
              longitude: inst.lng,
            },
            ...(inst.email && { email: inst.email }),
            ...(inst.phone && { telephone: inst.phone }),
            ...(inst.web && { url: inst.web.startsWith("http") ? inst.web : `https://${inst.web}` }),
          }),
        }}
      />

      {/* Breadcrumb */}
      <nav className="max-w-5xl mx-auto px-4 pt-6 text-sm text-muted" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 flex-wrap">
          <li><Link to="/" className="hover:text-primary transition-colors">Forside</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li><Link to={categoryPath(inst.category)} className="hover:text-primary transition-colors">{categoryLabel(inst.category)}r</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li><Link to={`/kommune/${encodeURIComponent(inst.municipality)}`} className="hover:text-primary transition-colors">{inst.municipality}</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li className="text-foreground font-medium truncate max-w-[200px]">{inst.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <section className="max-w-5xl mx-auto px-4 pt-4 pb-8">
        <Link to={categoryPath(inst.category)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" />
          Alle {categoryLabel(inst.category).toLowerCase()}r
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          {inst.name}
        </h1>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {categoryLabel(inst.category)}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-border text-muted">
            {subtypeLabel(inst.subtype)}
          </span>
          {q?.o !== undefined && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              q.o === 1 ? "bg-success/10 text-success" :
              q.o === 0 ? "bg-warning/10 text-warning" :
              "bg-destructive/10 text-destructive"
            }`}>
              {overallLabel(q.o)}
            </span>
          )}
        </div>

        <div className="flex items-start gap-2 text-muted">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{inst.address}, {inst.postalCode} {inst.city} — {inst.municipality}</span>
        </div>
      </section>

      {/* Main content grid */}
      <section className="max-w-5xl mx-auto px-4 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rates */}
          <div className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold mb-4">Priser</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted mb-1">Månedlig takst</p>
                <p className="font-mono text-2xl font-bold text-primary">{formatDKK(inst.monthlyRate)}</p>
                <p className="text-[10px] text-muted mt-1">Vejledende</p>
              </div>
              <div className="bg-white border border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted mb-1">Årlig takst</p>
                <p className="font-mono text-2xl font-bold text-foreground">{formatDKK(inst.annualRate)}</p>
              </div>
            </div>
          </div>

          {/* Quality (schools only) */}
          {q && (
            <div className="glass-card p-5">
              <h2 className="font-display text-lg font-semibold mb-4">Kvalitetsdata</h2>
              {q.r !== undefined && (
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-warning fill-warning" />
                  <span className="font-mono text-xl font-bold">{q.r}/5</span>
                  <span className="text-sm text-muted">samlet rating</span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-muted block mb-1">Trivsel</span>
                  <QualityDot value={q.ts} />
                  <span className="text-[10px] text-muted">Landssnit: {nationalAverages.trivsel.toLocaleString("da-DK")}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">Karaktersnit</span>
                  <QualityDot value={q.k} max={12} />
                  <span className="text-[10px] text-muted">Landssnit: {nationalAverages.karakterer.toLocaleString("da-DK")}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">Fravær</span>
                  {q.fp !== undefined ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${q.fp < 6 ? "bg-success" : q.fp < 9 ? "bg-warning" : "bg-destructive"}`} />
                        <span className="font-mono text-sm">{q.fp.toLocaleString("da-DK")}%</span>
                      </div>
                      <span className="text-[10px] text-muted">Landssnit: {nationalAverages.fravaer.toLocaleString("da-DK")}%</span>
                    </>
                  ) : <span className="text-xs text-muted">-</span>}
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">Kompetencedækning</span>
                  {q.kp !== undefined ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${q.kp >= 80 ? "bg-success" : q.kp >= 60 ? "bg-warning" : "bg-destructive"}`} />
                      <span className="font-mono text-sm">{q.kp.toLocaleString("da-DK")}%</span>
                    </div>
                  ) : <span className="text-xs text-muted">-</span>}
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">Undervisningseffekt</span>
                  <span className="text-sm">{q.sr || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">Klassekvotient / Elevtal</span>
                  <span className="font-mono text-sm">{q.kv?.toLocaleString("da-DK") || "-"} / {q.el?.toLocaleString("da-DK") || "-"}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted mt-4">
                Data fra Undervisningsministeriet (Uddannelsesstatistik), skoleåret 2024/2025.
              </p>
            </div>
          )}

          {/* Friplads calculator */}
          {inst.annualRate && inst.annualRate > 0 && (
            <FripladsCalculator annualRate={inst.annualRate} label={`Beregn fripladstilskud for ${inst.name}`} />
          )}
        </div>

        {/* Right column: map + contact + nearby */}
        <div className="space-y-6">
          {/* Mini map */}
          <div className="h-[250px] rounded-xl overflow-hidden border border-border">
            <InstitutionMap
              institutions={[inst, ...nearby]}
              onSelect={() => {}}
              flyTo={{ lat: inst.lat, lng: inst.lng, zoom: 14 }}
            />
          </div>

          {/* Contact */}
          <div className="glass-card p-5">
            <h3 className="font-display text-base font-semibold mb-3">Kontakt</h3>
            <div className="space-y-2">
              {inst.email && (
                <a href={`mailto:${inst.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Mail className="w-4 h-4" /> {inst.email}
                </a>
              )}
              {inst.phone && (
                <a href={`tel:${inst.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Phone className="w-4 h-4" /> {inst.phone}
                </a>
              )}
              {inst.web && (
                <a href={inst.web.startsWith("http") ? inst.web : `https://${inst.web}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" /> Hjemmeside
                </a>
              )}
              {inst.leader && <p className="text-sm text-muted">Leder: {inst.leader}</p>}
            </div>
          </div>

          {/* Nearby */}
          {nearby.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-display text-base font-semibold mb-3">
                {categoryLabel(inst.category)}r i nærheden
              </h3>
              <ul className="space-y-2">
                {nearby.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={`/institution/${n.id}`}
                      className="block p-2.5 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground">{n.name}</p>
                      <div className="flex justify-between text-xs text-muted mt-0.5">
                        <span>{n.municipality}</span>
                        <span className="font-mono">{formatDKK(n.monthlyRate)}/md.</span>
                      </div>
                      <span className="text-[10px] text-muted">{n.dist.toFixed(1)} km væk</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
