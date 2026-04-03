#!/usr/bin/env node
/**
 * Fetches ungdomsskole data from STIL Institutionsregister and searches for
 * fritidscentre/fritidsklubber that operate under them — especially in
 * municipalities missing from Dagtilbudsregisteret type 6021.
 *
 * Sources:
 * - STIL: https://statistik.uni-c.dk/instregvisning/Liste.aspx?InstType=1014
 * - Municipal fritidstilbud pages for municipalities with 0 clubs in registry
 * - DAWA for geocoding
 *
 * Usage:
 *   node scripts/fetch-ungdomsskole-fritid.mjs [--dry-run]
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../public/data/ungdomsskole-fritid.json");
const DRY_RUN = process.argv.includes("--dry-run");

const STIL_URL = "https://statistik.uni-c.dk/instregvisning/Liste.aspx?InstType=1014";
const DAWA_BASE = "https://api.dataforsyningen.dk/adresser";

// Municipalities missing from Dagtilbudsregisteret type 6021
const MISSING_MUNICIPALITIES = [
  { name: "Frederiksberg", slugs: ["frederiksberg"] },
  { name: "Aarhus",        slugs: ["aarhus"] },
  { name: "Odense",        slugs: ["odense"] },
  { name: "Gentofte",      slugs: ["gentofte"] },
  { name: "Gladsaxe",      slugs: ["gladsaxe"] },
  { name: "Lyngby-Taarbæk", slugs: ["ltk", "lyngby-taarbæk", "lyngby-taarbaek"] },
  { name: "Rudersdal",     slugs: ["rudersdal"] },
  { name: "Helsingør",     slugs: ["helsingor", "helsingør", "helsingoer"] },
];

// Known municipal fritidstilbud pages — multiple URL patterns tried per municipality.
// NOTE: Many municipal sites are JS-rendered SPAs; scraping may yield limited results.
// This is best-effort supplemental data. The primary value is the STIL ungdomsskole list.
const MUNICIPAL_FRITID_URLS = {
  "Frederiksberg": [
    "https://www.frederiksberg.dk/borger/boern-unge/fritidstilbud",
    "https://www.frederiksberg.dk/boern-og-unge/fritidsklub",
    "https://www.frederiksberg.dk/borger/boern-og-unge/fritidsklubber",
  ],
  "Aarhus": [
    "https://www.aarhus.dk/borger/pasning-og-skole/fritids-og-klubtilbud",
    "https://www.aarhus.dk/borger/boern-og-unge/fritidstilbud",
    "https://www.aarhus.dk/borger/boern-og-unge/fritidsklub",
  ],
  "Odense": [
    "https://www.odense.dk/borger/boern-unge-og-familie/fritidstilbud",
    "https://www.odense.dk/borger/boern-og-unge/fritidsklub",
    "https://www.odense.dk/borger/boern-og-unge/fritidstilbud",
  ],
  "Gentofte": [
    "https://www.gentofte.dk/borger/familie-boern-og-unge/klub",
    "https://www.gentofte.dk/borger/boern-unge-og-familie/fritidsklub",
    "https://www.gentofte.dk/borger/boern-unge/fritidstilbud",
  ],
  "Gladsaxe": [
    "https://www.gladsaxe.dk/borger/boern-unge-og-familie/fritidsklub",
    "https://www.gladsaxe.dk/borger/boern-og-unge/fritidstilbud",
    "https://www.gladsaxe.dk/borger/boern-og-unge/fritidsklubber",
  ],
  "Lyngby-Taarbæk": [
    "https://www.ltk.dk/borger/boern-og-unge/fritidstilbud",
    "https://www.ltk.dk/borger/boern-og-unge/fritidsklub",
    "https://www.ltk.dk/borger/boern-og-unge/klub",
  ],
  "Rudersdal": [
    "https://www.rudersdal.dk/borger/boern-unge-og-familie/fritidsklub",
    "https://www.rudersdal.dk/borger/boern-og-unge/fritidstilbud",
    "https://www.rudersdal.dk/borger/boern-og-unge/klub",
  ],
  "Helsingør": [
    "https://www.helsingor.dk/borger/boern-unge-og-familie/fritidsklub",
    "https://www.helsingor.dk/borger/boern-og-unge/fritidstilbud",
    "https://www.helsingor.dk/borger/boern-og-unge/klub",
  ],
};

// ─── HTTP helpers ─────────────────────────────────────────────────────

function fetch(url, { timeout = 15000, maxRedirects = 5 } = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "InstitutionsguideBot/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        const next = new URL(res.headers.location, url).href;
        resolve(fetch(next, { timeout, maxRedirects: maxRedirects - 1 }));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf-8") }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "").trim();
}

// ─── STIL parsing ─────────────────────────────────────────────────────

function parseSTILPage(html) {
  const results = [];
  // Each row is a <tr> containing one <td> with all info inline
  // Pattern: <a ...>Name (ID)</a>,&nbsp; <span ...>Address</span>,&nbsp; <span ...>PostalCode</span> <span ...>City</span>,&nbsp; tlf:&nbsp;<span ...>Phone</span>,&nbsp; e-mail:&nbsp;<a href="mailto:...">email</a>

  // Split into rows
  const rowRegex = /<tr\s+bgcolor="White">\s*<td><font[^>]*>([\s\S]*?)<\/font><\/td>\s*<\/tr>/gi;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const cell = match[1];

    // Name and ID from the link
    const nameMatch = cell.match(/<a[^>]*>([^<]+)\((\d+)\)<\/a>/);
    if (!nameMatch) continue;

    const name = decodeHtmlEntities(nameMatch[1].trim());
    const stilId = nameMatch[2].trim();

    // Address from Label2
    const addrMatch = cell.match(/Label2_\d+"[^>]*>([^<]+)<\/span>/);
    const address = addrMatch ? decodeHtmlEntities(addrMatch[1].trim()) : "";

    // Postal code from Label3
    const zipMatch = cell.match(/Label3_\d+"[^>]*>([^<]+)<\/span>/);
    const postalCode = zipMatch ? zipMatch[1].trim() : "";

    // City from Label4
    const cityMatch = cell.match(/Label4_\d+"[^>]*>([^<]+)<\/span>/);
    const city = cityMatch ? decodeHtmlEntities(cityMatch[1].trim()) : "";

    // Phone from Label5
    const phoneMatch = cell.match(/Label5_\d+"[^>]*>([^<]*)<\/span>/);
    const phone = phoneMatch ? phoneMatch[1].trim() : "";

    // Email from mailto link
    const emailMatch = cell.match(/mailto:([^"]+)"/);
    const email = emailMatch ? emailMatch[1].trim() : "";

    results.push({
      id: `ungdomsskole-${stilId}`,
      stilId,
      name,
      address: cleanAddress(address, postalCode, city),
      postalCode,
      city,
      municipality: "",  // will derive from city/geocode
      phone: phone.replace(/\s+/g, " "),
      email,
    });
  }

  return results;
}

/** Some addresses have the postal+city appended in the address field itself; clean that */
function cleanAddress(addr, zip, city) {
  if (!addr) return addr;
  // Remove trailing "XXXX CityName" if it matches the postal code
  const trailing = `${zip} ${city}`;
  if (addr.endsWith(trailing)) {
    return addr.slice(0, -trailing.length).replace(/,?\s*$/, "").trim();
  }
  return addr.trim();
}

