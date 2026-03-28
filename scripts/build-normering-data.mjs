import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const raw = JSON.parse(
  readFileSync("scripts/output/normering-kommune-all.json", "utf-8")
);

const ageGroupMap = {
  "Dagpleje": "dagpleje",
  "0-2 år": "0-2",
  "3-5 år": "3-5",
};

const parseDanishDecimal = (s) => {
  if (!s || s.trim() === "") return null;
  return parseFloat(s.replace(",", "."));
};

const result = [];

for (const row of raw) {
  const municipality = row["[Kommune].[Navn].[Navn]"];
  const rawAgeGroup = row["[Pasningstilbud].[Pasningstilbud].[Pasningstilbud]"];
  const yearStr = row["[År].[År].[År]"];
  const ratioOld = row["Normering kommune til og med 2022"];
  const ratioNew = row["Normering kommune fra 2023"];

  const ag = ageGroupMap[rawAgeGroup];
  if (!ag) continue;

  const year = parseInt(yearStr, 10);
  if (isNaN(year)) continue;

  const ratio = year <= 2022 ? parseDanishDecimal(ratioOld) : parseDanishDecimal(ratioNew);
  if (ratio === null) continue;

  result.push({ m: municipality, ag, y: year, r: ratio });
}

const outPath = "public/data/normering-data.json";
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(result));

console.log(`Wrote ${result.length} records to ${outPath}`);
