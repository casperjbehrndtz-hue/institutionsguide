/**
 * Compacts vuggestue-data.json and dagpleje-data.json to use short keys,
 * matching the compact format used by skole-data.json.
 *
 * Key mapping:
 *   id → id, name → n, type → tp, ownership → ow,
 *   municipality → m, address → a, postalCode → z, city → c,
 *   lat → la, lng → lo, email → e, phone → ph,
 *   annualRate → ar, monthlyRate → mr
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../public/data");

function compactInstitution(d) {
  const c = { id: d.id, n: d.name, tp: d.type, ow: d.ownership, m: d.municipality };
  if (d.address) c.a = d.address;
  if (d.postalCode) c.z = d.postalCode;
  if (d.city) c.c = d.city;
  if (d.lat) c.la = Math.round(d.lat * 1e5) / 1e5; // 5 decimal = ~1m precision
  if (d.lng) c.lo = Math.round(d.lng * 1e5) / 1e5;
  if (d.email) c.e = d.email;
  if (d.phone) c.ph = d.phone;
  if (d.annualRate) c.ar = d.annualRate;
  if (d.monthlyRate) c.mr = d.monthlyRate;
  return c;
}

// Compact vuggestue
const vugRaw = JSON.parse(readFileSync(resolve(dataDir, "vuggestue-data.json"), "utf-8"));
const vugCompact = { i: vugRaw.institutions.map(compactInstitution) };
const vugOut = JSON.stringify(vugCompact);
writeFileSync(resolve(dataDir, "vuggestue-data.json"), vugOut);
console.log(`Vuggestue: ${vugRaw.institutions.length} institutions → ${(vugOut.length / 1024).toFixed(0)} KB`);

// Compact dagpleje
const dagRaw = JSON.parse(readFileSync(resolve(dataDir, "dagpleje-data.json"), "utf-8"));
const dagCompact = { i: dagRaw.dagplejere.map(compactInstitution) };
const dagOut = JSON.stringify(dagCompact);
writeFileSync(resolve(dataDir, "dagpleje-data.json"), dagOut);
console.log(`Dagpleje: ${dagRaw.dagplejere.length} dagplejere → ${(dagOut.length / 1024).toFixed(0)} KB`);
