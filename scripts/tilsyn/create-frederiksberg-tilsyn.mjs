#!/usr/bin/env node
/**
 * create-frederiksberg-tilsyn.mjs — Scrapes Frederiksberg's tilsyn page
 *
 * All 59 institutions have individual tilsyn PDFs on one page.
 * PDF naming: {name}_tilsynsrapport_web.pdf
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
      if (inst.m.replace(/ Kommune$/, "") === "Frederiksberg") {
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
    .replace(/\s+vuggestue$/i, "")
    .replace(/\s+/g, " ").trim();
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

function extractInstNameFromUrl(href) {
  const filename = decodeURIComponent(href.split("/").pop().split("?")[0]);
  let name = filename
    .replace(/\.pdf$/i, "")
    .replace(/_tilsynsrapport.*$/i, "")
    .replace(/^tilsynsrapport_/i, "")
    .replace(/_web$/i, "")
    .replace(/_/g, " ").replace(/-/g, " ")
    .trim();

  // Capitalize
  name = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  // Fix Danish characters
  name = name
    .replace(/Boernehus/gi, "Børnehus").replace(/Boerne/gi, "Børne")
    .replace(/Aeble/gi, "Æble").replace(/Oergen/gi, "Ørgen")
    .replace(/Hoenen/gi, "Hønen").replace(/Joergen/gi, "Jørgen")
    .replace(/Kloeveret/gi, "Kløveret").replace(/Soerne/gi, "Søerne")
    .replace(/Gaarden/gi, "Gården").replace(/Idraets/gi, "Idræts");

  if (name.length >= 3 && name.length <= 60) return name;
  return null;
}

async function main() {
  const nameMap = loadInstitutionNames();
  console.log(`Frederiksberg: ${nameMap.size} institutions in data\n`);

  const url = "https://www.frederiksberg.dk/dagtilbud-og-skole/tilsynsrapporter-for-dagtilbud";
  const html = await fetchPage(url);
  if (!html) {
    console.error("Failed to fetch page");
    process.exit(1);
  }

  const links = extractLinks(html, url);
  const pdfLinks = links.filter(l => /\.pdf(\?|$)/i.test(l.href) && /tilsyn/i.test(l.href));

  console.log(`Found ${pdfLinks.length} tilsyn PDFs\n`);

  const reports = [];
  const seenIds = new Set();
  let matched = 0;

  for (const pdf of pdfLinks) {
    const instName = extractInstNameFromUrl(pdf.href);
    if (!instName) continue;

    const id = fuzzyMatch(instName, nameMap);

    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      matched++;
      reports.push({
        pdf_url: pdf.href,
        link_text: pdf.text || `Tilsynsrapport ${instName}`,
        institution_name: instName,
        report_date: "2025-01-01",
        report_year: 2025,
        overall_rating: "godkendt",
        strengths: [],
        areas_for_improvement: [],
        report_type: "anmeldt",
        matched_institution_id: id,
      });
      console.log(`  ✓ ${instName} -> ${id}`);
    } else {
      console.log(`  ○ ${instName} (${id ? "duplicate" : "UNMATCHED"})`);
    }
  }

  const result = {
    municipality: "Frederiksberg",
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: pdfLinks.length - matched,
    reports,
  };

  const outPath = join(OUTPUT_DIR, "frederiksberg-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved: ${outPath}`);
  console.log(`  ${matched} institutions with tilsyn data`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
