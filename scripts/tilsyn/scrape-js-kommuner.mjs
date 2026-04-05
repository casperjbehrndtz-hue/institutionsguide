#!/usr/bin/env node
/**
 * scrape-js-kommuner.mjs — Uses Playwright to scrape JS-rendered tilsyn pages
 *
 * Many municipalities use JS-rendered websites (React, Umbraco, etc.) that
 * return empty HTML to simple fetch. This scraper uses a headless browser.
 *
 * Targets: municipalities where our normal scraper got 0 results but where
 * we know tilsyn data exists.
 */

import { chromium } from "playwright";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

// Municipalities with JS-rendered tilsyn pages
const JS_KOMMUNER = [
  {
    name: "Skanderborg",
    pages: [
      "https://www.skanderborg.dk/borger/familie-boern-og-unge/boernepasning-0-6-aar/naar-vi-passer-dit-barn",
    ],
  },
  {
    name: "Helsingør",
    pages: [
      "https://www.helsingor.dk/borger/dagtilbud-0-6-aar",
      "https://www.helsingor.dk/nyheder-og-fakta/retningsgivende-dokumenter/",
    ],
  },
  {
    name: "Egedal",
    pages: [
      "https://www.egedalkommune.dk/borger/dagtilbud-og-skole/dagtilbud/rammer-regler-og-lovgivning/tilsyn-i-dagtilbud/",
    ],
  },
  {
    name: "Hillerød",
    pages: [
      "https://www.hillerod.dk/service-og-selvbetjening/daginstitution-skole-og-uddannelse/bornepasning-0-6-ar/tilsyn-rammer-og-retningslinjer-for-vores-dagtilbud/",
    ],
  },
  {
    name: "Furesø",
    pages: [
      "https://www.furesoe.dk/om-kommunen/fakta/standarder-og-tilsyn/tilsyn-i-dagtilbud/",
    ],
  },
  {
    name: "Hvidovre",
    pages: [
      "https://www.hvidovre.dk/borger/familie-og-boern/dagtilbud-til-boern/mens-vi-passer-dit-barn/tilsyn-i-dagtilbud",
    ],
  },
  {
    name: "Syddjurs",
    pages: [
      "https://www.syddjurs.dk/borger/boern-og-familie/dagtilbud-og-pasning/praktiske-informationer/tilsyn-og-foraeldretilfredshed",
    ],
  },
  {
    name: "Brønderslev",
    pages: [
      "https://www.bronderslev.dk/borger/familie-boern-og-unge/boernepasning-0-6-aar/kvalitet-i-dagtilbud-2",
    ],
  },
  {
    name: "Fredensborg",
    pages: [
      "https://www.fredensborg.dk/borger/boern-og-unge/paedagogisk-tilsyn",
      "https://fredensborg.dk/borger/dagtilbud-0-5-aar/paedagogisk-tilsyn",
    ],
  },
  {
    name: "Hjørring",
    pages: [
      "https://www.hjoerring.dk/borger/boern-unge-og-familie/dagtilbud/tilsyn-med-dagtilbud",
    ],
  },
  {
    name: "Favrskov",
    pages: [
      "https://favrskov.dk/borger/familie-boern-og-oekonomi/kvalitet-i-dagtilbud",
    ],
  },
  {
    name: "Hedensted",
    pages: [
      "https://www.hedensted.dk/service-og-selvbetjening/skole-og-boernepasning/boernepasning/tilsyn",
    ],
  },
  {
    name: "Haderslev",
    pages: [
      "https://www.haderslev.dk/service/boern-unge-og-familie/boernepasning/tilsyn-og-vedtaegter/",
    ],
  },
  {
    name: "Svendborg",
    pages: [
      "https://www.svendborg.dk/borger/barn/mit-barn-skal-i-dagtilbud/kommunale-og-selvejende-dagtilbud/paedagogisk-tilsyn-med",
    ],
  },
  {
    name: "Kalundborg",
    pages: [
      "https://kalundborg.dk/borger/boern-unge-og-familie/dagpleje-og-daginstitutioner/tilsynsrapporter-daginstitutioner",
    ],
  },
];

