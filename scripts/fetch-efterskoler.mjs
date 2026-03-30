#!/usr/bin/env node
/**
 * Fetches efterskole data from efterskolerne.dk API and merges it with
 * existing STIL-based skole-data.json to enrich efterskole entries with
 * prices, profiles, availability, pupil counts, and images.
 *
 * Strategy:
 * - STIL "efterskoler" that are actually ungdomsskoler get reclassified as t:"u"
 *   (they are NOT real boarding schools / efterskoler)
 * - API efterskoler are matched to STIL by name or proximity
 * - Unmatched API schools are added as new entries
 * - Municipality is assigned to new schools by finding nearest known school
 *
 * Usage: node scripts/fetch-efterskoler.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKOLE_DATA_PATH = resolve(__dirname, "../public/data/skole-data.json");
const API_URL = "https://www.efterskolerne.dk/searchschool?t=";

// ─── Helpers ────────────────────────────────────────────────────────────

function parsePrice(priceStr) {
  if (!priceStr) return null;
  return parseInt(priceStr.replace(/\./g, "").replace(/\s*kr\s*/i, ""), 10) || null;
}

function parseCoords(locationStr) {
  if (!locationStr) return null;
  const [lat, lng] = locationStr.split(";").map(Number);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function normName(name) {
  return name
    .toLowerCase()
    .replace(/[,.\-–—'´`]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ kommune$/i, "")
    .trim();
}

/** Distance in km between two coordinates */
function geoDistKm(lat1, lng1, lat2, lng2) {
  const dlat = (lat1 - lat2) * 111.32;
  const dlng = (lng1 - lng2) * 111.32 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/** Check if a STIL entry is an ungdomsskole (not a real efterskole) */
function isUngdomsskole(name) {
  const n = name.toLowerCase();
  return n.includes("ungdomsskole") ||
    n.includes("ungecenter") ||
    n.includes("ung i ") ||
    n.includes("10. klasses") ||
    n.includes("heltid") ||
    (n.includes("ungdoms") && !n.includes("efterskole"));
}

function computeAvailability(lines) {
  if (!lines || lines.length === 0) return null;
  const currentYear = "2025-2026";
  let ledig = 0, optaget = 0, venteliste = 0;
  for (const line of lines) {
    for (const year of line.years || []) {
      if (year.yearName !== currentYear) continue;
      for (const grade of year.grades || []) {
        for (const status of [grade.girlsStatus, grade.boysStatus]) {
          if (status === "Ledig") ledig++;
          else if (status === "Optaget") optaget++;
          else if (status === "Venteliste") venteliste++;
        }
      }
    }
  }
  return { ledig, optaget, venteliste };
}

const PROFILE_KEYWORDS = {
  sport: ["sport", "fodbold", "håndbold", "basketball", "basket", "tennis", "atletik", "fitness", "svømme", "badminton", "gymnastik", "spring", "crossfit", "volleyball", "rugby", "hockey", "boksning"],
  outdoor: ["outdoor", "adventure", "natur", "sejl", "kano", "kajak", "surf", "ski", "klatring", "mountainbike", "mtb", "ride", "dykning", "jagt", "fiskeri"],
  musik: ["musik", "band", "sang", "kor", "guitar", "klaver", "trommer", "produktion"],
  kunst: ["kunst", "design", "tegn", "mal", "keramik", "foto", "film", "animation", "kreativ", "mode", "grafisk", "arkitektur", "glas"],
  teater: ["teater", "drama", "musical", "skuespil", "cirkus", "dans"],
  it: ["programmering", "gaming", "e-sport", "esport", "it", "robot", "teknologi", "3d print", "app", "computer", "digital"],
  international: ["international", "global", "rejse", "afrika", "asien", "usa", "amerika", "udveksling"],
  haandvaerk: ["håndværk", "smed", "træ", "snedker", "mekani", "auto", "motor", "landbrug"],
  ordblinde: ["ordblind", "dysleksi"],
};

function extractProfiles(offers) {
  if (!offers || offers.length === 0) return [];
  const matched = new Set();
  for (const offer of offers) {
    const name = offer.name.toLowerCase();
    for (const [profile, keywords] of Object.entries(PROFILE_KEYWORDS)) {
      if (keywords.some((kw) => name.includes(kw))) {
        matched.add(profile);
      }
    }
  }
  return [...matched].sort();
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching efterskoler from efterskolerne.dk...");
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const json = await res.json();
  const apiSchools = json.Data.Results;
  console.log(`Got ${apiSchools.length} efterskoler from API`);

  // Load existing skole-data.json
  const skoleData = JSON.parse(readFileSync(SKOLE_DATA_PATH, "utf-8"));
  const allSchools = skoleData.s;

  // Step 1: Reclassify ungdomsskoler — they should NOT be shown as efterskoler
  let reclassified = 0;
  const realStilEfterskoler = [];
  for (const s of allSchools) {
    if (s.t === "e") {
      if (isUngdomsskole(s.n)) {
        s.t = "u"; // ungdomsskole — will be filtered out in DataContext
        reclassified++;
      } else {
        realStilEfterskoler.push(s);
      }
    }
  }
  console.log(`Reclassified ${reclassified} ungdomsskoler (t:"u")`);
  console.log(`Real STIL efterskoler remaining: ${realStilEfterskoler.length}`);

  // Build lookup for matching
  const stilByName = new Map();
  for (const s of realStilEfterskoler) {
    stilByName.set(normName(s.n), s);
  }

  // Build list of all schools with coordinates for municipality assignment
  const schoolsWithCoords = allSchools.filter((s) => s.la && s.lo && s.m);

  // Find nearest known municipality for a coordinate
  function findMunicipality(lat, lng) {
    let bestDist = Infinity;
    let bestMun = "";
    for (const s of schoolsWithCoords) {
      const dist = geoDistKm(lat, lng, s.la, s.lo);
      if (dist < bestDist) {
        bestDist = dist;
        bestMun = s.m;
      }
    }
    return bestDist < 30 ? bestMun : ""; // max 30km
  }

  let matched = 0;
  let enriched = 0;
  let newSchools = 0;
  const usedStilIds = new Set();

  for (const api of apiSchools) {
    const coords = parseCoords(api.Location);
    if (!coords) continue;

    const price = parsePrice(api.Price);
    const pupils = parseInt(api.Pupils, 10) || null;
    const profiles = extractProfiles(api.Offers);
    const availability = computeAvailability(api.Lines);
    const classes = (api.Classes || []).map(Number).filter(Boolean);

    // Build enrichment fields
    const enrichment = {
      yp: price,                                    // yearly price
      wp: price ? Math.round(price / 42) : null,    // weekly price (~42 weeks)
      pr: profiles.length > 0 ? profiles : undefined,
      sc: api.SchoolTypeContent || undefined,        // Almen/Ordblinde/Special
      cl: classes.length > 0 ? classes : undefined,
      av: availability?.ledig > 0 ? availability.ledig : undefined,
      img: api.ListImageUrl || undefined,
      edk: api.Id,
      url: api.ItemUrl || undefined,
    };

    // Try matching: exact name, partial name, then geo proximity
    const apiNameNorm = normName(api.Title);
    let stilEntry = stilByName.get(apiNameNorm);

    if (!stilEntry) {
      for (const [key, entry] of stilByName) {
        if (usedStilIds.has(entry.id)) continue;
        // Match "xxx efterskole" ↔ "xxx efterskolen" etc.
        const keyBase = key.replace(/(n|en)$/, "");
        const apiBase = apiNameNorm.replace(/(n|en)$/, "");
        if (keyBase === apiBase || key.includes(apiNameNorm) || apiNameNorm.includes(key)) {
          stilEntry = entry;
          break;
        }
      }
    }

    if (!stilEntry) {
      for (const s of realStilEfterskoler) {
        if (usedStilIds.has(s.id)) continue;
        if (geoDistKm(s.la, s.lo, coords.lat, coords.lng) < 1) {
          stilEntry = s;
          break;
        }
      }
    }

    if (stilEntry && !usedStilIds.has(stilEntry.id)) {
      usedStilIds.add(stilEntry.id);
      matched++;
      Object.assign(stilEntry, enrichment);
      if (!stilEntry.q) stilEntry.q = {};
      if (!stilEntry.q.el && pupils) stilEntry.q.el = pupils;
      enriched++;
    } else {
      // New school — find municipality from coordinates
      const mun = findMunicipality(coords.lat, coords.lng);
      allSchools.push({
        id: `edk-${api.Id}`,
        n: api.Title,
        t: "e",
        m: mun,
        a: "",
        z: "",
        c: "",
        la: coords.lat,
        lo: coords.lng,
        ...enrichment,
        q: pupils ? { el: pupils } : undefined,
      });
      newSchools++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Matched & enriched: ${enriched}`);
  console.log(`  New schools added:  ${newSchools}`);
  console.log(`  Unmatched STIL:     ${realStilEfterskoler.length - matched}`);
  console.log(`  Total schools now:  ${allSchools.length}`);

  // Write updated data
  skoleData.s = allSchools;
  writeFileSync(SKOLE_DATA_PATH, JSON.stringify(skoleData));
  console.log(`\nWrote ${SKOLE_DATA_PATH}`);

  // Summary
  const finalEfterskoler = allSchools.filter((s) => s.t === "e");
  const withPrice = finalEfterskoler.filter((s) => s.yp);
  const withProfiles = finalEfterskoler.filter((s) => s.pr && s.pr.length > 0);
  const withAvail = finalEfterskoler.filter((s) => s.av);
  const withMun = finalEfterskoler.filter((s) => s.m);
  console.log(`\nFinal efterskole stats:`);
  console.log(`  Total: ${finalEfterskoler.length}`);
  console.log(`  With price: ${withPrice.length}`);
  console.log(`  With profiles: ${withProfiles.length}`);
  console.log(`  With availability: ${withAvail.length}`);
  console.log(`  With municipality: ${withMun.length}`);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
