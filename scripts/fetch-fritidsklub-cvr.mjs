#!/usr/bin/env node
/**
 * Fetches Danish fritidsklubber/fritidscentre via CVR data sources
 * and supplements existing sfo-data.json with new institutions.
 *
 * Data sources (tried in order):
 * 1. Virk.dk CVR data distribution (Elasticsearch) - no quota, full dataset
 * 2. cvrapi.dk free API - quota limited, single-result per query
 *
 * Strategy:
 * - Search for fritidsklub-related terms across all municipalities
 * - Geocode addresses via DAWA (dataforsyningen.dk)
 * - Deduplicate against existing sfo-data.json (name+municipality or distance < 100m)
 * - Output new institutions to fritidsklub-supplement.json
 *
 * Usage:
 *   node scripts/fetch-fritidsklub-cvr.mjs [--dry-run] [--source=virk|cvrapi|both]
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SFO_DATA_PATH = resolve(__dirname, "../public/data/sfo-data.json");
const OUTPUT_PATH = resolve(__dirname, "../public/data/fritidsklub-supplement.json");

const DRY_RUN = process.argv.includes("--dry-run");
const SOURCE_ARG = process.argv.find((a) => a.startsWith("--source="));
const SOURCE = SOURCE_ARG ? SOURCE_ARG.split("=")[1] : "both";

// ─── Configuration ─────────────────────────────────────────────────────

const SEARCH_TERMS = [
  "fritidsklub",
  "fritidscenter",
  "fritidshjem",
  "ungdomsklub",
  "børne- og ungecenter",
];

// All 98 Danish municipalities
const ALL_MUNICIPALITIES = [
  "Albertslund", "Allerød", "Assens", "Ballerup", "Billund", "Bornholm",
  "Brøndby", "Brønderslev", "Dragør", "Egedal", "Esbjerg", "Fanø",
  "Favrskov", "Faxe", "Fredensborg", "Fredericia", "Frederiksberg",
  "Frederikshavn", "Frederikssund", "Furesø", "Gentofte", "Gladsaxe",
  "Glostrup", "Greve", "Gribskov", "Guldborgsund", "Haderslev", "Halsnæs",
  "Hedensted", "Helsingør", "Herlev", "Herning", "Hillerød", "Hjørring",
  "Holbæk", "Holstebro", "Horsens", "Hvidovre", "Høje-Taastrup", "Hørsholm",
  "Ikast-Brande", "Ishøj", "Jammerbugt", "Kalundborg", "Kerteminde",
  "Kolding", "København", "Køge", "Langeland", "Lejre", "Lemvig",
  "Lolland", "Lyngby-Taarbæk", "Læsø", "Mariagerfjord", "Middelfart",
  "Morsø", "Norddjurs", "Nordfyns", "Nyborg", "Næstved", "Odder",
  "Odense", "Odsherred", "Randers", "Rebild", "Ringkøbing-Skjern",
  "Ringsted", "Roskilde", "Rudersdal", "Rødovre", "Samsø", "Silkeborg",
  "Skanderborg", "Skive", "Slagelse", "Solrød", "Sorø", "Stevns",
  "Struer", "Svendborg", "Syddjurs", "Sønderborg", "Thisted", "Tønder",
  "Tårnby", "Vallensbæk", "Varde", "Vejen", "Vejle", "Vesthimmerland",
  "Viborg", "Vordingborg", "Ærø", "Aabenraa", "Aalborg", "Aarhus",
];

const USER_AGENT = "InstitutionsguideBot/1.0 (institutionsguide.dk; data collection)";

// ─── HTTP helpers ──────────────────────────────────────────────────────

function httpGet(url, headers = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpGet(res.headers.location, headers, timeoutMs).then(resolve, reject);
      }
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
        } else {
          resolve(body);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

function httpPost(url, data, headers = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const parsed = new URL(url);
    const postData = typeof data === "string" ? data : JSON.stringify(data);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        ...headers,
      },
    };
    const req = mod.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
        } else {
          resolve(body);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Source 1: Virk.dk CVR Elasticsearch ───────────────────────────────

const VIRK_URL = "http://distribution.virk.dk/cvr-permanent/virksomhed/_search";

/**
 * Search Virk.dk Elasticsearch for fritidsklub-related businesses.
 * This endpoint has no quota and returns up to 10000 results per query.
 */
