#!/usr/bin/env node
/**
 * fetch-dagtilbud-register.mjs
 *
 * Downloads a fresh copy of the Dagtilbudsregisteret CSV from STIL
 * (Styrelsen for It og Laering) and saves it to the shared data directory.
 *
 * The STIL export page (https://dagtilbudsregister.stil.dk/Eksport.aspx)
 * is an ASP.NET WebForms app that requires a two-step dance:
 *   1. GET the page to extract __VIEWSTATE / __EVENTVALIDATION tokens
 *   2. POST back with the "Samlet udtraek" (combined export) button event
 *      to trigger the CSV download.
 *
 * Usage:
 *   node scripts/fetch-dagtilbud-register.mjs              # download & overwrite
 *   node scripts/fetch-dagtilbud-register.mjs --dry-run    # fetch & show stats only
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const EXPORT_PAGE_URL = "https://dagtilbudsregister.stil.dk/Eksport.aspx";
const OUTPUT_PATH = resolve(
  __dirname,
  "../../shared-childcare-engine/data/dagtilbud-register.csv"
);
const DRY_RUN = process.argv.includes("--dry-run");

// ASP.NET PostBack event target for "Samlet udtraek" (combined CSV export)
const POSTBACK_TARGET = "ctl00$ContentPlaceHolder1$LinkButtonOejeblik";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extract a hidden ASP.NET field value from HTML */
function extractField(html, fieldId) {
  // Try the standard hidden input pattern
  const inputRe = new RegExp(
    `id="${fieldId}"[^>]*value="([^"]*)"`,
    "i"
  );
  const m = html.match(inputRe);
  if (m) return m[1];

  // Some ASP.NET pages embed these in a script block instead
  const scriptRe = new RegExp(
    `\\|${fieldId}\\|([^|]*)\\|`,
    "i"
  );
  const m2 = html.match(scriptRe);
  if (m2) return m2[1];

  return null;
}

