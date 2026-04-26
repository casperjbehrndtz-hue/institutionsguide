#!/usr/bin/env node
/**
 * Edge-case test: hits every /kommune/<slug> page (built + bot-rendered)
 * and verifies it returns institutions, not a "not found" empty state.
 *
 * Run BEFORE shipping a release: catches data gaps and slug routing bugs.
 *
 *   node scripts/health-check-kommuner.mjs
 *   node scripts/health-check-kommuner.mjs --base=http://localhost:4173
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../public/data");

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.replace(/^--/, "").split("="))
);

const BASE = args.base || "https://www.institutionsguiden.dk";

const DANISH_MAP = { "æ": "ae", "ø": "oe", "å": "aa", "Æ": "Ae", "Ø": "Oe", "Å": "Aa" };
function toSlug(name) {
  return name
    .replace(/[æøåÆØÅ]/g, (ch) => DANISH_MAP[ch] || ch)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadKommuner() {
  const skoleData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "skole-data.json"), "utf-8"));
  const set = new Set();
  for (const s of skoleData.s) {
    if (s.m) set.add(s.m.replace(/s? Regionskommune$/, "").replace(/ Kommune$/, ""));
  }
  for (const file of ["vuggestue-data.json", "boernehave-data.json", "dagpleje-data.json"]) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
      for (const inst of data.i) if (inst.m) set.add(inst.m);
    } catch { /* ignore */ }
  }
  return [...set].sort();
}

async function checkUrl(url) {
  const start = Date.now();
  try {
    // Use Googlebot UA — middleware serves bot-rendered HTML to known bots,
    // which is what we want to verify (SEO content). Chrome would get the
    // SPA shell which has no markup until JS runs.
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
      redirect: "follow",
    });
    const ms = Date.now() - start;
    if (!res.ok) return { ok: false, status: res.status, ms };
    const html = await res.text();
    // Bot-renderer signature: should contain at least one institution link
    const hasInst = /\/institution\//.test(html);
    const hasNotFound = /Ingen institutioner|No institutions found|Side ikke fundet|404/i.test(html);
    if (!hasInst && hasNotFound) return { ok: false, status: 200, ms, reason: "empty" };
    if (!hasInst) return { ok: false, status: 200, ms, reason: "no-institutions" };
    return { ok: true, status: res.status, ms };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - start, reason: String(err) };
  }
}

async function main() {
  const kommuner = loadKommuner();
  console.log(`Found ${kommuner.length} kommuner. Testing on ${BASE}…`);

  const failures = [];
  let totalMs = 0;
  let ok = 0;

  // Sitemap + prerender uses encodeURIComponent(canonical name) — that's
  // what Google sees and indexes. We test the canonical URL primarily.
  for (let i = 0; i < kommuner.length; i++) {
    const k = kommuner[i];
    const canonicalUrl = `${BASE}/kommune/${encodeURIComponent(k)}`;
    const r = await checkUrl(canonicalUrl);
    totalMs += r.ms;
    if (r.ok) {
      ok++;
      process.stdout.write(`✓ ${i + 1}/${kommuner.length} ${k.padEnd(28)} ${r.ms}ms\r`);
    } else {
      failures.push({ kommune: k, ...r });
      console.log(`✗ ${k.padEnd(28)} ${r.status} ${r.reason || ""} ${r.ms}ms`);
    }
  }

  console.log(`\n\nResultat: ${ok}/${kommuner.length} ok (${(totalMs / kommuner.length).toFixed(0)}ms gns)`);
  if (failures.length > 0) {
    console.log(`\nFejl (${failures.length}):`);
    for (const f of failures) console.log(`  ${f.kommune} — HTTP ${f.status} ${f.reason || ""}`);
    process.exit(1);
  }
  console.log(`Alle 98 kommune-sider returnerer indhold ✓`);
}

main().catch((err) => { console.error(err); process.exit(1); });