async function searchVirk(term, from = 0, size = 200) {
  const query = {
    _source: [
      "Vrvirksomhed.cvrNummer",
      "Vrvirksomhed.virksomhedMetadata.nyesteNavn",
      "Vrvirksomhed.virksomhedMetadata.nyesteBeliggenhedsadresse",
      "Vrvirksomhed.virksomhedMetadata.nyesteKontaktoplysninger",
      "Vrvirksomhed.virksomhedMetadata.sammensatStatus",
    ],
    query: {
      bool: {
        must: [
          {
            match_phrase: {
              "Vrvirksomhed.virksomhedMetadata.nyesteNavn.navn": term,
            },
          },
        ],
        filter: [
          {
            term: {
              "Vrvirksomhed.virksomhedMetadata.sammensatStatus": "NORMAL",
            },
          },
        ],
      },
    },
    from,
    size,
  };

  try {
    const raw = await httpPost(VIRK_URL, query, {}, 30000);
    const result = JSON.parse(raw);
    const hits = result.hits?.hits || [];
    const total = result.hits?.total?.value || result.hits?.total || 0;
    return { hits, total };
  } catch (err) {
    console.warn(`  Virk.dk error for "${term}": ${err.message}`);
    return { hits: [], total: 0 };
  }
}

/**
 * Parse a Virk.dk Elasticsearch hit into intermediate format.
 */
function parseVirkHit(hit) {
  const src = hit._source?.Vrvirksomhed;
  if (!src) return null;

  const meta = src.virksomhedMetadata || {};
  const nameObj = meta.nyesteNavn || {};
  const addr = meta.nyesteBeliggenhedsadresse || {};
  const kontakt = meta.nyesteKontaktoplysninger || [];

  // Extract contact info
  let phone = "";
  let email = "";
  for (const k of Array.isArray(kontakt) ? kontakt : [kontakt]) {
    if (k?.kontaktoplysning) {
      if (k.kontaktoplysning.includes("@")) email = k.kontaktoplysning;
      else if (/^\d{8}$/.test(k.kontaktoplysning.replace(/\s/g, ""))) {
        phone = k.kontaktoplysning.replace(/\s/g, "");
      }
    }
  }

  const vejnavn = addr.vejnavn || "";
  const husnr = addr.husnummerFra || "";
  const bogstav = addr.bogstavFra || "";
  const fullAddress = `${vejnavn} ${husnr}${bogstav}`.trim();

  return {
    name: (nameObj.navn || "").trim(),
    address: fullAddress,
    zipcode: addr.postnummer ? String(addr.postnummer) : "",
    city: addr.postdistrikt || "",
    municipality: addr.kommune?.kommuneNavn || "",
    phone,
    email,
    cvr: src.cvrNummer ? String(src.cvrNummer) : "",
  };
}

/**
 * Fetch all results from Virk.dk for all search terms.
 */
async function fetchFromVirk() {
  const results = new Map();
  let totalHits = 0;

  for (const term of SEARCH_TERMS) {
    console.log(`  Virk.dk: searching "${term}"...`);
    let from = 0;
    const size = 200;

    while (true) {
      const { hits, total } = await searchVirk(term, from, size);
      if (from === 0) {
        console.log(`    Found ${total} total results`);
        totalHits += typeof total === "number" ? total : 0;
      }

      for (const hit of hits) {
        const parsed = parseVirkHit(hit);
        if (!parsed || !parsed.name) continue;
        if (!isFritidsklubRelevant(parsed.name)) continue;
        const key = parsed.cvr || `${parsed.name}|${parsed.address}`;
        if (!results.has(key)) results.set(key, parsed);
      }

      if (hits.length < size) break; // no more pages
      from += size;
      await sleep(500); // be polite to Virk.dk
    }
  }

  console.log(`  Virk.dk: ${results.size} unique relevant results (from ~${totalHits} total hits)`);
  return results;
}

// ─── Source 2: cvrapi.dk ───────────────────────────────────────────────

/**
 * Search cvrapi.dk. Returns a single company match per query.
 * Note: this API has daily quota limits and returns only the best match.
 */
