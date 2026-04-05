#!/usr/bin/env node
/**
 * create-horsens-tilsyn.mjs — Crawls Horsens' dagtilbud site for tilsyn PDFs
 *
 * Horsens has a sub-site dagtilbud.horsens.dk with 16+ district areas.
 * Each district has a "pædagogisk tilsyn" page linking to individual PDFs.
 * Strategy: crawl main page -> district pages -> tilsyn pages -> extract PDFs
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

const RATE_MS = 800;
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
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "da,en;q=0.5",
      },
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
      if (inst.m.replace(/ Kommune$/, "") === "Horsens") {
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

function extractInstName(text, filename) {
  let name = text
    .replace(/\(PDF\)/gi, "").replace(/tilsynsrapport/gi, "")
    .replace(/opfølgning/gi, "").replace(/skærpet/gi, "")
    .replace(/(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)\s*\d{4}/gi, "")
    .replace(/\b\d{4}\b/g, "").replace(/\s+/g, " ").trim();
  if (name.length >= 3 && name.length <= 60) return name;
  if (filename) {
    name = filename.replace(/\.(pdf|docx?)$/i, "")
      .replace(/tilsynsrapport-?/gi, "").replace(/\b\d{4}\b/g, "")
      .replace(/-+/g, " ").replace(/\s+/g, " ").trim();
    name = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    if (name.length >= 3 && name.length <= 60) return name;
  }
  return null;
}

async function main() {
  const nameMap = loadInstitutionNames();
  console.log(`Horsens: ${nameMap.size} institutions in data\n`);

  // District areas from the main page — URL pattern: /dagtilbud{dist}/paedagogik-tilsynogpolitikker
  const DISTRICTS = [
    "bankager", "braedstrup", "dagnaes", "egebjerg", "gedved", "hatting",
    "hovedgaard", "hoejvang", "langmark", "lund", "midtby", "nim",
    "stensballe", "soendermark", "soevind", "torsted", "vestbyen", "oestbirk"
  ];

  const BASE = "https://dagtilbud.horsens.dk";
  const allPdfs = new Map();

  for (const dist of DISTRICTS) {
    // Primary URL pattern
    const tilsynUrl = `${BASE}/dagtilbud${dist}/paedagogik-tilsynogpolitikker`;
    let html = await fetchPage(tilsynUrl);

    // Fallback patterns
    if (!html) {
      html = await fetchPage(`${BASE}/dagtilbud${dist}/kvalitet-og-politikker`);
    }
    if (!html) {
      html = await fetchPage(`${BASE}/dagtilbud${dist}/tilsyn`);
    }

    if (!html) {
      console.log(`  ✗ ${dist} (no tilsyn page)`);
      continue;
    }

    const links = extractLinks(html, tilsynUrl);
    const pdfs = links.filter(l => {
      const combined = (l.href + " " + l.text).toLowerCase();
      return (/\.(pdf|docx?)(\?|$)/i.test(l.href)) && /tilsyn/i.test(combined);
    });
    for (const pdf of pdfs) {
      if (!allPdfs.has(pdf.href)) allPdfs.set(pdf.href, pdf);
    }
    console.log(`  ${pdfs.length > 0 ? "✓" : "○"} ${dist}: ${pdfs.length} PDFs`);
  }

  console.log(`\nTotal unique PDFs found: ${allPdfs.size}`);

  const reports = [];
  let matched = 0;

  for (const [href, link] of allPdfs) {
    const filename = decodeURIComponent(href.split("/").pop());
    const instName = extractInstName(link.text, filename);
    const id = fuzzyMatch(instName, nameMap);
    if (id) matched++;

    reports.push({
      pdf_url: href,
      link_text: link.text,
      institution_name: instName || filename,
      report_date: null,
      report_year: 2025,
      overall_rating: /skærpet/i.test(link.text + " " + filename) ? "skærpet" : "godkendt",
      strengths: [],
      areas_for_improvement: [],
      report_type: /uanmeldt/i.test(link.text) ? "uanmeldt" : "anmeldt",
      matched_institution_id: id,
    });

    console.log(`  ${id ? "✓" : "✗"} ${instName || filename} -> ${id || "UNMATCHED"}`);
  }

  const result = {
    municipality: "Horsens",
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: reports.length - matched,
    reports: reports.filter(r => r.matched_institution_id),
  };

  const outPath = join(OUTPUT_DIR, "horsens-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved: ${outPath}`);
  console.log(`  ${matched}/${reports.length} matched`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