function loadInstitutionNames(kommuneName) {
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
    try {
      const data = JSON.parse(readFileSync(p, "utf8")).i;
      for (const inst of data) {
        const mun = inst.m.replace(/ Kommune$/, "").replace(/s Regionskommune$/, "");
        if (mun === kommuneName) {
          names.set(inst.n.toLowerCase(), `${prefix}-${inst.id}`);
        }
      }
    } catch {}
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

async function scrapeKommune(browser, kommune) {
  const { name, pages } = kommune;
  console.log(`\n--- ${name} ---`);

  const nameMap = loadInstitutionNames(name);
  console.log(`  ${nameMap.size} institutions in data`);

  const allPdfLinks = new Map();

  for (const pageUrl of pages) {
    try {
      const page = await browser.newPage();
      await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // Extract all links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a[href]")).map(a => ({
          href: a.href,
          text: a.textContent.trim(),
        }));
      });

      // Find PDF links related to tilsyn
      for (const link of links) {
        const lh = link.href.toLowerCase();
        const isPdf = lh.includes(".pdf") || lh.includes("infoba.dk");
        if (!isPdf) continue;
        if (!/tilsyn|rapport/i.test(link.href + " " + link.text)) continue;
        if (!allPdfLinks.has(link.href)) {
          allPdfLinks.set(link.href, link);
        }
      }

      // Also follow sub-page links that might have more PDFs
      const subLinks = links.filter(l => {
        try {
          const u = new URL(l.href);
          const base = new URL(pageUrl);
          return u.hostname === base.hostname && !l.href.toLowerCase().includes(".pdf")
            && /tilsyn|rapport|dagtilbud|børneh|vugges/i.test(l.href + " " + l.text);
        } catch { return false; }
      }).slice(0, 20);

      for (const sub of subLinks) {
        try {
          await page.goto(sub.href, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(1000);
          const subPageLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("a[href]")).map(a => ({
              href: a.href,
              text: a.textContent.trim(),
            }));
          });
          for (const link of subPageLinks) {
            const lh = link.href.toLowerCase();
            if (!(lh.includes(".pdf") || lh.includes("infoba.dk"))) continue;
            if (!/tilsyn|rapport/i.test(link.href + " " + link.text)) continue;
            if (!allPdfLinks.has(link.href)) {
              allPdfLinks.set(link.href, link);
            }
          }
        } catch {}
      }

      await page.close();
      console.log(`  ${new URL(pageUrl).hostname} -> ${allPdfLinks.size} PDFs`);
    } catch (e) {
      console.log(`  Error: ${e.message.slice(0, 60)}`);
    }
  }

  if (allPdfLinks.size === 0) {
    console.log("  No PDFs found");
    return null;
  }

  const reports = [];
  const seenIds = new Map();

  for (const [href, link] of allPdfLinks) {
    const filename = decodeURIComponent(href.split("/").pop().split("?")[0]);
    const instName = extractInstName(link.text, filename);
    const matchedId = fuzzyMatch(instName, nameMap);

    if (matchedId && seenIds.has(matchedId)) continue;

    const report = {
      pdf_url: href,
      link_text: link.text,
      institution_name: instName || filename,
      report_date: null,
      report_year: 2025,
      overall_rating: /skærpet/i.test(link.text) ? "skærpet" : "godkendt",
      strengths: [],
      areas_for_improvement: [],
      report_type: /uanmeldt/i.test(link.text) ? "uanmeldt" : "anmeldt",
      matched_institution_id: matchedId,
    };

    if (matchedId) seenIds.set(matchedId, report);
    reports.push(report);
  }

  const matched = seenIds.size;
  console.log(`  Reports: ${allPdfLinks.size} PDFs, ${matched} matched`);

  const slug = name.toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/-/g, "-").replace(/\s/g, "-");
  const outPath = join(OUTPUT_DIR, `${slug}-tilsyn.json`);

  const result = {
    municipality: name,
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: reports.length - matched,
    reports: [...seenIds.values()],
  };

  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`  Saved: ${slug}-tilsyn.json (${result.reports.length} reports)`);
  return result;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   JS Tilsyn Scraper — Playwright-based                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    locale: "da-DK",
  });

  let totalMatched = 0, totalKommuner = 0;

  for (const kommune of JS_KOMMUNER) {
    try {
      const result = await scrapeKommune(context, kommune);
      if (result && result.matched > 0) {
        totalMatched += result.matched;
        totalKommuner++;
      }
    } catch (e) {
      console.error(`  FATAL ${kommune.name}: ${e.message}`);
    }
  }

  await browser.close();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  SUMMARY: ${totalKommuner} kommuner, ${totalMatched} matched`);
  console.log("=".repeat(60));
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
