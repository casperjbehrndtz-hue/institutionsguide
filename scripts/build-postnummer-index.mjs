#!/usr/bin/env node
/**
 * Builds public/data/postnummer-index.json from institution data.
 * Maps 4-digit postnummer -> { city, kommune, count }.
 * Used by HomePage InstantAnswer for live postnummer-based lookup.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../public/data");
const OUT = path.join(DATA_DIR, "postnummer-index.json");

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
  } catch {
    return null;
  }
}

function cleanMunicipality(raw) {
  if (!raw) return "";
  return raw.replace(/s? Regionskommune$/, "").replace(/ Kommune$/, "").trim();
}

const index = {};

function add(pnRaw, city, kommune) {
  if (!pnRaw) return;
  const pn = String(pnRaw).replace(/\D/g, "").padStart(4, "0");
  if (pn.length !== 4) return;
  const k = cleanMunicipality(kommune);
  if (!k) return;
  if (!index[pn]) {
    index[pn] = { city: city || "", kommune: k, count: 0 };
  }
  index[pn].count++;
  if (city && !index[pn].city) index[pn].city = city;
}

// Schools
const skole = loadJson("skole-data.json");
if (skole?.s) {
  for (const s of skole.s) {
    if (s.t === "u") continue;
    add(s.z, s.c, s.m);
  }
}

// Dagtilbud
for (const file of ["vuggestue-data.json", "boernehave-data.json", "dagpleje-data.json", "sfo-data.json"]) {
  const data = loadJson(file);
  if (!data?.i) continue;
  for (const d of data.i) {
    add(d.z, d.c, d.m);
  }
}

fs.writeFileSync(OUT, JSON.stringify(index), "utf-8");
console.log(`[postnummer-index] Wrote ${Object.keys(index).length} postnumre to ${OUT}`);
