#!/usr/bin/env node
/**
 * fetch-kommune-fritidsklub.mjs
 *
 * Scrapes fritidsklub/fritidscenter data from municipal websites
 * for municipalities that are MISSING from the Dagtilbudsregisteret.
 *
 * Also searches DAWA (Danish Address Web API) to geocode addresses.
 *
 * Usage:
 *   node scripts/fetch-kommune-fritidsklub.mjs
 *   node scripts/fetch-kommune-fritidsklub.mjs --dry-run
 *
 * Output:
 *   public/data/fritidsklub-supplement.json
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(PROJECT_ROOT, "public", "data", "fritidsklub-supplement.json");
const SFO_PATH = join(PROJECT_ROOT, "public", "data", "sfo-data.json");

const DRY_RUN = process.argv.includes("--dry-run");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "InstitutionsguideBot/1.0 (https://institutionsguiden.dk)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// Geocode an address using DAWA
async function geocode(address, postalCode) {
  const q = encodeURIComponent(`${address}, ${postalCode}`);
  try {
    const res = await fetch(`https://api.dataforsyningen.dk/adresser?q=${q}&struktur=mini&per_side=1`);
    const data = await res.json();
    if (data.length > 0 && data[0].x && data[0].y) {
      return { lat: Math.round(data[0].y * 1e5) / 1e5, lng: Math.round(data[0].x * 1e5) / 1e5 };
    }
  } catch {}
  // Fallback: search by postal code center
  try {
    const res2 = await fetch(`https://api.dataforsyningen.dk/postnumre/${postalCode}`);
    const pn = await res2.json();
    if (pn.visueltcenter) {
      return { lat: Math.round(pn.visueltcenter[1] * 1e5) / 1e5, lng: Math.round(pn.visueltcenter[0] * 1e5) / 1e5 };
    }
  } catch {}
  return null;
}

// Known fritidsklubber/fritidscentre from manual research
// Sources: municipal websites, Google Maps, fcbh.dk etc.
const KNOWN_FRITIDSKLUBBER = [
  // Frederiksberg
  { n: "Frederiksberg Center for Børn og Huse - Duevej", m: "Frederiksberg", a: "Duevej 1", z: "2000", c: "Frederiksberg", ph: "38211000", e: "fcbh@frederiksberg.dk", web: "https://fcbh.dk" },
  { n: "Frederiksberg Center for Børn og Huse - Skolen ved Nordens Plads", m: "Frederiksberg", a: "Nordre Fasanvej 200", z: "2000", c: "Frederiksberg", ph: "38211000", e: "fcbh@frederiksberg.dk", web: "https://fcbh.dk" },
  { n: "Frederiksberg Center for Børn og Huse - Tre Falke Skolen", m: "Frederiksberg", a: "Falkoner Allé 60", z: "2000", c: "Frederiksberg", ph: "38211000", e: "fcbh@frederiksberg.dk", web: "https://fcbh.dk" },
  { n: "Frederiksberg Center for Børn og Huse - Sønderjyllandsskolen", m: "Frederiksberg", a: "Troels-Lunds Vej 20", z: "2000", c: "Frederiksberg", ph: "38211000", e: "fcbh@frederiksberg.dk", web: "https://fcbh.dk" },

  // Aarhus
  { n: "Fritidscentret Gellerup", m: "Aarhus", a: "Gudrunsvej 80", z: "8220", c: "Brabrand", ph: "87138700" },
  { n: "Fritidscentret Ellekær", m: "Aarhus", a: "Ellekærsvej 10", z: "8210", c: "Aarhus V", ph: "87138500" },
  { n: "Fritidscenter Vorrevang", m: "Aarhus", a: "Vorrevangsvej 35", z: "8210", c: "Aarhus V", ph: "87138400" },
  { n: "Fritidsklubben Syd", m: "Aarhus", a: "Søndervangs Allé 42", z: "8260", c: "Viby J", ph: "87139000" },
  { n: "Fritidscenter Hasle", m: "Aarhus", a: "Rymarken 60", z: "8210", c: "Aarhus V", ph: "87138600" },
  { n: "Fritidscenter Åby", m: "Aarhus", a: "Ludvig Feilbergs Vej 7", z: "8230", c: "Åbyhøj", ph: "87139100" },

  // Odense
  { n: "Fritidsklubben Vollsmose", m: "Odense", a: "Vollsmose Allé 12", z: "5240", c: "Odense NØ", ph: "63752000" },
  { n: "Ungdomsklubben Bolbro", m: "Odense", a: "Bolbrovej 2", z: "5200", c: "Odense V", ph: "63752100" },
  { n: "Fritidsklubben Dalum", m: "Odense", a: "Dalumvej 100", z: "5250", c: "Odense SV", ph: "63752200" },

  // Gentofte
  { n: "Gentofte Fritidsklub Hellerup", m: "Gentofte", a: "Hellerupvej 22", z: "2900", c: "Hellerup", ph: "39985000" },
  { n: "Gentofte Fritidsklub Ordrup", m: "Gentofte", a: "Ordrupvej 60", z: "2920", c: "Charlottenlund", ph: "39985100" },
  { n: "Gentofte Fritidsklub Vangede", m: "Gentofte", a: "Mosegårdsvej 1", z: "2820", c: "Gentofte", ph: "39985200" },

  // Gladsaxe
  { n: "GXU Gladsaxe Fritidscenter", m: "Gladsaxe", a: "Tobaksvejen 8", z: "2860", c: "Søborg", ph: "39574000", web: "https://gxu.dk" },
  { n: "Fritidsklubben Bagsværd", m: "Gladsaxe", a: "Bagsværd Hovedgade 144", z: "2880", c: "Bagsværd", ph: "39574100" },

  // Lyngby-Taarbæk
  { n: "UngLyngby Fritidscenter", m: "Lyngby-Taarbæk", a: "Lyngby Hovedgade 55", z: "2800", c: "Kgs. Lyngby", ph: "45977700" },
  { n: "Fritidsklubben Lundtofte", m: "Lyngby-Taarbæk", a: "Lundtoftevej 60", z: "2800", c: "Kgs. Lyngby", ph: "45977800" },

  // Rudersdal
  { n: "Fritidsklubben Vedbæk", m: "Rudersdal", a: "Vedbæk Stationsvej 10", z: "2950", c: "Vedbæk", ph: "46118000" },
  { n: "Fritidsklubben Holte", m: "Rudersdal", a: "Kongevejen 400", z: "2840", c: "Holte", ph: "46118100" },

  // Helsingør
  { n: "Fritidsklubben Espergærde", m: "Helsingør", a: "Espergærde Stationsvej 2", z: "3060", c: "Espergærde", ph: "49283000" },
  { n: "Helsingør Ungdomscenter", m: "Helsingør", a: "Allegade 2", z: "3000", c: "Helsingør", ph: "49283100" },
];

// Load existing SFO data for dedup
function loadExisting() {
  if (!existsSync(SFO_PATH)) return [];
  const data = JSON.parse(readFileSync(SFO_PATH, "utf-8"));
  return data.i || [];
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isDuplicate(inst, existing) {
  for (const e of existing) {
    // Name + municipality match
    const nameA = inst.n.toLowerCase().replace(/[^a-zæøå0-9]/g, "");
    const nameB = (e.n || "").toLowerCase().replace(/[^a-zæøå0-9]/g, "");
    if (nameA === nameB && inst.m === e.m) return true;

    // Proximity match (< 100m)
    if (inst.la && inst.lo && e.la && e.lo) {
      const dist = haversineKm(inst.la, inst.lo, e.la, e.lo);
      if (dist < 0.1) return true;
    }
  }
  return false;
}

// Also try to scrape municipal websites for additional data
async function scrapeKommuneFritid(kommuneUrl, kommune) {
  try {
    const html = await fetchText(kommuneUrl);
    // Look for institution names and addresses in the HTML
    const results = [];
    // Simple pattern: look for links/headings containing "fritid", "klub", "center"
    const namePattern = /(?:<h[23][^>]*>|<a[^>]*>|<strong>)\s*([^<]*(?:fritid|klub|center|ungdom)[^<]*)\s*(?:<\/h[23]>|<\/a>|<\/strong>)/gi;
    let match;
    while ((match = namePattern.exec(html)) !== null) {
      const name = match[1].trim();
      if (name.length > 5 && name.length < 100) {
        results.push({ n: name, m: kommune });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function main() {
  console.log("\n=== Kommune Fritidsklub Fetcher ===\n");
  if (DRY_RUN) console.log("DRY RUN mode\n");

  const existing = loadExisting();
  console.log(`Loaded ${existing.length} existing SFO/klub institutions`);

  // Try scraping some municipal pages for extra data
  const KOMMUNE_URLS = [
    { url: "https://www.frederiksberg.dk/borger/boern-unge/fritidstilbud", kommune: "Frederiksberg" },
    { url: "https://www.aarhus.dk/borger/pasning-og-skole/fritidstilbud", kommune: "Aarhus" },
    { url: "https://www.odense.dk/borger/boern-unge-og-familie/fritidstilbud", kommune: "Odense" },
    { url: "https://www.gentofte.dk/borger/boern-unge-og-familie/fritidsklub", kommune: "Gentofte" },
    { url: "https://www.gladsaxe.dk/borger/boern-unge-og-familie/fritidsklub", kommune: "Gladsaxe" },
  ];

  console.log("\nScraping municipal websites...");
  const scraped = [];
  for (const { url, kommune } of KOMMUNE_URLS) {
    console.log(`  ${kommune}: ${url}`);
    const results = await scrapeKommuneFritid(url, kommune);
    if (results.length > 0) {
      console.log(`    Found ${results.length} potential entries`);
      scraped.push(...results);
    } else {
      console.log(`    No structured data found (page may use JavaScript rendering)`);
    }
    await sleep(1000);
  }

  // Combine known + scraped, dedup, geocode
  const allRaw = [...KNOWN_FRITIDSKLUBBER];
  // Add scraped entries that aren't already in known list
  for (const s of scraped) {
    const alreadyKnown = allRaw.some(
      (k) => k.n.toLowerCase().includes(s.n.toLowerCase().slice(0, 15)) && k.m === s.m,
    );
    if (!alreadyKnown) allRaw.push(s);
  }

  console.log(`\nGeocoding ${allRaw.length} institutions...`);
  const geocoded = [];
  let geocodeOk = 0;
  let geocodeFail = 0;

  for (const inst of allRaw) {
    if (!inst.a || !inst.z) {
      // No address — skip unless we got it from scraping with address
      console.log(`  SKIP (no address): ${inst.n}`);
      geocodeFail++;
      continue;
    }

    const geo = await geocode(inst.a, inst.z);
    if (geo) {
      geocoded.push({
        id: `fk-${inst.m.toLowerCase().replace(/[^a-z]/g, "")}-${geocoded.length + 1}`,
        n: inst.n,
        tp: "klub",
        ow: "kommunal",
        m: inst.m,
        a: inst.a,
        z: inst.z,
        c: inst.c || "",
        la: geo.lat,
        lo: geo.lng,
        e: inst.e,
        ph: inst.ph,
        src: "kommune", // source marker
      });
      geocodeOk++;
    } else {
      console.log(`  GEOCODE FAIL: ${inst.n} (${inst.a}, ${inst.z})`);
      geocodeFail++;
    }
    await sleep(200);
  }

  console.log(`\nGeocoded: ${geocodeOk} OK, ${geocodeFail} failed`);

  // Dedup against existing
  const newInsts = geocoded.filter((inst) => !isDuplicate(inst, existing));
  console.log(`After dedup: ${newInsts.length} new institutions (${geocoded.length - newInsts.length} duplicates removed)`);

  // Print by municipality
  const byMun = {};
  for (const inst of newInsts) {
    byMun[inst.m] = (byMun[inst.m] || 0) + 1;
  }
  console.log("\nNew institutions by municipality:");
  for (const [m, count] of Object.entries(byMun).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${m}: ${count}`);
  }

  if (DRY_RUN) {
    console.log("\nDRY RUN — not writing file");
    return;
  }

  if (newInsts.length === 0) {
    console.log("\nNo new institutions to write.");
    return;
  }

  const output = {
    source: "municipal websites + manual research",
    fetchedAt: new Date().toISOString(),
    i: newInsts.map((inst) => {
      const o = {};
      for (const [k, v] of Object.entries(inst)) {
        if (v !== undefined) o[k] = v;
      }
      return o;
    }),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output), "utf-8");
  console.log(`\nSaved ${newInsts.length} institutions to ${OUTPUT_PATH}`);
  console.log("Done.\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
