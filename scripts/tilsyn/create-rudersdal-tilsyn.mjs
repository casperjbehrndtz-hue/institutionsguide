#!/usr/bin/env node
/**
 * create-rudersdal-tilsyn.mjs — Crawls Rudersdal's per-institution pages for tilsyn PDFs
 *
 * Rudersdal has individual institution pages at rudersdal.dk/{slug}
 * Each has a "Tilsyn" section with PDF links at /media/{id}/download?inline
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

const RATE_MS = 600;
let lastFetch = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url) {
  const elapsed = Date.now() - lastFetch;
  if (elapsed < RATE_MS) await sleep(RATE_MS - elapsed);
  lastFetch = Date.now();
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

const BASE = "https://rudersdal.dk";

// All institution pages from rudersdal.dk/find-en-institution
const INSTITUTION_SLUGS = [
  "boernehuset-bakkevej", "boernehuset-birkemosen", "boernehuset-kastaniebakken",
  "boernehuset-keilstruplund", "boernehuset-moellevangen", "boernehuset-sjaelsoe",
  "boernehuset-stenhoejgaardsvej", "boernehuset-svanen", "boernehuset-boegehoejen",
  "boernehuset-flintehoej", "boernehuset-maglemosen", "boernehuset-mariehoej",
  "boernehuset-troldehoej", "den-groenne-aert", "troeroed-boernehus",
  "boernehuset-abildgaarden", "boernehuset-bistrup-have", "boernehuset-fredsholm",
  "boernehuset-himmelbjerget", "boernehuset-lyngborghave", "boernehuset-pilegaarden",
  "boernehuset-smedebakken", "boernehaven-vangebovej", "boernehuset-elverhoej",
  "boernehuset-karethen", "boernehuset-moelleaaen", "boernehuset-skovlyhuset",
  "boernehuset-soevej", "dronninggaard-boernehus", "boernehuset-egebakken",
  "boernehuset-frederik-clausens-vaenge", "boernehuset-honningkrukken",
  "boernehuset-hoejbjerggaard", "boernehuset-tudsen", "ravneholm-skovboernehave",
  "boernehuset-ellesletten", "boernehuset-myretuen", "naerum-menighedsboernehus",
  "sct-georgs-gaardens-vuggestue", "boernehuset-skovstjernen",
  "specialboernehuset-rudegaards-alle",
];

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
      if (inst.m.replace(/ Kommune$/, "") === "Rudersdal") {
        names.set(inst.n.toLowerCase(), `${prefix}-${inst.id}`);
      }
    }
  }
  return names;
}

function fuzzyMatch(name, nameMap) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  if (nameMap.has(lower)) return nameMap.get(lower);
  for (const [key, id] of nameMap) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }
  const words = lower.split(/[\s\-\/,]+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  for (const [key, id] of nameMap) {
    const kw = key.split(/[\s\-\/,]+/).filter(w => w.length > 2);
    const overlap = words.filter(w => kw.some(k => k.includes(w) || w.includes(k))).length;
    if (overlap > bestScore && overlap >= 1) { bestScore = overlap; best = id; }
  }
  return best;
}

async function main() {
  const nameMap = loadInstitutionNames();
  console.log(`Rudersdal: ${nameMap.size} institutions in data\n`);

  const reports = [];
  const seenIds = new Set();
  let matched = 0;

  for (const slug of INSTITUTION_SLUGS) {
    const url = `${BASE}/${slug}`;
    const html = await fetchPage(url);
    if (!html) {
      console.log(`  ✗ ${slug} (failed)`);
      continue;
    }

    // Extract institution name from page title
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const pageName = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : slug.replace(/-/g, " ");

    // Find tilsyn PDF links
    const links = extractLinks(html, url);
    const tilsynPdfs = links.filter(l => {
      const combined = (l.href + " " + l.text).toLowerCase();
      return /\/media\/\d+\/download/i.test(l.href) && /tilsyn/i.test(combined);
    });

    if (tilsynPdfs.length === 0) {
      // Also try any PDF-like links with tilsyn in text
      const altPdfs = links.filter(l => /tilsyn/i.test(l.text) && /\.(pdf|download)/i.test(l.href));
      tilsynPdfs.push(...altPdfs);
    }

    const id = fuzzyMatch(pageName, nameMap);

    if (tilsynPdfs.length > 0 && id && !seenIds.has(id)) {
      // Pick the most recent tilsyn report (first one with "2025" or "2026", else first)
      let bestPdf = tilsynPdfs[0];
      for (const pdf of tilsynPdfs) {
        if (/202[56]/i.test(pdf.text) && !/202[56]/i.test(bestPdf.text)) bestPdf = pdf;
      }

      seenIds.add(id);
      matched++;
      reports.push({
        pdf_url: bestPdf.href,
        link_text: bestPdf.text,
        institution_name: pageName,
        report_date: /2026/.test(bestPdf.text) ? "2026-01-01" : /2025/.test(bestPdf.text) ? "2025-01-01" : "2024-01-01",
        report_year: /2026/.test(bestPdf.text) ? 2026 : /2025/.test(bestPdf.text) ? 2025 : 2024,
        overall_rating: /skærpet/i.test(bestPdf.text) ? "skærpet" : "godkendt",
        strengths: [],
        areas_for_improvement: [],
        report_type: /uanmeldt/i.test(bestPdf.text) ? "uanmeldt" : "anmeldt",
        matched_institution_id: id,
      });
      console.log(`  ✓ ${pageName} -> ${id} (${tilsynPdfs.length} PDFs)`);
    } else if (tilsynPdfs.length > 0) {
      console.log(`  ○ ${pageName} (${tilsynPdfs.length} PDFs, ${id ? "duplicate" : "UNMATCHED"})`);
    } else {
      console.log(`  - ${pageName} (no tilsyn PDFs)`);
    }
  }

  const result = {
    municipality: "Rudersdal",
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: 0,
    reports,
  };

  const outPath = join(OUTPUT_DIR, "rudersdal-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved: ${outPath}`);
  console.log(`  ${matched} institutions with tilsyn data`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
