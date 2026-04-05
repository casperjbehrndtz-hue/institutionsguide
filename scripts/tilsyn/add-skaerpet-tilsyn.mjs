#!/usr/bin/env node
/**
 * add-skaerpet-tilsyn.mjs — Adds confirmed skærpet tilsyn cases from news/search
 *
 * These are manually verified from news articles and municipal websites.
 * This is the highest-value tilsyn data — the problem institutions.
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "output");

// Confirmed skærpet tilsyn cases from news articles and municipal websites
const SKAERPET_CASES = [
  // Aarhus — 7 institutions under "skærpet tilsyn ved bekymring" as of Feb 2025
  // Source: dinavis.dk article "Syv brodne kar stikker ud i kontrol af aarhusianske dagtilbud"
  {
    id: "bh-G20184",
    name: "DII Børnenes have",
    municipality: "Aarhus",
    date: "2025-02-04",
    rating: "skærpet",
    source: "https://dinavis.dk/samfund/ECE17832543/utrygge-boern-og-bekymrede-foraeldre-syv-brodne-kar-stikker-ud-i-kontrol-af-aarhusianske-dagtilbud/",
    note: "Egå area. Issues: uneven quality, children going unnoticed",
  },
  {
    id: "bh-G19878",
    name: "Børnehuset Eghovedvej",
    municipality: "Aarhus",
    date: "2025-02-04",
    rating: "skærpet",
    source: "https://dinavis.dk/samfund/ECE17832543/utrygge-boern-og-bekymrede-foraeldre-syv-brodne-kar-stikker-ud-i-kontrol-af-aarhusianske-dagtilbud/",
    note: "Malling area",
  },
  {
    id: "bh-G20459",
    name: "Børnehuset Grundtvigsvej",
    municipality: "Aarhus",
    date: "2025-02-04",
    rating: "skærpet",
    source: "https://dinavis.dk/samfund/ECE17832543/utrygge-boern-og-bekymrede-foraeldre-syv-brodne-kar-stikker-ud-i-kontrol-af-aarhusianske-dagtilbud/",
    note: "Viby area",
  },
  {
    id: "bh-G19897",
    name: "Børnehuset Nattergalen",
    municipality: "Aarhus",
    date: "2025-02-04",
    rating: "skærpet",
    source: "https://dinavis.dk/samfund/ECE17832543/utrygge-boern-og-bekymrede-foraeldre-syv-brodne-kar-stikker-ud-i-kontrol-af-aarhusianske-dagtilbud/",
    note: "Brabrand area",
  },
  {
    id: "bh-G19893",
    name: "DII Sommerfuglen",
    municipality: "Aarhus",
    date: "2025-02-04",
    rating: "skærpet",
    source: "https://dinavis.dk/samfund/ECE17832543/utrygge-boern-og-bekymrede-foraeldre-syv-brodne-kar-stikker-ud-i-kontrol-af-aarhusianske-dagtilbud/",
    note: "Sabro area",
  },

  // Varde — Svalehuset under skærpet tilsyn, children moved
  // Source: ugeavisen.dk December 2025
  {
    id: "bh-G13913",
    name: "Børnehaven Svalehuset - Janderup",
    municipality: "Varde",
    date: "2025-12-15",
    rating: "skærpet",
    source: "https://ugeavisen.dk/varde/boernehave-under-skaerpet-tilsyn-boern-flyttes-til-en-anden-institution",
    note: "Children moved to another institution. Recovery plan initiated.",
  },

  // Roskilde — Børnehuset Smedegade under skærpet tilsyn since Dec 2025
  // Source: roskilde.dk tilsyn page
  {
    id: "bh-G18941",
    name: "Børnehuset Smedegade",
    municipality: "Roskilde",
    date: "2025-12-12",
    rating: "skærpet",
    source: "https://www.roskilde.dk/da-dk/service-og-selvbetjening/borger/familie-og-born/dagtilbud/kommunen-forer-tilsyn-med-dagtilbuddene/",
    note: "Based on unannounced inspections Dec 9 and 12, 2025. Serious concerns about pedagogical quality.",
  },

  // Roskilde — Børnehuset Hyldekær was under skærpet tilsyn March 2024 - April 2025
  // Now resolved, but still notable
  {
    id: "bh-G21948",
    name: "Børnehuset Hyldekær",
    municipality: "Roskilde",
    date: "2025-04-01",
    rating: "godkendt_bemærkninger",
    source: "https://www.roskilde.dk/da-dk/service-og-selvbetjening/borger/familie-og-born/dagtilbud/kommunen-forer-tilsyn-med-dagtilbuddene/",
    note: "Was under skærpet tilsyn March 2024 - April 2025 (kindergarten). Now resolved.",
  },

  // Køge — Torpgården has skærpet in PDF filename (not in our institution data,
  // likely a private institution, so skip)
];

function main() {
  console.log("=== Adding confirmed skærpet tilsyn cases ===\n");

  // Group by municipality
  const byMunicipality = {};
  for (const c of SKAERPET_CASES) {
    if (!byMunicipality[c.municipality]) byMunicipality[c.municipality] = [];
    byMunicipality[c.municipality].push(c);
  }

  for (const [muni, cases] of Object.entries(byMunicipality)) {
    const slug = muni.toLowerCase()
      .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
      .replace(/-/g, "-").replace(/\s/g, "-");
    const outPath = join(OUTPUT_DIR, `${slug}-tilsyn.json`);

    // Load existing file if present
    let existing = { municipality: muni, scraped_at: null, total_parsed: 0, matched: 0, unmatched: 0, reports: [] };
    if (existsSync(outPath)) {
      existing = JSON.parse(readFileSync(outPath, "utf8"));
    }

    const existingIds = new Set(existing.reports.map(r => r.matched_institution_id));

    let added = 0;
    for (const c of cases) {
      // Don't overwrite existing data with less info
      if (existingIds.has(c.id)) {
        const existingReport = existing.reports.find(r => r.matched_institution_id === c.id);
        // Only replace if existing is just "godkendt" and we have skærpet
        if (existingReport && existingReport.overall_rating === "godkendt" && c.rating === "skærpet") {
          existingReport.overall_rating = "skærpet";
          existingReport.report_date = c.date;
          existingReport.pdf_url = c.source;
          console.log(`  ⚠️  Updated ${c.name} -> ${c.rating}`);
          added++;
        } else {
          console.log(`  ⏭️  ${c.name} already exists with rating ${existingReport?.overall_rating}`);
        }
        continue;
      }

      existing.reports.push({
        pdf_url: c.source,
        link_text: `Skærpet tilsyn: ${c.name}`,
        institution_name: c.name,
        report_date: c.date,
        report_year: parseInt(c.date.substring(0, 4)),
        overall_rating: c.rating,
        strengths: [],
        areas_for_improvement: [c.note],
        report_type: "skærpet",
        matched_institution_id: c.id,
      });
      existingIds.add(c.id);
      added++;

      const icon = c.rating === "skærpet" ? "🚨" : "⚠️";
      console.log(`  ${icon} ${c.name} (${c.id}) [${muni}] -> ${c.rating}`);
    }

    existing.scraped_at = new Date().toISOString();
    existing.matched = existing.reports.filter(r => r.matched_institution_id).length;
    existing.total_parsed = existing.reports.length;

    writeFileSync(outPath, JSON.stringify(existing, null, 2), "utf-8");
    console.log(`  Saved: ${slug}-tilsyn.json (${existing.reports.length} reports, ${added} new)\n`);
  }
}

main();