async function searchCVRApi(term, municipality) {
  const query = municipality ? `${term} ${municipality}` : term;
  const url = `https://cvrapi.dk/api?search=${encodeURIComponent(query)}&country=dk`;
  try {
    const raw = await httpGet(url, { "User-Agent": USER_AGENT });
    const data = JSON.parse(raw);

    // Check for quota exceeded
    if (data.error === "QUOTA_EXCEEDED") {
      return { results: [], quotaExceeded: true };
    }
    if (data.error) return { results: [], quotaExceeded: false };

    if (Array.isArray(data)) return { results: data, quotaExceeded: false };
    if (data && data.vat) return { results: [data], quotaExceeded: false };
    return { results: [], quotaExceeded: false };
  } catch (err) {
    if (err.message.includes("404") || err.message.includes("NOT_FOUND")) {
      return { results: [], quotaExceeded: false };
    }
    console.warn(`  cvrapi.dk error for "${query}": ${err.message}`);
    return { results: [], quotaExceeded: false };
  }
}

function parseCVRApiResult(r) {
  if (!r || !r.name) return null;
  return {
    name: r.name.trim(),
    address: r.address || "",
    zipcode: r.zipcode ? String(r.zipcode) : "",
    city: r.city || "",
    municipality: "", // resolved via DAWA
    phone: r.phone ? String(r.phone) : "",
    email: r.email || "",
    cvr: r.vat ? String(r.vat) : "",
  };
}

/**
 * Fetch results from cvrapi.dk. Searches per municipality per term.
 * Stops early if quota is exceeded.
 */
async function fetchFromCVRApi() {
  const results = new Map();
  let requestCount = 0;
  let quotaExceeded = false;

  for (const term of SEARCH_TERMS) {
    if (quotaExceeded) break;
    console.log(`  cvrapi.dk: searching "${term}"...`);

    // Standalone search first
    if (requestCount > 0) await sleep(1000);
    requestCount++;
    const standalone = await searchCVRApi(term, "");
    if (standalone.quotaExceeded) {
      console.warn("  cvrapi.dk: QUOTA EXCEEDED - stopping cvrapi.dk requests");
      quotaExceeded = true;
      break;
    }
    for (const r of standalone.results) {
      const parsed = parseCVRApiResult(r);
      if (!parsed || !isFritidsklubRelevant(parsed.name)) continue;
      const key = parsed.cvr || `${parsed.name}|${parsed.address}`;
      if (!results.has(key)) results.set(key, parsed);
    }

    // Per-municipality search
    for (const muni of ALL_MUNICIPALITIES) {
      if (quotaExceeded) break;
      if (requestCount > 0) await sleep(1000);
      requestCount++;

      const { results: apiResults, quotaExceeded: qe } = await searchCVRApi(term, muni);
      if (qe) {
        console.warn("  cvrapi.dk: QUOTA EXCEEDED - stopping cvrapi.dk requests");
        quotaExceeded = true;
        break;
      }

      if (apiResults.length > 0) {
        process.stdout.write(`    ${muni}: ${apiResults.length} result(s)\n`);
      }

      for (const r of apiResults) {
        const parsed = parseCVRApiResult(r);
        if (!parsed || !isFritidsklubRelevant(parsed.name)) continue;
        const key = parsed.cvr || `${parsed.name}|${parsed.address}`;
        if (!results.has(key)) results.set(key, parsed);
      }
    }
  }

  console.log(`  cvrapi.dk: ${results.size} unique relevant results (${requestCount} requests)`);
  if (quotaExceeded) {
    console.log("  cvrapi.dk: Results may be incomplete due to quota limit");
  }
  return results;
}

// ─── DAWA Geocoding ────────────────────────────────────────────────────

