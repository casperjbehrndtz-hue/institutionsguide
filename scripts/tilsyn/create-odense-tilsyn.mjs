#!/usr/bin/env node
/**
 * create-odense-tilsyn.mjs — Crawls Odense's 17 district pages for tilsyn data
 *
 * Odense structure: districts ("institutioner") each contain multiple børnehuse.
 * Tilsyn reports are per-district, covering all børnehuse in that district.
 * Strategy:
 *   1. Visit each district overview to find child børnehus names
 *   2. Visit district tilsyn page to find the tilsyn PDF
 *   3. Assign the tilsyn PDF to ALL matched børnehuse in that district
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

const RATE_MS = 500;
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

function decodeHtmlEntities(text) {
  return text
    .replace(/&aelig;/g, "æ").replace(/&oslash;/g, "ø").replace(/&aring;/g, "å")
    .replace(/&Aelig;/g, "Æ").replace(/&Oslash;/g, "Ø").replace(/&Aring;/g, "Å")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, " ");
}

function extractLinks(html, baseUrl) {
  const links = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1].replace(/&amp;/g, "&").trim();
    const text = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, "").trim());
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;
    try { if (!href.startsWith("http")) href = new URL(href, baseUrl).href; } catch { continue; }
    links.push({ href, text });
  }
  return links;
}

function extractTextContent(html) {
  // Extract visible text content, decode entities
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

const DISTRICTS = [
  "abildgaard", "bolbro-hoejstrup", "centrum-syd", "hca-seden-agedrup",
  "holluf-pile-tingkaer", "hoejby-hjallese", "naesby-korup", "kragsbjerg",
  "munkebjerg", "nord", "syd-syd-vest", "rising", "sanderum-tingloekke",
  "sct-hans", "tarup-paarup", "tornbjerg-rosengaard", "vestre",
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
      if (inst.m.replace(/ Kommune$/, "") === "Odense") {
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

  // Exact match
  if (nameMap.has(lower)) return nameMap.get(lower);

  // Substring match
  for (const [key, id] of nameMap) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }

  // Word overlap — require at least 1 meaningful word match
  const words = lower.split(/[\s\-\/,]+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  for (const [key, id] of nameMap) {
    const kw = key.split(/[\s\-\/,]+/).filter(w => w.length > 2);
    const overlap = words.filter(w => kw.some(k => k === w || (k.length > 4 && (k.includes(w) || w.includes(k))))).length;
    if (overlap > bestScore && overlap >= 1) { bestScore = overlap; best = id; }
  }
  return best;
}

function extractBoernehusNames(html) {
  // Look for børnehus names in headings, list items, and card elements
  const names = [];

  // h2/h3 headings containing "Børnehus"
  const headingRe = /<h[23][^>]*>(.*?)<\/h[23]>/gi;
  let m;
  while ((m = headingRe.exec(html))) {
    const text = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, "").trim());
    if (/børnehus|børnehave|vuggestue/i.test(text) && text.length < 60) {
      names.push(text);
    }
  }

  // Also look for links with børnehus-related text
  const linkRe = /<a\s[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = linkRe.exec(html))) {
    const text = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, "").trim());
    if (/børnehus|børnehave|vuggestue/i.test(text) && text.length >= 5 && text.length < 60) {
      if (!names.includes(text)) names.push(text);
    }
  }

  // Strong/bold text with børnehus names
  const strongRe = /<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi;
  while ((m = strongRe.exec(html))) {
    const text = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, "").trim());
    if (/børnehus|børnehave|vuggestue/i.test(text) && text.length >= 5 && text.length < 60) {
      if (!names.includes(text)) names.push(text);
    }
  }

  return names;
}

async function main() {
  const nameMap = loadInstitutionNames();
  console.log(`Odense: ${nameMap.size} institutions in data\n`);

  const reports = [];
  const seenIds = new Set();
  let matched = 0;

  for (const dist of DISTRICTS) {
    // Step 1: Visit district overview to find child børnehuse
    const overviewUrl = `https://www.odense.dk/dagtilbud/boerneinstitutioner/${dist}`;
    const overviewHtml = await fetchPage(overviewUrl);

    const childNames = [];
    if (overviewHtml) {
      const extracted = extractBoernehusNames(overviewHtml);
      childNames.push(...extracted);

      // Also get names from links within the district
      const links = extractLinks(overviewHtml, overviewUrl);
      for (const l of links) {
        if (l.href.includes(`/${dist}/`) && /børnehus|børnehave/i.test(l.text) && l.text.length < 60) {
          if (!childNames.includes(l.text)) childNames.push(l.text);
        }
      }
    }

    // Step 2: Visit tilsyn page to find the best PDF
    const tilsynUrls = [
      `https://www.odense.dk/dagtilbud/boerneinstitutioner/${dist}/om-institution-${dist}/tilsyn`,
      `https://www.odense.dk/dagtilbud/boerneinstitutioner/${dist}/om-institution/tilsyn`,
    ];

    let bestPdf = null;
    for (const tilsynUrl of tilsynUrls) {
      const tilsynHtml = await fetchPage(tilsynUrl);
      if (!tilsynHtml) continue;

      const links = extractLinks(tilsynHtml, tilsynUrl);
      const pdfs = links.filter(l =>
        /\.(pdf)(\?|$)/i.test(l.href) && /tilsyn|lmo|rapport/i.test(l.href + " " + l.text)
      );

      if (pdfs.length === 0) continue;

      // Prefer uvildigt tilsyn or most recent
      bestPdf = pdfs[0];
      for (const pdf of pdfs) {
        if (/uvildigt/i.test(pdf.text) && !/uvildigt/i.test(bestPdf.text)) bestPdf = pdf;
        if (/202[56]/i.test(pdf.text + pdf.href) && !/202[56]/i.test(bestPdf.text + bestPdf.href)) bestPdf = pdf;
      }
      break;
    }

    if (!bestPdf) {
      console.log(`  ✗ ${dist}: no tilsyn PDF found`);
      continue;
    }

    // Step 3: Match child børnehuse to our data and assign the tilsyn PDF
    const districtMatched = [];

    // Also try matching the district name itself (some institutions are registered at district level)
    const distDisplayName = decodeHtmlEntities(
      dist.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
        .replace(/Hoejstrup/, "Højstrup").replace(/Hoejby/, "Højby")
        .replace(/Tingkaer/, "Tingkær").replace(/Tingloekke/, "Tingløkke")
        .replace(/Sct Hans/, "Sct. Hans")
    );

    // Try district-level names
    for (const prefix of ["institution ", "institution", ""]) {
      const tryName = prefix + distDisplayName;
      const id = fuzzyMatch(tryName, nameMap);
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        districtMatched.push(id);
      }
    }

    // Match each child børnehus
    for (const childName of childNames) {
      const id = fuzzyMatch(childName, nameMap);
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        districtMatched.push(id);
      }
    }

    if (districtMatched.length > 0) {
      for (const id of districtMatched) {
        matched++;
        const isSkærpet = /skærpet|skaerpet/i.test(bestPdf.text + " " + bestPdf.href);
        reports.push({
          pdf_url: bestPdf.href,
          link_text: bestPdf.text,
          institution_name: distDisplayName,
          report_date: /2026/.test(bestPdf.text + bestPdf.href) ? "2026-01-01" : /2025/.test(bestPdf.text + bestPdf.href) ? "2025-01-01" : "2024-01-01",
          report_year: /2026/.test(bestPdf.text + bestPdf.href) ? 2026 : /2025/.test(bestPdf.text + bestPdf.href) ? 2025 : 2024,
          overall_rating: isSkærpet ? "skærpet" : "godkendt",
          strengths: [],
          areas_for_improvement: [],
          report_type: /uanmeldt|uvildigt/i.test(bestPdf.text) ? "uanmeldt" : "anmeldt",
          matched_institution_id: id,
        });
      }
      console.log(`  ✓ ${dist}: ${districtMatched.length} matched [${childNames.length} children found] (PDF: ${bestPdf.text.slice(0, 50)})`);
    } else {
      console.log(`  ○ ${dist}: 0 matched [${childNames.length} children: ${childNames.slice(0, 3).join(", ")}]`);
    }
  }

  const result = {
    municipality: "Odense",
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: 0,
    reports,
  };

  const outPath = join(OUTPUT_DIR, "odense-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved: ${outPath}`);
  console.log(`  ${matched} institutions with tilsyn data`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
