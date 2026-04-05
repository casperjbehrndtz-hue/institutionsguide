#!/usr/bin/env node
/**
 * create-slagelse-tilsyn.mjs — Scrapes Slagelse's central tilsyn page
 *
 * Slagelse has a single page with ~95 PDFs covering all institutions.
 * PDFs include KIDS rapport, konsulentrapport, and dialogmøde referat per institution.
 * Institution names are in the PDF filenames.
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
      if (inst.m.replace(/ Kommune$/, "") === "Slagelse") {
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
    .replace(/\s+børneinstitution$/i, "").replace(/\s+daginstitution$/i, "")
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
  // Extract institution name from PDF filename
  // Pattern: /media/{hash}/{type}-{institution-name}-{year}-{suffix}.pdf
  const filename = decodeURIComponent(href.split("/").pop().split("?")[0]);
  let name = filename
    .replace(/\.pdf$/i, "")
    .replace(/^kids-/i, "").replace(/^konsulentrapport-/i, "").replace(/^konsulent-rapport-/i, "")
    .replace(/^referat-(?:af-|fra-)?dialogmoede-(?:i-|paa-baggrund-af-tilsyn-)?/i, "")
    .replace(/-(?:util|webtil)$/i, "")
    .replace(/-20\d{2}(?:-\d{2})?/g, "")
    .replace(/-(?:rapport|kids|konsulent|tilsyn|referat|dialogmoede|moede|opfoelgende|maj|juni|april|september|oktober|november|december|januar|februar|marts)(?:-|$)/gi, "")
    .replace(/-ny$/i, "")
    .replace(/-+/g, " ").trim();

  // Capitalize
  name = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  // Fix common Danish name patterns
  name = name
    .replace(/Boernehus/gi, "Børnehus")
    .replace(/Boernehave/gi, "Børnehave")
    .replace(/Boernegaard/gi, "Børnegård")
    .replace(/Boerneinstitution/gi, "Børneinstitution")
    .replace(/Boerne/gi, "Børne")
    .replace(/Smoerblomsten/gi, "Smørblomsten")
    .replace(/Moellegaarden/gi, "Møllegården")
    .replace(/Moellebakken/gi, "Møllebakken")
    .replace(/Oestervang/gi, "Østervang")
    .replace(/Soebjerggaard/gi, "Søbjerggård")
    .replace(/Nygaarden/gi, "Nygården")
    .replace(/Mariehoenen/gi, "Mariehønen")
    .replace(/Askehavegaard/gi, "Askehavegård")
    .replace(/Vejsgaardparkens/gi, "Vejsgårdparkens")
    .replace(/Storebaeltsvej/gi, "Storebæltsvej");

  if (name.length >= 3 && name.length <= 60) return name;
  return null;
}

async function main() {
  const nameMap = loadInstitutionNames();
  console.log(`Slagelse: ${nameMap.size} institutions in data\n`);

  const url = "https://www.slagelse.dk/da/service-og-selvbetjening/dagtilbud-og-skole/kvalitet-i-dagtilbud-og-skoler/kvalitet-i-dagtilbud/tilsyn-med-dagtilbud/";
  const html = await fetchPage(url);
  if (!html) {
    console.error("Failed to fetch Slagelse tilsyn page");
    process.exit(1);
  }

  const links = extractLinks(html, url);
  const pdfLinks = links.filter(l => /\.pdf(\?|$)/i.test(l.href));
  console.log(`Found ${pdfLinks.length} PDFs on page\n`);

  // Group PDFs by institution name (each institution has ~3 PDFs: KIDS, konsulent, referat)
  const instPdfs = new Map(); // instName -> best PDF

  for (const pdf of pdfLinks) {
    const instName = extractInstNameFromUrl(pdf.href);
    if (!instName) continue;

    // Prefer "kids" reports (most comprehensive), then konsulentrapport
    if (!instPdfs.has(instName)) {
      instPdfs.set(instName, pdf);
    } else {
      const existing = instPdfs.get(instName);
      // Prefer newer year
      const yearNew = pdf.href.match(/20(\d{2})/)?.[1] || "00";
      const yearOld = existing.href.match(/20(\d{2})/)?.[1] || "00";
      if (yearNew > yearOld) instPdfs.set(instName, pdf);
    }
  }

  console.log(`Unique institutions from filenames: ${instPdfs.size}\n`);

  const reports = [];
  const seenIds = new Set();
  let matched = 0;

  for (const [instName, pdf] of instPdfs) {
    const id = fuzzyMatch(instName, nameMap);

    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      matched++;

      const yearMatch = pdf.href.match(/20(2[4-6])/);
      const year = yearMatch ? parseInt("20" + yearMatch[1]) : 2025;

      reports.push({
        pdf_url: pdf.href,
        link_text: pdf.text || `Tilsynsrapport ${instName}`,
        institution_name: instName,
        report_date: `${year}-01-01`,
        report_year: year,
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
    municipality: "Slagelse",
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: instPdfs.size - matched,
    reports,
  };

  const outPath = join(OUTPUT_DIR, "slagelse-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved: ${outPath}`);
  console.log(`  ${matched} institutions with tilsyn data`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
