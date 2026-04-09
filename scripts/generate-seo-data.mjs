/**
 * Generates public/data/seo-meta.json for edge middleware bot rendering.
 * Maps institution IDs → [name, category, municipality] and municipality slugs → display names.
 * Run: node scripts/generate-seo-data.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../public/data");

const DANISH_MAP = { "æ": "ae", "ø": "oe", "å": "aa", "Æ": "Ae", "Ø": "Oe", "Å": "Aa" };

function toSlug(name) {
  return name
    .replace(/[æøåÆØÅ]/g, (ch) => DANISH_MAP[ch] || ch)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadJson(file) {
  return JSON.parse(readFileSync(resolve(DATA_DIR, file), "utf-8"));
}

// ── Load institution-stats.json for normering data ──
let instStats = {};
try { instStats = loadJson("institution-stats.json").kommuner || {}; } catch { /* optional */ }

const NORMERING_MAP = {
  vuggestue: "normering02",
  aldersintegreret: "normering02",
  boernehave: "normering35",
  dagpleje: "normeringDagpleje",
};

function getNormering(municipality, category) {
  const field = NORMERING_MAP[category];
  if (!field) return 0;
  const mun = instStats[municipality];
  if (!mun) return 0;
  return mun[field] || 0;
}

const institutions = {};
const municipalityNames = new Set();

// ── Pass 1: Dagtilbud data has canonical municipality names ("Gentofte", "København") ──
for (const file of ["vuggestue-data.json", "boernehave-data.json", "dagpleje-data.json", "sfo-data.json"]) {
  let data;
  try { data = loadJson(file); } catch { continue; }
  const forceCat = file.replace("-data.json", "");
  for (const d of data.i) {
    if (!d.id || !d.m) continue;
    municipalityNames.add(d.m);
    const cat = forceCat === "dagpleje" ? (d.tp || "dagpleje") : forceCat;
    // [name, category, municipality, price, address, postalCode, city, ownership, phone, lat, lng, normering, quality, count]
    institutions[d.id] = [d.n, cat, d.m, d.mr || 0, d.a || "", d.z || "", d.c || "", d.ow || "", d.ph || "", d.la || 0, d.lo || 0, getNormering(d.m, cat), "", 0];
  }
}

// Build a lookup to resolve school-format names → canonical names
// "Københavns Kommune" → "København", "Bornholms Regionskommune" → "Bornholm"
const canonicalBySlug = new Map();
for (const name of municipalityNames) {
  canonicalBySlug.set(toSlug(name), name);
}

function resolveSchoolMun(raw) {
  // Strip " Kommune" / "s Regionskommune"
  let m = raw.replace(/s? Regionskommune$/, "").replace(/ Kommune$/, "");
  // Try exact match first
  if (municipalityNames.has(m)) return m;
  // Try without trailing genitive 's' (e.g. "Københavns" → "København")
  if (m.endsWith("s") && municipalityNames.has(m.slice(0, -1))) return m.slice(0, -1);
  // Try slug-based match
  const slug = toSlug(m);
  if (canonicalBySlug.has(slug)) return canonicalBySlug.get(slug);
  // Fallback: use as-is and add to set
  municipalityNames.add(m);
  return m;
}

// ── Pass 2: Schools (have "Københavns Kommune" format) ──
const skoleData = loadJson("skole-data.json");
for (const s of skoleData.s) {
  if (s.t === "u") continue;
  const mun = s.m ? resolveSchoolMun(s.m) : null;
  if (!mun) continue;
  municipalityNames.add(mun);
  const cat = s.t === "e" ? "efterskole" : s.t === "p" ? "privatskole" : "folkeskole";
  // Build quality string from s.q
  let quality = "";
  if (s.q) {
    const parts = [];
    if (s.q.k != null) parts.push(`k${s.q.k}`);
    if (s.q.ts != null) parts.push(`t${s.q.ts}`);
    quality = parts.join(" ");
  }
  // [name, category, municipality, price, address, postalCode, city, ownership, phone, lat, lng, normering, quality, count]
  institutions[`school-${s.id}`] = [s.n, cat, mun, 0, s.a || "", s.z || "", s.c || "", "", "", s.la || 0, s.lo || 0, 0, quality, 0];
}

// ── Pass 3: Gymnasium + Fritidsklub (optional) ──
for (const file of ["gymnasium-data.json", "fritidsklub-data.json"]) {
  try {
    const data = loadJson(file);
    const items = data.i || data.s || [];
    const cat = file.replace("-data.json", "");
    for (const d of items) {
      if (!d.id || !d.m) continue;
      const mun = d.m.includes("Kommune") || d.m.includes("Regionskommune") ? resolveSchoolMun(d.m) : d.m;
      municipalityNames.add(mun);
      institutions[d.id] = [d.n, cat, mun, d.mr || 0, d.a || "", d.z || "", d.c || "", d.ow || "", d.ph || "", d.la || 0, d.lo || 0, getNormering(mun, cat), "", 0];
    }
  } catch { /* optional */ }
}

// ── Compute category+municipality counts (index 13) ──
const catMunCounts = {};
for (const arr of Object.values(institutions)) {
  const key = `${arr[1]}|${arr[2]}`;
  catMunCounts[key] = (catMunCounts[key] || 0) + 1;
}
for (const arr of Object.values(institutions)) {
  arr[13] = catMunCounts[`${arr[1]}|${arr[2]}`] || 0;
}

// ── Municipality slug → display name map ──
const municipalities = {};
for (const name of municipalityNames) {
  if (name === "Christiansø") continue; // Not a real municipality
  municipalities[toSlug(name)] = name;
}

const output = { i: institutions, m: municipalities };
const outPath = resolve(DATA_DIR, "seo-meta.json");
writeFileSync(outPath, JSON.stringify(output));

const instCount = Object.keys(institutions).length;
const munCount = Object.keys(municipalities).length;
const sizeKB = (Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(0);
console.log(`seo-meta.json: ${instCount} institutions, ${munCount} municipalities (${sizeKB} KB)`);
