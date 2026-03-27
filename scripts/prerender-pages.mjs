#!/usr/bin/env node
/**
 * Post-build: pre-renders core pages with correct SEO meta tags.
 *
 * For each page:
 *  1. Reads dist/index.html as template
 *  2. Injects page-specific <title>, <meta description>, <link canonical>
 *  3. Writes dist/[path]/index.html
 *
 * Result: Googlebot gets correct meta immediately — no JS rendering needed.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "../dist");
const SITE_URL = "https://institutionsguide.dk";

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Static pages
const PAGES = [
  {
    path: "/vuggestue",
    title: "Vuggestuer i Danmark — Sammenlign priser og kvalitet | Institutionsguide",
    description: "Find og sammenlign vuggestuer (0-2 år) i alle 98 kommuner. Se priser, ejerskab og beregn fripladstilskud.",
  },
  {
    path: "/boernehave",
    title: "Børnehaver i Danmark — Sammenlign børnehaver | Institutionsguide",
    description: "Sammenlign børnehaver (3-5 år) i hele landet. Se kommunale, selvejende og private børnehaver med priser.",
  },
  {
    path: "/dagpleje",
    title: "Dagplejere i Danmark — Find dagpleje | Institutionsguide",
    description: "Find dagpleje (0-2 år) i din kommune. Ofte et billigere alternativ til vuggestue med højere voksen-barn ratio.",
  },
  {
    path: "/skole",
    title: "Skoler i Danmark — Folkeskoler og friskoler med kvalitetsdata | Institutionsguide",
    description: "Sammenlign folkeskoler og friskoler med kvalitetsdata: trivsel, karaktersnit, fravær og kompetencedækning.",
  },
  {
    path: "/sfo",
    title: "SFO og fritidsordninger i Danmark | Institutionsguide",
    description: "Find SFO-tilbud (6-9 år) i din kommune. Se priser og sammenlign med andre fritidsordninger.",
  },
  {
    path: "/sammenlign",
    title: "Sammenlign institutioner side om side | Institutionsguide",
    description: "Sammenlign op til 4 vuggestuer, børnehaver, dagplejere eller skoler side om side. Se priser, kvalitet og beliggenhed.",
  },
  {
    path: "/privatliv",
    title: "Privatlivspolitik | Institutionsguide",
    description: "Læs om hvordan Institutionsguide behandler dine persondata i overensstemmelse med GDPR.",
  },
  {
    path: "/vilkaar",
    title: "Vilkår og betingelser | Institutionsguide",
    description: "Vilkår for brug af Institutionsguide. Alle data er vejledende og udgør ikke rådgivning.",
  },
];

// Generate municipality pages from school data
function getMunicipalityPages() {
  try {
    const dataPath = path.join(__dirname, "../public/data/skole-data.json");
    const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const municipalities = new Set();
    for (const s of data.s) {
      if (s.m) municipalities.add(s.m.replace(" Kommune", ""));
    }
    return [...municipalities].sort().map((name) => ({
      path: `/kommune/${encodeURIComponent(name)}`,
      title: `${name} Kommune — Institutioner, priser og kvalitet | Institutionsguide`,
      description: `Oversigt over vuggestuer, børnehaver, dagplejere og skoler i ${name} Kommune. Se kommunale takster, kvalitetsdata og beregn fripladstilskud.`,
    }));
  } catch {
    console.warn("[prerender] Could not read school data for municipality pages");
    return [];
  }
}

function buildPage(shellHtml, page) {
  const canonical = `${SITE_URL}${page.path}`;

  let html = shellHtml
    .replace(/<title>.*?<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${esc(page.description)}" />`
    );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${esc(canonical)}" />`
  );

  // Replace OG title/description
  html = html.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${esc(page.title)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${esc(page.description)}" />`
  );

  return html;
}

function main() {
  const shellPath = path.join(DIST, "index.html");
  if (!fs.existsSync(shellPath)) {
    console.error("[prerender] dist/index.html not found — run vite build first");
    process.exit(1);
  }

  const shellHtml = fs.readFileSync(shellPath, "utf-8");
  const allPages = [...PAGES, ...getMunicipalityPages()];

  let count = 0;
  for (const page of allPages) {
    try {
      const html = buildPage(shellHtml, page);
      const dir = path.join(DIST, decodeURIComponent(page.path.slice(1)));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
      count++;
    } catch (err) {
      console.warn(`[prerender] Failed for ${page.path}:`, err.message);
    }
  }

  console.log(`[prerender] Done — ${count}/${allPages.length} pages pre-rendered`);
}

main();