async function geocodeDAWA(address, zipcode, city) {
  // Try with full address first
  const fullAddr = `${address}, ${zipcode} ${city}`.trim().replace(/^,\s*/, "");
  const url = `https://api.dataforsyningen.dk/adresser?q=${encodeURIComponent(fullAddr)}&struktur=mini&per_side=1`;
  try {
    const raw = await httpGet(url);
    const results = JSON.parse(raw);
    if (results.length > 0) {
      const r = results[0];
      return {
        lat: r.y ?? null,
        lng: r.x ?? null,
        municipality: r.kommunenavn || "",
      };
    }
  } catch (err) {
    console.warn(`  DAWA geocode error for "${fullAddr}": ${err.message}`);
  }

  // Fallback: try just zipcode + city for municipality resolution
  if (zipcode) {
    try {
      const fallbackUrl = `https://api.dataforsyningen.dk/postnumre/${zipcode}`;
      const raw = await httpGet(fallbackUrl);
      const data = JSON.parse(raw);
      if (data.kommuner && data.kommuner.length > 0) {
        return {
          lat: null,
          lng: null,
          municipality: data.kommuner[0].navn || "",
        };
      }
    } catch { /* ignore */ }
  }

  return { lat: null, lng: null, municipality: "" };
}

// ─── Deduplication ─────────────────────────────────────────────────────

