#!/usr/bin/env node
/**
 * create-koege-tilsyn.mjs — Creates Køge tilsyn data from known PDF URLs
 *
 * Køge has a central tilsyn page with direct PDF links for all institutions.
 * We have the full list from web scraping, so we create the JSON directly.
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

// Known PDF links from Køge's central tilsyn page
const KOEGE_REPORTS = [
  { name: "Alkereden", pdf: "Tilsynsrapport-2024-2025-Alkereden.pdf", year: 2025 },
  { name: "Asgård Børnehus", pdf: "Tilsynsrapport-Asgård-2024-2025.pdf", year: 2025 },
  { name: "Basen", pdf: "Tilsynsrapport-2025-2026-Basen.pdf", year: 2026, folder: "2026" },
  { name: "BlåbærHuset", pdf: "Tilsynsrapport---Blåbær-Huset-2024-2025.pdf", year: 2025 },
  { name: "Den Grønne Planet", pdf: "Tilsynsrapport-2025--Den-Grønne-Planet.pdf", year: 2025 },
  { name: "Dueslaget", pdf: "Tilsynsrapport-Dueslaget-2024-2025.pdf", year: 2025 },
  { name: "Firkløveret", pdf: "Tilsynsrapport-Firkløveret-2024-2025.pdf", year: 2025 },
  { name: "Fogedgården", pdf: "Tilsynsrapport---Fogedgården-2024-2025.pdf", year: 2025 },
  { name: "Frændehus", pdf: "Tilsynsrapport-2025--Frændehus.pdf", year: 2025 },
  { name: "Fuglevænget", pdf: "Tilsynsrapport---Fuglevænget-2024--2025.pdf", year: 2025 },
  { name: "Gemsevejens Børnehus", pdf: "Tilsynsrapport-Gemsevejens-Børnehus-2025.pdf", year: 2025 },
  { name: "Guldminen", pdf: "Tilsynsrapport-Guldminen-2025.pdf", year: 2025 },
  { name: "Gørslev Børnehus", pdf: "Tilsynsrapport-Gørslev-2024-2025.pdf", year: 2025 },
  { name: "Holmebækkens Børnehus", pdf: "Tilsynsrapport-2024-2025--Holmebækken.pdf", year: 2025 },
  { name: "Hop-La", pdf: "Tilsynsrapport-2025---hop-La.pdf", year: 2025 },
  { name: "Idrætsbørnehaven", pdf: "Tilsynsrapport-2025--Idrætsbørnehaven.pdf", year: 2025 },
  { name: "Køge Børneasyl", pdf: "Tilsynsrapport---Køge-Børneasyl-2025.pdf", year: 2025 },
  { name: "Labyrinten", pdf: "Tilsynsrapport-2024-2025--Labyrinten.pdf", year: 2025 },
  { name: "Lyngens børnehus", pdf: "Tilsynsrapport-Lyngens-vuggestue-og-børnehave---2025(1).pdf", year: 2025 },
  { name: "Moseengens Børnehus", pdf: "Tilsynsrapport-Moseengen-2025-2026.pdf", year: 2026, folder: "2026" },
  { name: "Mælkebøtten", pdf: "Tilsynsrapportsrapport-2024-2025--Mælkebøtten.pdf", year: 2025 },
  { name: "Møllehøj", pdf: "Tilsynsrapport-2024-2025-Møllehøj.pdf", year: 2025 },
  { name: "Nordlys", pdf: "Tilsynsrapport-Nordlys-2024-2025.pdf", year: 2025 },
  { name: "Perlen", pdf: "Tilsynsrapport-Perlen-2025.pdf", year: 2025 },
  { name: "Ravnsborg", pdf: "Tilsynsrapport-2026-Ravnsborg.pdf", year: 2026, folder: "2026" },
  { name: "Regnbuen", pdf: "Tilsynsrapport-2025-2026-Regnbuen.pdf", year: 2026, folder: "2026" },
  { name: "Rishøjens Børnehus", pdf: "Tilsynsrapport-Rishøjen-2025.pdf", year: 2025 },
  { name: "Sct. Georgs Gårdens børnehus", pdf: "Tilsynsrapport---Sct.-Georgs-Gårdens-Vuggestue-og-Børnehave-2024-2025.pdf", year: 2025 },
  { name: "Skovsneglen", pdf: "Tilsynsrapport---Skovsneglen-2025.pdf", year: 2025 },
  { name: "Solsikken", pdf: "Tilsynsrapport-Solsikken-2025.pdf", year: 2025 },
  { name: "Spiren", pdf: "Tilsynsrapport-Spiren-2024-2025.pdf", year: 2025 },
  { name: "Svalen", pdf: "Tilsynsrapport-2024-2025--Svalen.pdf", year: 2025 },
  { name: "Torpgården", pdf: "Tilsynsrapport-Torpgården-2025-skærpet.pdf", year: 2025, rating: "skærpet" },
  { name: "Troldehøjen", pdf: "Tilsynsrapport-2024-2025-Friluftsinstitution-Troldehøjen.pdf", year: 2025 },
  { name: "Tumlehuset", pdf: "Tilsynsrapport-2024-2025--Tumlehuset.pdf", year: 2025 },
  { name: "Valhalla", pdf: "Tilsynsrapport-2026-Valhalla.pdf", year: 2026, folder: "2026" },
  { name: "Ved Skoven", pdf: "Tilsynsrapport---Ved-Skoven-2025.pdf", year: 2025 },
  { name: "Vemmedrup børnehave", pdf: "Tilsynsrapport-2024-2025-Vemmedrup-børnehave.pdf", year: 2025 },
  { name: "Vestergården", pdf: "Tilsynsrapport---Vestergården---2024-2025.pdf", year: 2025 },
  { name: "Væksthuset", pdf: "Tilsynsrapport-Væksthuset-2024-2025.pdf", year: 2025 },
  { name: "Ærtebjerghave Børnecenter", pdf: "Tilsynsrapport-2025-Ærtebjerghave-Børnecenter.pdf", year: 2025 },
  { name: "Ølsemagle Børnegård", pdf: "Tilsynsrapport-Ølsemagle-2025.pdf", year: 2025 },
  { name: "Børnehuset Solstrålen", pdf: "Tilsynsrapport-2025--Solstrålen--82.pdf", year: 2025 },
  { name: "Dagplejen i Køge", pdf: "Tilsynsrapport-Den-kommunale-dagpleje-2025.pdf", year: 2025 },
];

const BASE_URL = "https://www.koege.dk/p/Borger/Boernepasning%20og%20skoler/Tilsynsrapporter%20";

function loadInstitutionNames() {
  const names = new Map();
  const files = [
    { file: "vuggestue-data.json", prefix: "vug" },
    { file: "boernehave-data.json", prefix: "bh" },
    { file: "dagpleje-data.json", prefix: "dag" },
    { file: "sfo-data.json", prefix: "sfo" },
  ];
  for (const { file, prefix } of files) {
    const p = join(DATA_DIR, file);
    if (!existsSync(p)) continue;
    const data = JSON.parse(readFileSync(p, "utf8")).i;
    for (const inst of data) {
      if (inst.m.replace(/ Kommune$/, "") === "Køge") {
        names.set(inst.n.toLowerCase(), `${prefix}-${inst.id}`);
      }
    }
  }
  return names;
}

function fuzzyMatch(name, nameMap) {
  const lower = name.toLowerCase().trim();
  if (nameMap.has(lower)) return nameMap.get(lower);
  for (const [key, id] of nameMap) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }
  // Require at least 2 matching words for fuzzy match to avoid false positives
  const words = lower.split(/[\s\-\/]+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  for (const [key, id] of nameMap) {
    const kw = key.split(/[\s\-\/]+/).filter(w => w.length > 2);
    const overlap = words.filter(w => kw.some(k => k.includes(w) || w.includes(k))).length;
    if (overlap > bestScore && overlap >= 2) { bestScore = overlap; best = id; }
  }
  return best;
}

function main() {
  const nameMap = loadInstitutionNames();
  console.log(`Køge: ${nameMap.size} institutions in data`);

  const reports = [];
  let matched = 0;

  for (const r of KOEGE_REPORTS) {
    const folder = r.folder || "2025";
    const pdfUrl = `${BASE_URL}${folder}/${encodeURIComponent(r.pdf).replace(/%20/g, '-')}`;
    // Actually use the raw URL since Køge uses URL-encoded spaces
    const rawPdfUrl = `${BASE_URL}${folder}/${r.pdf}`;

    const id = fuzzyMatch(r.name, nameMap);
    if (id) matched++;

    reports.push({
      pdf_url: rawPdfUrl,
      link_text: `Tilsynsrapport ${r.name} ${r.year}`,
      institution_name: r.name,
      report_date: `${r.year}-01-01`,
      report_year: r.year,
      overall_rating: r.rating || "godkendt",
      strengths: [],
      areas_for_improvement: [],
      report_type: "anmeldt",
      matched_institution_id: id,
    });

    console.log(`  ${id ? "✓" : "✗"} ${r.name} -> ${id || "UNMATCHED"}${r.rating === "skærpet" ? " ⚠️  SKÆRPET" : ""}`);
  }

  const result = {
    municipality: "Køge",
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: reports.length - matched,
    reports: reports.filter(r => r.matched_institution_id),
  };

  const outPath = join(OUTPUT_DIR, "koege-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved: ${outPath}`);
  console.log(`  ${matched}/${KOEGE_REPORTS.length} matched, including 1 skærpet (Torpgården)`);
}

main();
