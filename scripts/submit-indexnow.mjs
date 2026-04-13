import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, "../public");
const KEY_FILE = resolve(__dirname, "../.indexnow-key");
const BASE_URL = "https://www.institutionsguiden.dk";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH_SIZE = 10_000;

// Get or create IndexNow API key
function getOrCreateKey() {
  if (existsSync(KEY_FILE)) {
    const key = readFileSync(KEY_FILE, "utf-8").trim();
    console.log(`Reusing existing IndexNow key: ${key}`);
    return key;
  }
  const key = randomBytes(16).toString("hex"); // 32 hex chars
  writeFileSync(KEY_FILE, key);
  console.log(`Generated new IndexNow key: ${key}`);
  return key;
}

// Extract URLs from a sitemap XML file
function extractUrlsFromSitemap(filePath) {
  if (!existsSync(filePath)) return [];
  const xml = readFileSync(filePath, "utf-8");
  const urls = [];
  const locRegex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1];
    // Skip sitemap index entries (sub-sitemap references)
    if (!url.endsWith(".xml")) {
      urls.push(url);
    }
  }
  return urls;
}

async function main() {
  const key = getOrCreateKey();

  // Write key verification file to public/
  const keyFilePath = resolve(PUBLIC_DIR, `${key}.txt`);
  writeFileSync(keyFilePath, key);
  console.log(`Key verification file written to: ${keyFilePath}`);

  // Collect URLs from all sub-sitemaps
  const sitemapFiles = [
    "sitemap-static.xml",
    "sitemap-institutions.xml",
    "sitemap-programmatic.xml",
    "sitemap-blog.xml",
  ];

  let allUrls = [];
  for (const file of sitemapFiles) {
    const filePath = resolve(PUBLIC_DIR, file);
    const urls = extractUrlsFromSitemap(filePath);
    console.log(`${file}: ${urls.length} URLs`);
    allUrls = allUrls.concat(urls);
  }

  if (allUrls.length === 0) {
    console.error("No URLs found. Run generate-sitemap.mjs first.");
    process.exit(1);
  }

  console.log(`\nTotal URLs to submit: ${allUrls.length}`);

  // Submit in batches
  const batches = [];
  for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
    batches.push(allUrls.slice(i, i + BATCH_SIZE));
  }

  console.log(`Submitting in ${batches.length} batch(es)...\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const body = {
      host: "institutionsguiden.dk",
      key,
      keyLocation: `${BASE_URL}/${key}.txt`,
      urlList: batch,
    };

    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });

      if (res.ok || res.status === 202) {
        console.log(`Batch ${i + 1}/${batches.length}: OK (${res.status}) - ${batch.length} URLs submitted`);
      } else {
        const text = await res.text().catch(() => "");
        console.error(`Batch ${i + 1}/${batches.length}: FAILED (${res.status}) - ${text}`);
      }
    } catch (err) {
      console.error(`Batch ${i + 1}/${batches.length}: ERROR - ${err.message}`);
    }
  }

  console.log("\nDone. Key verification file is at:");
  console.log(`  ${BASE_URL}/${key}.txt`);
}

main();