function normName(name) {
  return name
    .toLowerCase()
    .replace(/[,.\-–—'´`"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function geoDistM(lat1, lng1, lat2, lng2) {
  const dlat = (lat1 - lat2) * 111320;
  const dlng = (lng1 - lng2) * 111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

function isDuplicate(candidate, existingInstitutions) {
  const candNorm = normName(candidate.name || candidate.n || "");
  const candMuni = candidate.municipality || candidate.m || "";
  const candLat = candidate.lat ?? candidate.la ?? null;
  const candLng = candidate.lng ?? candidate.lo ?? null;

  for (const ex of existingInstitutions) {
    const exNorm = normName(ex.n || ex.name || "");
    const exMuni = ex.m || ex.municipality || "";

    // Match by normalized name + municipality
    if (candNorm === exNorm && candMuni === exMuni) {
      return true;
    }

    // Match by distance < 100m (if both have coordinates)
    const exLat = ex.la ?? ex.lat ?? null;
    const exLng = ex.lo ?? ex.lng ?? null;
    if (candLat && candLng && exLat && exLng) {
      if (geoDistM(candLat, candLng, exLat, exLng) < 100) {
        return true;
      }
    }
  }
  return false;
}

// ─── Relevance filter ──────────────────────────────────────────────────

function isFritidsklubRelevant(name) {
  const n = name.toLowerCase();
  const relevant = [
    "fritidsklub", "fritidscenter", "fritidshjem", "ungdomsklub",
    "ungecenter", "børne- og unge", "juniorklub", "fritidsordning",
    "ungdomshus", "fritids-", "ungdomscenter", "fritidstilbud",
    "fritidsinstitution", "aktivitetsklub",
  ];
  // Must match at least one relevant term
  if (!relevant.some((term) => n.includes(term))) return false;

  // Exclude obvious false positives
  const exclude = [
    "revision", "advokat", "holding", "invest", "ejendom",
    "consulting", "rådgivning", "forsikring", "finans",
    "restaurant", "café", "kiosk", "butik",
  ];
  if (exclude.some((term) => n.includes(term))) return false;

  return true;
}

// ─── Format to output structure ────────────────────────────────────────

function formatInstitution(entry, index) {
  const id = entry.cvr ? `CVR${entry.cvr}` : `FK${String(index + 1).padStart(4, "0")}`;

  const inst = {
    id,
    n: entry.name,
    tp: "klub",
    ow: guessOwnership(entry.name),
    m: entry.municipality,
    a: entry.address,
    z: entry.zipcode,
    c: entry.city,
  };

  // Only include coordinates if we have them
  if (entry.lat != null) inst.la = round6(entry.lat);
  if (entry.lng != null) inst.lo = round6(entry.lng);
  if (entry.email) inst.e = entry.email;
  if (entry.phone) inst.ph = entry.phone;

  return inst;
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function guessOwnership(name) {
  const n = name.toLowerCase();
  if (n.includes("selvejende") || n.includes("forening")) return "selvejende";
  if (n.includes("privat")) return "privat";
  return "kommunal";
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Fetch Fritidsklub CVR Data ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Source: ${SOURCE}`);
  console.log();

  // Load existing data
  const existingData = JSON.parse(readFileSync(SFO_DATA_PATH, "utf-8"));
  const existingInstitutions = existingData.i || [];
  console.log(`Loaded ${existingInstitutions.length} existing institutions from sfo-data.json\n`);

  // Collect results from selected sources
  const allResults = new Map();

  // Source 1: Virk.dk
  if (SOURCE === "virk" || SOURCE === "both") {
    console.log("--- Fetching from Virk.dk ---");
    const virkResults = await fetchFromVirk();
    for (const [key, val] of virkResults) {
      allResults.set(key, val);
    }
    console.log();
  }

  // Source 2: cvrapi.dk
  if (SOURCE === "cvrapi" || SOURCE === "both") {
    console.log("--- Fetching from cvrapi.dk ---");
    const cvrResults = await fetchFromCVRApi();
    for (const [key, val] of cvrResults) {
      // Only add if not already found via Virk.dk
      if (!allResults.has(key)) allResults.set(key, val);
    }
    console.log();
  }

  console.log(`Total unique relevant results across all sources: ${allResults.size}`);

  if (allResults.size === 0) {
    console.log("No results found. Exiting.");
    return;
  }

  // Geocode addresses that need it (entries without coordinates or municipality)
  console.log("\nGeocoding addresses via DAWA...");
  let geocodeCount = 0;
  let geocodedOk = 0;

  for (const [, entry] of allResults) {
    const needsGeocode = !entry.lat || !entry.lng || !entry.municipality;
    if (!needsGeocode) continue;

    if (geocodeCount > 0) await sleep(200); // DAWA rate limit
    geocodeCount++;

    const geo = await geocodeDAWA(entry.address, entry.zipcode, entry.city);
    if (geo.lat != null) { entry.lat = geo.lat; entry.lng = geo.lng; geocodedOk++; }
    if (geo.municipality) entry.municipality = geo.municipality;

    if (geocodeCount % 25 === 0) {
      console.log(`  Geocoded ${geocodeCount} entries (${geocodedOk} with coordinates)...`);
    }
  }

  if (geocodeCount > 0) {
    console.log(`  Geocoded ${geocodeCount} entries total (${geocodedOk} with coordinates)`);
  }

  // Deduplicate against existing institutions
  console.log("\nDeduplicating against existing data...");
  const newInstitutions = [];
  let dupCount = 0;
  let noMuniCount = 0;

  for (const [, entry] of allResults) {
    // Skip entries without a municipality (can't be useful)
    if (!entry.municipality) {
      noMuniCount++;
      continue;
    }

    if (isDuplicate(entry, existingInstitutions)) {
      dupCount++;
      continue;
    }

    // Also deduplicate within our own new results
    const alreadyAdded = newInstitutions.some((inst) => {
      if (normName(inst.n) === normName(entry.name) && inst.m === entry.municipality) return true;
      if (inst.la && inst.lo && entry.lat && entry.lng) {
        return geoDistM(inst.la, inst.lo, entry.lat, entry.lng) < 100;
      }
      return false;
    });

    if (alreadyAdded) {
      dupCount++;
      continue;
    }

    newInstitutions.push(formatInstitution(entry, newInstitutions.length));
  }

  console.log(`  Duplicates removed: ${dupCount}`);
  if (noMuniCount > 0) console.log(`  Skipped (no municipality): ${noMuniCount}`);
  console.log(`  New institutions found: ${newInstitutions.length}`);

  if (newInstitutions.length === 0) {
    console.log("\nNo new institutions to add.");
    return;
  }

  // Summary
  console.log("\n--- New institutions ---");
  const byMuni = {};
  for (const inst of newInstitutions) {
    byMuni[inst.m] = (byMuni[inst.m] || 0) + 1;
    console.log(`  ${inst.id} | ${inst.n} | ${inst.m} | ${inst.a}, ${inst.z} ${inst.c}`);
  }
  console.log("\nBy municipality:");
  for (const [m, count] of Object.entries(byMuni).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${m}: ${count}`);
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would write ${newInstitutions.length} institutions to:`, OUTPUT_PATH);
    return;
  }

  // Write output
  const output = { i: newInstitutions };
  writeFileSync(OUTPUT_PATH, JSON.stringify(output), "utf-8");
  console.log(`\nWrote ${newInstitutions.length} institutions to ${OUTPUT_PATH}`);
}

// ─── Run ───────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
