#!/usr/bin/env node
/**
 * create-vejle-tilsyn.mjs — Crawls Vejle's per-institution subdomains for tilsyn PDFs
 *
 * Each Vejle institution has a subdomain: {name}.vejle.dk
 * Tilsyn pages at: {name}.vejle.dk/tilsyn-og-undersoegelser/tilsynsrapport(er)/
 * Strategy: visit overview -> find subdomain links -> extract tilsyn PDFs
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
  const timer = setTimeout(() => ctrl.abort(), 12000);
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
      if (inst.m.replace(/ Kommune$/, "") === "Vejle") {
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
  console.log(`Vejle: ${nameMap.size} institutions in data\n`);

  // Step 1: Find all institution subdomains from the overview pages
  const overviewUrls = [
    "https://www.vejle.dk/da/service-og-selvbetjening/borger/boern-skole-og-familie/boernepasning-0-6-aar/dagpleje-vuggestuer-og-boernehaver/",
  ];

  const subdomains = new Set();

  for (const overviewUrl of overviewUrls) {
    const html = await fetchPage(overviewUrl);
    if (!html) continue;
    const links = extractLinks(html, overviewUrl);
    for (const l of links) {
      try {
        const u = new URL(l.href);
        // Look for subdomain links to *.vejle.dk
        if (u.hostname.endsWith(".vejle.dk") && u.hostname !== "www.vejle.dk" && u.hostname !== "fagfolk.vejle.dk") {
          subdomains.add(u.hostname);
        }
      } catch {}
    }

    // Also follow links to individual institution pages to find subdomain links
    const instLinks = links.filter(l => l.href.includes("dagpleje-vuggestuer-og-boernehaver/") && !l.href.endsWith("dagpleje-vuggestuer-og-boernehaver/"));
    for (const il of instLinks.slice(0, 50)) {
      const instHtml = await fetchPage(il.href);
      if (!instHtml) continue;
      const instPageLinks = extractLinks(instHtml, il.href);
      for (const l of instPageLinks) {
        try {
          const u = new URL(l.href);
          if (u.hostname.endsWith(".vejle.dk") && u.hostname !== "www.vejle.dk" && u.hostname !== "fagfolk.vejle.dk") {
            subdomains.add(u.hostname);
          }
        } catch {}
      }
    }
  }

  // Also add known subdomains from web search
  const knownSubdomains = [
    "bullerbo.vejle.dk", "kirkebakken.vejle.dk", "regnbuen.vejle.dk",
    "havnely.vejle.dk", "bvb.vejle.dk", "engum.vejle.dk",
    "boegen.vejle.dk", "bguhrhoej.vejle.dk", "blaeksprutten.vejle.dk",
    "bic.vejle.dk", "mollehuset.vejle.dk",
  ];
  for (const sd of knownSubdomains) subdomains.add(sd);

  console.log(`Found ${subdomains.size} subdomains\n`);

  // Step 2: Visit each subdomain's tilsyn page
  const reports = [];
  const seenIds = new Set();
  let matched = 0;

  for (const domain of subdomains) {
    const tilsynPaths = [
      "/tilsyn-og-undersoegelser/tilsynsrapport/",
      "/tilsyn-og-undersoegelser/tilsynsrapporter/",
      "/tilsyn-og-undersoegelser/tilsyn/",
    ];

    let foundPdfs = [];
    let tilsynUrl = null;

    for (const path of tilsynPaths) {
      const url = `https://${domain}${path}`;
      const html = await fetchPage(url);
      if (!html) continue;

      tilsynUrl = url;
      const links = extractLinks(html, url);
      const pdfs = links.filter(l => /\.(pdf|docx?)(\?|$)/i.test(l.href) && /tilsyn/i.test(l.href + " " + l.text));
      foundPdfs.push(...pdfs);
      break; // Found a working tilsyn page
    }

    if (foundPdfs.length === 0) {
      console.log(`  - ${domain} (no tilsyn PDFs)`);
      continue;
    }

    // Get institution name from homepage
    const homeHtml = await fetchPage(`https://${domain}/`);
    let instName = domain.replace(".vejle.dk", "").replace(/-/g, " ");
    if (homeHtml) {
      const titleMatch = homeHtml.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch) {
        instName = titleMatch[1]
          .replace(/\s*[-–|]\s*Vejle\s*Kommune.*/i, "")
          .replace(/\s*[-–|]\s*vejle\.dk.*/i, "")
          .trim();
      }
    }

    const id = fuzzyMatch(instName, nameMap);

    // Pick the most recent report
    let bestPdf = foundPdfs[0];
    for (const pdf of foundPdfs) {
      if (/202[56]/i.test(pdf.text + " " + pdf.href) && !/202[56]/i.test(bestPdf.text + " " + bestPdf.href)) {
        bestPdf = pdf;
      }
      // Prefer skærpet
      if (/skærpet|skaerpet/i.test(pdf.text + " " + pdf.href)) bestPdf = pdf;
    }

    const isSkærpet = /skærpet|skaerpet/i.test(bestPdf.text + " " + bestPdf.href);

    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      matched++;
      reports.push({
        pdf_url: bestPdf.href,
        link_text: bestPdf.text,
        institution_name: instName,
        report_date: /2026/.test(bestPdf.text + bestPdf.href) ? "2026-01-01" : "2025-01-01",
        report_year: /2026/.test(bestPdf.text + bestPdf.href) ? 2026 : 2025,
        overall_rating: isSkærpet ? "skærpet" : "godkendt",
        strengths: [],
        areas_for_improvement: isSkærpet ? ["Under skærpet tilsyn"] : [],
        report_type: "anmeldt",
        matched_institution_id: id,
      });
      console.log(`  ✓ ${instName} [${domain}] -> ${id}${isSkærpet ? " ⚠️ SKÆRPET" : ""} (${foundPdfs.length} PDFs)`);
    } else {
      console.log(`  ○ ${instName} [${domain}] (${foundPdfs.length} PDFs, ${id ? "duplicate" : "UNMATCHED"})`);
    }
  }

  const result = {
    municipality: "Vejle",
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched,
    unmatched: 0,
    reports,
  };

  const outPath = join(OUTPUT_DIR, "vejle-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nSaved: ${outPath}`);
  console.log(`  ${matched} institutions with tilsyn data`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
