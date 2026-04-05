#!/usr/bin/env node
/**
 * create-ltk-tilsyn.mjs — Scrapes Lyngby-Taarbæk's central tilsyn page
 *
 * 148 PDFs covering ~40 institutions with multiple years each.
 * Picks the most recent report per institution.
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

async function fetchPage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal, redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "da,en;q=0.5" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; } finally { clearTimeout(timer); }
}

function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1].replace(/&amp;/g, "&").trim();
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;
    try { if (!href.startsWith("http")) href = new URL(href, baseUrl).href; } catch { continue; }
    links.push({ href, text });
  }
  return links;
}

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
      if (inst.m.replace(/ Kommune$/, "") === "Lyngby-Taarbæk") {
        names.set(inst.n.toLowerCase(), `${prefix}-${inst.id}`);
      }
    }
  }
  return names;
}

function fuzzyMatch(name, nameMap) {
  if (!name) return null;
  const lower = name.toLowerCase().trim()
    .replace(/\s+børnehus$/i, "").replace(/\s+børnehave$/i, "")
    .replace(/\s+vuggestue$/i, "").replace(/\s+privatinstitution$/i, "")
    .replace(/\s+skovbørnehave$/i, "").replace(/\s+naturbørnehave$/i, "")
    .replace(/^børnehuset\s+/i, "").replace(/^børnehaven\s+/i, "")
    .replace(/^vuggestuen\s+/i, "")
    .replace(/\s+/g, " ").trim();
  if (nameMap.has(lower)) return nameMap.get(lower);
  for (const [key, id] of nameMap) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }
  // Also try with "børnehuset" prefix added back
  for (const prefix of ["børnehuset ", "børnehaven ", "vuggestuen "]) {
    const tryName = prefix + lower;
    if (nameMap.has(tryName)) return nameMap.get(tryName);
    for (const [key, id] of nameMap) {
      if (tryName.includes(key) || key.includes(tryName)) return id;
    }
  }
  const words = lower.split(/[\s\-\/,\.]+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  for (const [key, id] of nameMap) {
    const kw = key.split(/[\s\-\/,\.]+/).filter(w => w.length > 2);
    const overlap = words.filter(w => kw.some(k => k.includes(w) || w.includes(k))).length;
    if (overlap > bestScore && overlap >= 1) { bestScore = overlap; best = id; }
  }
  return best;
}

function extractInstName(href, text) {
  // From filename
  const filename = decodeURIComponent(href.split("/").pop().split("?")[0].split("#")[0]);
  let name = filename.replace(/\.pdf$/i, "")
    .replace(/^tilsynsrapport-/i, "").replace(/^uanmeldt-tilsyn-(?:i-|boernehuset-)?/i, "")
    .replace(/^uanmeldt-tilsynsrapport-/i, "")
    .replace(/^tilsyn-/i, "")
    .replace(/-20\d{2}(?:-\d{2})?/g, "")
    .replace(/-(?:januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december|okt|nov|dec|jan|feb|mar|apr|sep|jun)(?:-|$)/gi, "")
    .replace(/-(?:selvejende-institution|privatinstitution|privat-boernehave|afd-[a-z-]+)$/i, "")
    .replace(/-+/g, " ").trim();

  name = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  name = name
    .replace(/Boernehuset/gi, "Børnehuset").replace(/Boernehaven/gi, "Børnehaven")
    .replace(/Boerne/gi, "Børne").replace(/Vuggestuen/gi, "Vuggestuen")
    .replace(/Skovboernehave/gi, "Skovbørnehave")
    .replace(/Naturboernehave/gi, "Naturbørnehave")
    .replace(/Raevehoejen/gi, "Rævehøjen").replace(/Aakanden/gi, "Åkanden")
    .replace(/Prinsessehoej/gi, "Prinsessehøj").replace(/Carlshoej/gi, "Carlshøj")
    .replace(/Mariehoej/gi, "Mariehøj").replace(/Mariehoenen/gi, "Mariehønen")
    .replace(/Menighedsboernehave/gi, "Menighedsbørnehave")
    .replace(/Enhjoerningen/gi, "Enhjørningen")
    .replace(/Firkloeveren/gi, "Firkløveren")
    .replace(/Graeshoppen/gi, "Græshoppen")
    .replace(/Laerkereden/gi, "Lærkereden")
    .replace(/Boegely/gi, "Bøgely")
    .replace(/Kloeblomsten/gi, "Kløblomsten")
    .replace(/Taarbaek/gi, "Taarbæk")
    .replace(/Bagsvaerdvej/gi, "Bagsværdvej")
    .replace(/Maelkevejen/gi, "Mælkevejen")
    .replace(/Furesoe/gi, "Furesø")
    .replace(/Jordbaerhaven/gi, "Jordbærhaven")
    .replace(/Trinbraettet/gi, "Trinbrættet");

  if (name.length >= 3 && name.length <= 60) return name;
  return null;
}

function getYear(href, text) {
  const combined = href + " " + text;
  if (/2026/.test(combined)) return 2026;
  if (/2025/.test(combined)) return 2025;
  if (/2024/.test(combined)) return 2024;
  if (/2023/.test(combined)) return 2023;
  if (/2022/.test(combined)) return 2022;
  if (/2021/.test(combined)) return 2021;
  return 2024;
}

async function main() {
  const nameMap = loadInstitutionNames();
  console.log(`Lyngby-Taarbæk: ${nameMap.size} institutions in data\n`);

  const url = "https://dagtilbud.ltk.dk/paedagogik/tilsyn-og-tilsynsrapporter";
  const html = await fetchPage(url);
  if (!html) {
    console.error("Failed to fetch page");
    process.exit(1);
  }

  const links = extractLinks(html, url);
  const pdfLinks = links.filter(l => /\.pdf/i.test(l.href) && /tilsyn/i.test(l.href + " " + l.text));
  console.log(`Found ${pdfLinks.length} tilsyn PDFs\n`);

  // Group by institution, keep most recent
  const byInst = new Map(); // instName -> { pdf, year }

  for (const pdf of pdfLinks) {
    const instName = extractInstName(pdf.href, pdf.text);
    if (!instName) continue;

    const year = getYear(pdf.href, pdf.text);
    const isUanmeldt = /uanmeldt/i.test(pdf.text + " " + pdf.href);

    if (!byInst.has(instName) || year > byInst.get(instName).year) {
      byInst.set(instName, { pdf, year, isUanmeldt });
    }
  }

  console.log(`Unique institutions: ${byInst.size}\n`);

  const reports = [];
  const seenIds = new Set();
  let matched = 0;

  for (const [instName, { pdf, year, isUanmeldt }] of byInst) {
    const id = fuzzyMatch(instName, nameMap);

    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      matched++;
      reports.push({
        pdf_url: pdf.href,
        link_text: pdf.text || `Tilsynsrapport ${instName}`,
        institution_name: instName,
        report_date: `${year}-01-01`,
        report_year: year,
        overall_rating: "godkendt",
        strengths: [],
        areas_for_improvement: [],
        report_type: isUanmeldt ? "uanmeldt" : "anmeldt",
        matched_institution_id: id,
      });
      console.log(`  ✓ ${instName} (${year}) -> ${id}`);
    } else {
      console.log(`  ○ ${instName} (${year}) ${id ? "duplicate" : "UNMATCHED"}`);
    }
  }

  const result = {
    municipality: "Lyngby-Taarbæk",
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: byInst.size - matched,
    reports,
  };

  const outPath = join(OUTPUT_DIR, "lyngby-taarbaek-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved: ${outPath}`);
  console.log(`  ${matched} institutions with tilsyn data`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