// ─── Municipal fritidsklub scraping ───────────────────────────────────

/**
 * Try to extract fritidsklub names + addresses from a municipal web page.
 * These pages vary widely; we look for common patterns:
 * - Lists of club names with addresses
 * - Links to individual club pages
 */
function extractFritidsFromHTML(html, municipality) {
  const clubs = [];
  const seen = new Set();

  // Strategy 1: Look for heading + address patterns common on municipal sites
  // Pattern: club name followed by address-like text
  const text = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?(p|div|li|h[1-6]|td|tr|dt|dd)[^>]*>/gi, "\n");
  const plain = stripTags(text);
  const lines = plain.split("\n").map(l => l.trim()).filter(Boolean);

  // Look for lines containing "fritid", "klub", "ungdomsklub", "fritidscenter", "fritidshjem"
  const clubKeywords = /fritidsklub|fritidscenter|fritidshjem|ungdomsklub|juniorklub|teenklub|klub\b/i;
  const addressPattern = /^(.+?)\s+(\d{4})\s+(\S.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!clubKeywords.test(line)) continue;

    // The line itself might be a club name
    let clubName = decodeHtmlEntities(line.replace(/\s+/g, " ").trim());

    // Skip if too long (likely a sentence, not a name)
    if (clubName.length > 80) continue;

    // Look for an address in the next few lines
    let address = "", postalCode = "", city = "";
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const m = lines[j].match(addressPattern);
      if (m) {
        address = m[1].trim();
        postalCode = m[2];
        city = m[3].trim();
        break;
      }
      // Also try matching just a street address
      if (/^\w.*\d/.test(lines[j]) && lines[j].length < 60) {
        address = lines[j].trim();
      }
    }

    const key = clubName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      clubs.push({
        name: clubName,
        address,
        postalCode,
        city,
        municipality,
        source: "municipal-website",
      });
    }
  }

  // Strategy 2: Look for links with club-like text
  const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>([^<]*(?:fritidsklub|fritidscenter|fritidshjem|ungdomsklub|juniorklub|klub)[^<]*)<\/a>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const linkName = decodeHtmlEntities(linkMatch[2].trim());
    const key = linkName.toLowerCase();
    if (linkName.length > 80) continue;
    if (!seen.has(key)) {
      seen.add(key);
      clubs.push({
        name: linkName,
        address: "",
        postalCode: "",
        city: "",
        municipality,
        source: "municipal-website",
      });
    }
  }

  return clubs;
}

