import { Link } from "react-router-dom";

const suiteProducts = [
  { name: "ParFinans", href: "https://parfinans.dk", desc: "Parøkonomi & udgiftsfordeling" },
  { name: "NemtBudget", href: "https://nemtbudget.nu", desc: "Gratis budgetberegner" },
  { name: "Børneskat", href: "https://børneskat.dk", desc: "Skattefri børneopsparing" },
  { name: "Institutionsguide", href: "/", desc: "Børnepasning & skoler", internal: true },
];

const dataSources = [
  "Dagtilbudsregisteret (STIL)",
  "Institutionsregisteret",
  "Uddannelsesstatistik API",
  "Danmarks Statistik (RES88)",
];

export default function Footer() {
  return (
    <footer className="bg-[#1A2632] text-white/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-2">
            <span className="font-display font-bold text-lg text-white">Institutionsguide</span>
            <p className="text-xs text-white/60 leading-relaxed">
              Sammenlign 5.000+ vuggestuer, børnehaver, dagplejere og skoler i alle 98 kommuner.
            </p>
          </div>

          {/* Værktøjer */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-3">Kategorier</h4>
            <ul className="space-y-1.5">
              <li><Link to="/vuggestue" className="text-xs text-white/60 hover:text-white transition-colors">Vuggestuer</Link></li>
              <li><Link to="/boernehave" className="text-xs text-white/60 hover:text-white transition-colors">Børnehaver</Link></li>
              <li><Link to="/dagpleje" className="text-xs text-white/60 hover:text-white transition-colors">Dagplejere</Link></li>
              <li><Link to="/skole" className="text-xs text-white/60 hover:text-white transition-colors">Skoler</Link></li>
              <li><Link to="/sfo" className="text-xs text-white/60 hover:text-white transition-colors">SFO</Link></li>
              <li><Link to="/sammenlign" className="text-xs text-white/60 hover:text-white transition-colors">Sammenlign</Link></li>
            </ul>
          </div>

          {/* Suite products */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-3">Se også</h4>
            <ul className="space-y-2">
              {suiteProducts.filter(p => !p.internal).map((p) => (
                <li key={p.name}>
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/60 hover:text-white transition-colors block"
                  >
                    <span className="font-medium text-white/80">{p.name}</span>
                    <span className="block text-[10px] text-white/40">{p.desc}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Data */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-3">Juridisk</h4>
            <ul className="space-y-1.5 mb-4">
              <li><Link to="/privatliv" className="text-xs text-white/60 hover:text-white transition-colors">Privatlivspolitik</Link></li>
              <li><Link to="/vilkaar" className="text-xs text-white/60 hover:text-white transition-colors">Vilkår</Link></li>
            </ul>
            <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-2">Datakilder</h4>
            <ul className="space-y-1 text-[10px] text-white/40">
              {dataSources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} Institutionsguide &middot; Del af ParFinans-familien
          </p>
          <p className="text-[10px] text-white/30 max-w-md text-center md:text-right">
            Alle priser og kvalitetsdata er vejledende. Kontakt den enkelte kommune eller institution for aktuelle oplysninger. Udgør ikke rådgivning.
          </p>
        </div>
      </div>
    </footer>
  );
}
