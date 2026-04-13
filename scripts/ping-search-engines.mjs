const SITEMAP_URL = "https://www.institutionsguiden.dk/sitemap.xml";

const endpoints = [
  { name: "Google", url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
  { name: "Bing", url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
];

async function main() {
  for (const { name, url } of endpoints) {
    try {
      const res = await fetch(url);
      console.log(`${name}: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.error(`${name}: ERROR - ${err.message}`);
    }
  }
}

main();