// ─── Geocoding via DAWA ──────────────────────────────────────────────

async function geocode(address, postalCode, city) {
  if (!address && !city) return { lat: null, lng: null, municipality: "" };

  const q = [address, postalCode, city].filter(Boolean).join(" ");
  const url = `${DAWA_BASE}?q=${encodeURIComponent(q)}&fuzzy=`;

  try {
    const res = await fetch(url);
    if (res.status !== 200) return { lat: null, lng: null, municipality: "" };

    const data = JSON.parse(res.body);
    if (!data || data.length === 0) return { lat: null, lng: null, municipality: "" };

    const best = data[0];
    const adgang = best.adgangsadresse || {};
    const kommune = adgang.kommune || {};
    const coords = adgang.adgangspunkt?.koordinater || [];

    return {
      lat: coords[1] ?? adgang.vejpunkt?.koordinater?.[1] ?? null,
      lng: coords[0] ?? adgang.vejpunkt?.koordinater?.[0] ?? null,
      municipality: kommune.navn || "",
    };
  } catch {
    return { lat: null, lng: null, municipality: "" };
  }
}

// ─── Municipality lookup from city name (fallback) ───────────────────

function guessMunicipalityFromCity(city) {
  // Many Danish ungdomsskoler have city = municipality seat
  // This is a rough fallback; DAWA geocoding gives the real answer
  const cityLower = (city || "").toLowerCase();
  const map = {
    "frederiksberg": "Frederiksberg",
    "aarhus": "Aarhus", "århus": "Aarhus",
    "odense": "Odense",
    "gentofte": "Gentofte",
    "gladsaxe": "Gladsaxe", "søborg": "Gladsaxe",
    "lyngby": "Lyngby-Taarbæk", "kgs. lyngby": "Lyngby-Taarbæk", "kongens lyngby": "Lyngby-Taarbæk",
    "holte": "Rudersdal", "birkerød": "Rudersdal",
    "helsingør": "Helsingør",
    "københavn": "København", "copenhagen": "København",
    "køge": "Køge",
    "roskilde": "Roskilde",
    "hillerød": "Hillerød",
    "ballerup": "Ballerup",
    "hvidovre": "Hvidovre",
    "rødovre": "Rødovre",
    "brøndby": "Brøndby",
    "ishøj": "Ishøj",
    "albertslund": "Albertslund",
    "tårnby": "Tårnby",
    "dragør": "Dragør",
    "vallensbæk": "Vallensbæk",
    "høje-taastrup": "Høje-Taastrup", "taastrup": "Høje-Taastrup",
    "greve": "Greve",
    "solrød": "Solrød",
    "holbæk": "Holbæk",
    "slagelse": "Slagelse",
    "næstved": "Næstved",
    "aalborg": "Aalborg",
    "esbjerg": "Esbjerg",
    "vejle": "Vejle",
    "horsens": "Horsens",
    "kolding": "Kolding",
    "herning": "Herning",
    "silkeborg": "Silkeborg",
    "randers": "Randers",
    "viborg": "Viborg",
    "skive": "Skive",
    "frederikshavn": "Frederikshavn",
    "hjørring": "Hjørring",
    "sønderborg": "Sønderborg",
    "haderslev": "Haderslev",
    "aabenraa": "Aabenraa",
  };
  return map[cityLower] || "";
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Fetching ungdomsskoler & fritidscentre ===");
  console.log(`Dry run: ${DRY_RUN}`);

  // ── Step 1: Fetch STIL ungdomsskole list ───────────────────────────
  console.log("\n[1/4] Fetching STIL ungdomsskole list...");
  let ungdomsskoler = [];

  try {
    const res = await fetch(STIL_URL);
    if (res.status !== 200) {
      console.error(`  STIL returned status ${res.status}`);
      process.exit(1);
    }
    console.log(`  Got ${(res.body.length / 1024).toFixed(0)} KB of HTML`);
    ungdomsskoler = parseSTILPage(res.body);
    console.log(`  Parsed ${ungdomsskoler.length} ungdomsskoler`);

    if (ungdomsskoler.length < 80) {
      console.warn("  WARNING: Expected ~119 ungdomsskoler, got significantly fewer. Page structure may have changed.");
    }
  } catch (err) {
    console.error(`  Failed to fetch STIL: ${err.message}`);
    process.exit(1);
  }

  // ── Step 2: Scrape municipal fritidstilbud pages ───────────────────
  console.log("\n[2/4] Scraping municipal fritidstilbud pages...");
  const fritidscentre = [];

  for (const muni of MISSING_MUNICIPALITIES) {
    const urls = MUNICIPAL_FRITID_URLS[muni.name] || [];
    console.log(`  ${muni.name}: trying ${urls.length} URLs...`);

    for (const url of urls) {
      try {
        await sleep(1000);
        const res = await fetch(url);
        if (res.status !== 200) {
          console.log(`    ${url} → ${res.status}`);
          continue;
        }
        console.log(`    ${url} → ${res.status} (${(res.body.length / 1024).toFixed(0)} KB)`);
        const clubs = extractFritidsFromHTML(res.body, muni.name);
        if (clubs.length > 0) {
          console.log(`    Found ${clubs.length} potential fritidsklubber`);
          fritidscentre.push(...clubs);
        }
      } catch (err) {
        console.log(`    ${url} → Error: ${err.message}`);
      }
    }
  }

  // Deduplicate fritidscentre by name+municipality
  const uniqueFritid = [];
  const fritidSeen = new Set();
  for (const club of fritidscentre) {
    const key = `${club.name.toLowerCase()}|${club.municipality.toLowerCase()}`;
    if (!fritidSeen.has(key)) {
      fritidSeen.add(key);
      uniqueFritid.push(club);
    }
  }
  console.log(`  Total unique fritidscentre found: ${uniqueFritid.length}`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Would geocode and write output. Showing preview:");
    console.log(`  Ungdomsskoler: ${ungdomsskoler.length}`);
    ungdomsskoler.slice(0, 5).forEach((u) => console.log(`    - ${u.name} (${u.postalCode} ${u.city})`));
    if (ungdomsskoler.length > 5) console.log(`    ... and ${ungdomsskoler.length - 5} more`);
    console.log(`  Fritidscentre: ${uniqueFritid.length}`);
    uniqueFritid.slice(0, 10).forEach((f) => console.log(`    - ${f.name} (${f.municipality}) [${f.source}]`));
    if (uniqueFritid.length > 10) console.log(`    ... and ${uniqueFritid.length - 10} more`);
    return;
  }

  // ── Step 3: Geocode ungdomsskoler ──────────────────────────────────
  console.log("\n[3/4] Geocoding ungdomsskoler...");
  let geocoded = 0;
  for (const school of ungdomsskoler) {
    await sleep(200); // DAWA is fast, shorter delay is fine
    const geo = await geocode(school.address, school.postalCode, school.city);
    school.lat = geo.lat;
    school.lng = geo.lng;
    school.municipality = geo.municipality || guessMunicipalityFromCity(school.city) || school.city;
    if (geo.lat) geocoded++;

    if (geocoded % 20 === 0 && geocoded > 0) {
      console.log(`  Geocoded ${geocoded}/${ungdomsskoler.length}...`);
    }
  }
  console.log(`  Geocoded ${geocoded}/${ungdomsskoler.length} ungdomsskoler`);

  // Geocode fritidscentre
  console.log("  Geocoding fritidscentre...");
  let fritidGeocoded = 0;
  for (const club of uniqueFritid) {
    if (!club.address && !club.city) {
      club.lat = null;
      club.lng = null;
      continue;
    }
    await sleep(200);
    const geo = await geocode(club.address, club.postalCode, club.city || club.municipality);
    club.lat = geo.lat;
    club.lng = geo.lng;
    if (!club.municipality && geo.municipality) club.municipality = geo.municipality;
    if (geo.lat) fritidGeocoded++;
  }
  console.log(`  Geocoded ${fritidGeocoded}/${uniqueFritid.length} fritidscentre`);

  // ── Step 4: Write output ───────────────────────────────────────────
  console.log("\n[4/4] Writing output...");

  // Assign IDs to fritidscentre
  const fritidOutput = uniqueFritid.map((club, i) => ({
    id: `fritid-muni-${i + 1}`,
    name: club.name,
    address: club.address || "",
    postalCode: club.postalCode || "",
    city: club.city || "",
    municipality: club.municipality || "",
    phone: club.phone || "",
    email: club.email || "",
    lat: club.lat ?? null,
    lng: club.lng ?? null,
    source: club.source || "municipal-website",
  }));

  const ungdomsOutput = ungdomsskoler.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    postalCode: s.postalCode,
    city: s.city,
    municipality: s.municipality,
    phone: s.phone,
    email: s.email,
    lat: s.lat ?? null,
    lng: s.lng ?? null,
  }));

  const output = {
    ungdomsskoler: ungdomsOutput,
    fritidscentre: fritidOutput,
    fetchedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`  Wrote ${OUT_PATH}`);
  console.log(`  ${ungdomsOutput.length} ungdomsskoler, ${fritidOutput.length} fritidscentre`);
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