/** Decode HTML entities that ASP.NET loves to use in hidden fields */
function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Dagtilbudsregisteret CSV Fetch ===\n");

  // Step 1: GET the export page to harvest ASP.NET tokens
  console.log(`Fetching export page: ${EXPORT_PAGE_URL}`);
  const pageRes = await fetch(EXPORT_PAGE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) institutionsguide-bot/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!pageRes.ok) {
    throw new Error(
      `Failed to load export page: ${pageRes.status} ${pageRes.statusText}`
    );
  }

  // Capture cookies from the response for the POST
  const setCookies = pageRes.headers.getSetCookie?.() || [];
  const cookieHeader = setCookies
    .map((c) => c.split(";")[0])
    .join("; ");

  const html = await pageRes.text();

  const viewState = decodeEntities(extractField(html, "__VIEWSTATE"));
  const viewStateGen = decodeEntities(
    extractField(html, "__VIEWSTATEGENERATOR")
  );
  const eventValidation = decodeEntities(
    extractField(html, "__EVENTVALIDATION")
  );

  if (!viewState) {
    console.error(
      "ERROR: Could not extract __VIEWSTATE from export page."
    );
    console.error(
      "The STIL website structure may have changed. Check the page manually."
    );
    process.exit(1);
  }

  console.log("  Extracted ASP.NET tokens OK");
  if (viewStateGen) console.log(`  __VIEWSTATEGENERATOR: ${viewStateGen}`);

  // Step 2: POST back to trigger the "Samlet udtraek" CSV download
  console.log(`\nRequesting combined CSV export (PostBack: ${POSTBACK_TARGET})`);

  const formData = new URLSearchParams();
  formData.append("__VIEWSTATE", viewState);
  if (viewStateGen) formData.append("__VIEWSTATEGENERATOR", viewStateGen);
  if (eventValidation) formData.append("__EVENTVALIDATION", eventValidation);
  formData.append("__EVENTTARGET", POSTBACK_TARGET);
  formData.append("__EVENTARGUMENT", "");

  const csvRes = await fetch(EXPORT_PAGE_URL, {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) institutionsguide-bot/1.0",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
      Referer: EXPORT_PAGE_URL,
    },
    body: formData.toString(),
    redirect: "follow",
  });

  if (!csvRes.ok) {
    throw new Error(
      `CSV download failed: ${csvRes.status} ${csvRes.statusText}`
    );
  }

  const contentType = csvRes.headers.get("content-type") || "";
  const contentDisp = csvRes.headers.get("content-disposition") || "";
  console.log(`  Content-Type: ${contentType}`);
  if (contentDisp) console.log(`  Content-Disposition: ${contentDisp}`);

  const csvBuffer = Buffer.from(await csvRes.arrayBuffer());

  // Validate that we actually got CSV data (not another HTML page)
  const csvText = csvBuffer.toString("utf-8").replace(/^\uFEFF/, ""); // strip BOM
  const firstLine = csvText.split("\n")[0];

  if (
    !firstLine.includes("dagtilbudsType") &&
    !firstLine.includes("daginstitutionsNummer")
  ) {
    // We might have gotten an HTML error page back
    if (csvText.includes("<!DOCTYPE") || csvText.includes("<html")) {
      console.error(
        "\nERROR: Received HTML instead of CSV. The ASP.NET PostBack may have changed."
      );
      console.error(
        "Try visiting https://dagtilbudsregister.stil.dk/Eksport.aspx manually."
      );
      console.error(
        "\nFirst 500 chars of response:\n" + csvText.slice(0, 500)
      );
      process.exit(1);
    }
    console.warn(
      "\nWARNING: CSV header does not match expected format."
    );
    console.warn(`  First line: ${firstLine.slice(0, 120)}`);
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  const lines = csvText.split("\n").filter((l) => l.trim());
  const headerLine = lines[0];
  const headers = headerLine.split(";");
  const dataLines = lines.slice(1);

  console.log("\n=== Stats ===");
  console.log(`Total rows (excl. header): ${dataLines.length}`);

  // Column indices
  const colAktivitet = headers.indexOf("aktivitetsstatus");
  const colAnvNr = headers.indexOf("anvisningsenhedsNummer");
  const colInstType3 = headers.indexOf("instType3");
  const colInstType3Tekst = headers.indexOf("instType3_Tekst");

  // Active anvisningsenheder: rows that have an anvisningsenhedsNummer and are Aktiv
  let activeAnvisnings = 0;
  const instType3Counts = {};

  for (const line of dataLines) {
    const cols = line.split(";");
    const status = colAktivitet >= 0 ? cols[colAktivitet]?.trim() : "";
    const anvNr = colAnvNr >= 0 ? cols[colAnvNr]?.trim() : "";
    const type3 = colInstType3 >= 0 ? cols[colInstType3]?.trim() : "";
    const type3Tekst =
      colInstType3Tekst >= 0 ? cols[colInstType3Tekst]?.trim() : "";

    if (anvNr && status === "Aktiv") activeAnvisnings++;

    if (type3) {
      const label = type3Tekst ? `${type3} (${type3Tekst})` : type3;
      instType3Counts[label] = (instType3Counts[label] || 0) + 1;
    }
  }

  console.log(`Active anvisningsenheder: ${activeAnvisnings}`);
  console.log("\nCount by instType3:");
  const sorted = Object.entries(instType3Counts).sort((a, b) => b[1] - a[1]);
  for (const [label, count] of sorted) {
    console.log(`  ${label}: ${count}`);
  }

  // ── Save ──────────────────────────────────────────────────────────────

  if (DRY_RUN) {
    console.log("\n--dry-run: NOT overwriting existing file.");
    if (existsSync(OUTPUT_PATH)) {
      const existing = readFileSync(OUTPUT_PATH, "utf-8").replace(
        /^\uFEFF/,
        ""
      );
      const existingRows = existing
        .split("\n")
        .filter((l) => l.trim()).length - 1;
      console.log(`Existing file has ${existingRows} data rows.`);
      console.log(`New data has ${dataLines.length} data rows.`);
      const diff = dataLines.length - existingRows;
      console.log(
        `Delta: ${diff >= 0 ? "+" : ""}${diff} rows`
      );
    }
  } else {
    const outDir = dirname(OUTPUT_PATH);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(OUTPUT_PATH, csvBuffer);
    console.log(`\nSaved to: ${OUTPUT_PATH}`);
    console.log(`File size: ${(csvBuffer.length / 1024).toFixed(1)} KB`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nFATAL:", err.message || err);
  process.exit(1);
});
