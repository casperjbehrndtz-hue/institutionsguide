/**
 * Rebuild all institution data from raw Dagtilbudsregisteret CSV.
 * Fixes:
 *  - Aldersintegreret (0-5) appears in BOTH vuggestue AND børnehave
 *  - All dagplejere included (was missing some)
 *  - Proper børnehave dataset
 *  - Compact format with short keys
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_CSV = resolve(__dirname, "../../shared-childcare-engine/data/dagtilbud-register.csv");
const OUT_DIR = resolve(__dirname, "../public/data");

// Parse semicolon CSV
function parseCSV(raw) {
  const lines = raw.replace(/^\uFEFF/, "").split("\n").filter(Boolean);
  const headers = lines[0].split(";").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(";");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || "").trim(); });
    return obj;
  });
}

// Load rates - extract array from TS file using Function constructor
const ratesPath = resolve(__dirname, "../src/lib/childcare/rates.ts");
const ratesRaw = readFileSync(ratesPath, "utf-8");
const ratesMatch = ratesRaw.match(/=\s*\[([\s\S]*?)\];/);
const ratesArray = ratesMatch ? Function("return [" + ratesMatch[1] + "]")() : [];
console.log(`Parsed ${ratesArray.length} rate entries`);
const ratesByMunicipality = new Map(ratesArray.map(r => [r.municipality, r]));

console.log(`Loaded ${ratesByMunicipality.size} municipality rates`);

// Parse raw data
const raw = readFileSync(RAW_CSV, "utf-8");
const rows = parseCSV(raw);

// Filter: only active anvisningsenheder (they have addresses)
const active = rows.filter(r => r.dagtilbudsType === "anvisningsenhed" && r.aktivitetsstatus === "Aktiv");
console.log(`Active anvisningsenheder: ${active.length}`);

// Type mapping
const TYPE_MAP = {
  "6010": "vuggestue",
  "6011": "boernehave",
  "6012": "aldersintegreret",
  "6013": "dagpleje",
  "6014": "boernehave", // Børnehave 2-5
  "6020": "sfo",
  "6021": "klub",
  "6022": "andet",
};

const OWN_MAP = { "1": "kommunal", "2": "selvejende", "3": "privat", "4": "udliciteret" };

function getRate(municipality, type) {
  const r = ratesByMunicipality.get(municipality);
  if (!r) return null;
  switch (type) {
    case "vuggestue": case "aldersintegreret": return r.vuggestue;
    case "boernehave": return r.boernehave;
    case "dagpleje": return r.dagpleje;
    case "sfo": return r.sfo;
    default: return null;
  }
}

// Process all institutions
const all = active
  .filter(r => r.instType3 && TYPE_MAP[r.instType3])
  .map(r => {
    const type = TYPE_MAP[r.instType3];
    const municipality = r.kommuneKode_Tekst || r.admKommuneKode_Tekst || "";
    const ar = getRate(municipality, type);
    const lat = r.geoBredde ? parseFloat(r.geoBredde.replace(",", ".")) : null;
    const lng = r.geoLaengde ? parseFloat(r.geoLaengde.replace(",", ".")) : null;

    return {
      id: r.anvisningsenhedsNummer || r.daginstitutionsNummer,
      n: r.dagtilbudsNavn,
      tp: type,
      ow: OWN_MAP[r.ejerformKode] || "kommunal",
      m: municipality,
      a: [r.vejNavn, r.husNummer].filter(Boolean).join(" "),
      z: r.postNummer || "",
      c: r.byNavn || r.supplerendeBynavn || "",
      la: lat ? Math.round(lat * 1e5) / 1e5 : null,
      lo: lng ? Math.round(lng * 1e5) / 1e5 : null,
      e: r.email || undefined,
      ph: r.telefonNummer || undefined,
      ar: ar || undefined,
      mr: ar ? Math.round(ar / 12) : undefined,
    };
  })
  .filter(i => i.la && i.lo); // Must have coordinates

console.log(`Total with coordinates: ${all.length}`);

// Split by category
// KEY FIX: aldersintegreret appears in BOTH vuggestue AND børnehave
const vuggestuer = all.filter(i => i.tp === "vuggestue" || i.tp === "aldersintegreret");
const boernehaver = all.filter(i => i.tp === "boernehave" || i.tp === "aldersintegreret");
const dagplejere = all.filter(i => i.tp === "dagpleje");
const sfoer = all.filter(i => i.tp === "sfo" || i.tp === "klub");

// For børnehave entries of aldersintegreret, use børnehave rate instead
for (const inst of boernehaver) {
  if (inst.tp === "aldersintegreret") {
    const bhRate = ratesByMunicipality.get(inst.m)?.boernehave;
    if (bhRate) {
      // Create a copy with børnehave rate for the børnehave listing
      inst._bhRate = Math.round(bhRate / 12);
      inst._bhAnnual = bhRate;
    }
  }
}

console.log(`\nCategory breakdown:`);
console.log(`  Vuggestuer (incl. aldersintegreret): ${vuggestuer.length}`);
console.log(`  Børnehaver (incl. aldersintegreret): ${boernehaver.length}`);
console.log(`  Dagplejere: ${dagplejere.length}`);
console.log(`  SFO/klub: ${sfoer.length}`);

// Write compact JSON
function writeCompact(filename, items, label) {
  // Strip undefined values
  const clean = items.map(i => {
    const o = {};
    for (const [k, v] of Object.entries(i)) {
      if (v !== undefined && !k.startsWith("_")) o[k] = v;
    }
    return o;
  });
  const json = JSON.stringify({ i: clean });
  writeFileSync(resolve(OUT_DIR, filename), json);
  console.log(`${label}: ${items.length} → ${(json.length / 1024).toFixed(0)} KB`);
}

writeCompact("vuggestue-data.json", vuggestuer, "Vuggestuer");
writeCompact("dagpleje-data.json", dagplejere, "Dagplejere");

// For børnehaver, create separate file with proper rates for aldersintegreret
const bhItems = boernehaver.map(i => {
  if (i.tp === "aldersintegreret" && i._bhRate) {
    return { ...i, mr: i._bhRate, ar: i._bhAnnual, tp: "aldersintegreret" };
  }
  return i;
});
writeCompact("boernehave-data.json", bhItems, "Børnehaver");
writeCompact("sfo-data.json", sfoer, "SFO/Klub");

console.log("\nDone! All data files regenerated.");
