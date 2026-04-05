#!/usr/bin/env node
/**
 * create-naestved-tilsyn.mjs — Crawls Næstved's dagtilbud sub-site for tilsyn PDFs
 *
 * Næstved has a sub-site dagtilbudnaestved.dk with per-institution pages.
 * Each institution page has tilsynsrapport PDFs.
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

const BASE = "https://www.dagtilbudnaestved.dk";

// All institution slugs from the 4 district pages
const INSTITUTIONS = [
  // Syd
  "naestved-syd/naestved-syd-by/boernehuset-ved-groeften",
  "naestved-syd/naestved-syd-by/boernehuset-ved-volden",
  "naestved-syd/naestved-syd-by/boernehuset-ved-diget",
  "naestved-syd/naestved-syd-by/eventyrgaarden",
  "naestved-syd/naestved-syd-by/humlebien",
  "naestved-syd/naestved-syd-by/manoehytten",
  "naestved-syd/naestved-syd-by/svalen",
  "naestved-syd/naestved-syd-by/birkehegnet",
  "naestved-syd/naestved-syd-by/egernbo",
  "naestved-syd/naestved-syd-by/boernehuset-noeddehegnet",
  "naestved-syd/naestved-syd-by/baekken",
  "naestved-syd/mogenstrup/evigglad",
  "naestved-syd/mogenstrup/stjernehoejen",
  // Nord
  "naestved-nord/naestved-nord-by-og-fensmark/boernehuset-oenskeoeen",
  "naestved-nord/naestved-nord-by-og-fensmark/skovtrolden",
  "naestved-nord/naestved-nord-by-og-fensmark/maelkeboetten",
  "naestved-nord/naestved-nord-by-og-fensmark/busters-verden",
  "naestved-nord/naestved-nord-by-og-fensmark/boernehuset-himmelhoej",
  "naestved-nord/glumsoe/haletudsen",
  "naestved-nord/glumsoe/rumlepotten",
  "naestved-nord/herlufmagle-gelsted-og-tybjerg/boernehjoernet",
  "naestved-nord/herlufmagle-gelsted-og-tybjerg/eventyrhuset",
  "naestved-nord/herlufmagle-gelsted-og-tybjerg/skattekisten",
  // Øst
  "naestved-oest/naestved-oest-by/svanereden",
  "naestved-oest/naestved-oest-by/kornblomsten",
  "naestved-oest/naestved-oest-by/pilegaarden",
  "naestved-oest/naestved-oest-by/sommerfugl",
  "naestved-oest/naestved-oest-by/boernehuset-groennebakken",
  "naestved-oest/naestved-oest-by/lillevang",
  "naestved-oest/toksvaerd-og-holme-olstrup/alfehuset",
  "naestved-oest/toksvaerd-og-holme-olstrup/ellebaek",
  "naestved-oest/toksvaerd-og-holme-olstrup/svend-goenge-skovboernehave",
  "naestved-oest/broederup-og-tappernoeje/tappernoeje-boernehus",
  "naestved-oest/broederup-og-tappernoeje/nattergalen",
  // Vest
  "naestved-vest/naestved-vest-by/lindegaarden",
  "naestved-vest/naestved-vest-by/digterhuset",
  "naestved-vest/naestved-vest-by/mariehuset",
  "naestved-vest/naestved-vest-by/tryllefloejten",
  "naestved-vest/naestved-vest-by/moellen",
  "naestved-vest/naestved-vest-by/frit-16",
  "naestved-vest/naestved-vest-by/boernehuset-spiloppen",
  "naestved-vest/naestved-vest-by/boelgen",
  "naestved-vest/karrebaek/humlehaven",
  "naestved-vest/hyllinge/hyldebaerhuset",
  "naestved-vest/sandved/kroppeloppen",
  "naestved-vest/fuglebjerg/sognefogedgaarden",
  "naestved-vest/fuglebjerg/tjoernehuset",
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
      if (inst.m.replace(/ Kommune$/, "") === "Næstved") {
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
  console.log(`N��stved: ${nameMap.size} institutions in data\n`);

  const reports = [];
  const seenIds = new Set();
  let matched = 0;

  for (const slug of INSTITUTIONS) {
    const url = `${BASE}/${slug}`;
    const html = await fetchPage(url);
    if (!html) {
      console.log(`  ✗ ${slug.split("/").pop()} (failed)`);
      continue;
    }

    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const pageName = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : slug.split("/").pop().replace(/-/g, " ");

    const links = extractLinks(html, url);
    const tilsynPdfs = links.filter(l => {
      const combined = (l.href + " " + l.text).toLowerCase();
      return /\.pdf/i.test(l.href) && /tilsyn/i.test(combined);
    });

    const id = fuzzyMatch(pageName, nameMap);

    if (tilsynPdfs.length > 0 && id && !seenIds.has(id)) {
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
      console.log(`  ✓ ${pageName} -> ${id}`);
    } else if (tilsynPdfs.length > 0) {
      console.log(`  ○ ${pageName} (${tilsynPdfs.length} PDFs, ${id ? "duplicate" : "UNMATCHED"})`);
    } else {
      console.log(`  - ${pageName} (no tilsyn PDFs)`);
    }
  }

  const result = {
    municipality: "Næstved",
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: 0,
    reports,
  };

  const outPath = join(OUTPUT_DIR, "naestved-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved: ${outPath}`);
  console.log(`  ${matched} institutions with tilsyn data`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
