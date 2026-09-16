/**
 * Post-deploy smoke checks for the live site.
 *
 * Usage:
 *   node scripts/check-live.mjs
 *   BASE_URL=https://staging.plainfile.io node scripts/check-live.mjs   # check another host
 *   OLD_BASE_URL= node scripts/check-live.mjs                           # skip legacy-domain 301 checks
 *
 * Exit code 0 = all checks passed, 1 = at least one failure.
 * Designed for the deploy pipeline: no dependencies, plain Node fetch.
 */

const BASE_URL = (process.env.BASE_URL || 'https://plainfile.io').replace(/\/$/, '');
const OLD_BASE_URL = process.env.OLD_BASE_URL === undefined
  ? 'https://quietkit.io'
  : process.env.OLD_BASE_URL.replace(/\/$/, '');

// Keep in sync with src/routes-manifest.ts and dist/sitemap.xml.
const PAGES = [
  '/',
  '/tools',
  '/privacy',
  '/pdf/redact',
  '/pdf/redact-bank-statement',
  '/pdf/redact-ssn',
  '/pdf/redact-medical-records',
  '/pdf/redact-emails',
  '/pdf/redact-legal-documents',
  '/pdf/redact-for-foia',
  '/guides/how-to-redact-pdf-properly',
  '/guides/why-black-marker-redaction-fails',
  '/compare/privacyscanpdf-alternative',
];

let failures = 0;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  failures += 1;
  console.error(`  ✗ ${msg}`);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'manual' });
  } finally {
    clearTimeout(timer);
  }
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

async function checkPage(path) {
  const url = `${BASE_URL}${path}`;
  let res;
  try {
    res = await fetchWithTimeout(url);
  } catch (err) {
    fail(`${path}: request failed (${err.message})`);
    return;
  }
  if (res.status !== 200) {
    fail(`${path}: HTTP ${res.status}, expected 200`);
    return;
  }
  const html = await res.text();

  const titles = countOccurrences(html, '<title>');
  const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
  const ogUrls = [...html.matchAll(/<meta property="og:url" content="([^"]*)"/g)].map((m) => m[1]);
  const descriptions = countOccurrences(html, 'name="description"');

  const expectedCanonical = path === '/' ? `${BASE_URL}/` : `${BASE_URL}${path}`;

  titles === 1 ? pass(`${path}: exactly one <title>`) : fail(`${path}: ${titles} <title> tags (expected 1)`);
  canonicals.length === 1
    ? pass(`${path}: exactly one canonical`)
    : fail(`${path}: ${canonicals.length} canonical links (expected 1): ${canonicals.join(', ')}`);
  if (canonicals.length === 1) {
    canonicals[0] === expectedCanonical
      ? pass(`${path}: canonical = ${canonicals[0]}`)
      : fail(`${path}: canonical "${canonicals[0]}", expected "${expectedCanonical}"`);
  }
  ogUrls.length === 1 && ogUrls[0] === expectedCanonical
    ? pass(`${path}: og:url matches canonical`)
    : fail(`${path}: og:url mismatch: ${ogUrls.join(', ') || 'none'} (expected ${expectedCanonical})`);
  descriptions === 1
    ? pass(`${path}: exactly one meta description`)
    : fail(`${path}: ${descriptions} meta descriptions (expected 1)`);
  if (html.includes('quietkit')) {
    fail(`${path}: page still references "quietkit"`);
  }
}

async function checkSitemap() {
  console.log('\nSitemap:');
  const url = `${BASE_URL}/sitemap.xml`;
  try {
    const res = await fetchWithTimeout(url);
    if (res.status !== 200) {
      fail(`sitemap.xml: HTTP ${res.status}`);
      return;
    }
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    locs.length === PAGES.length
      ? pass(`sitemap.xml: ${locs.length} URLs`)
      : fail(`sitemap.xml: ${locs.length} URLs, expected ${PAGES.length}`);
    const wrongDomain = locs.filter((l) => !l.startsWith(BASE_URL));
    wrongDomain.length === 0
      ? pass('sitemap.xml: all URLs on the expected domain')
      : fail(`sitemap.xml: URLs on wrong domain: ${wrongDomain.join(', ')}`);
  } catch (err) {
    fail(`sitemap.xml: request failed (${err.message})`);
  }
}

async function checkRobots() {
  console.log('\nRobots:');
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/robots.txt`);
    if (res.status !== 200) {
      fail(`robots.txt: HTTP ${res.status}`);
      return;
    }
    const text = await res.text();
    text.includes(`Sitemap: ${BASE_URL}/sitemap.xml`)
      ? pass('robots.txt references the correct sitemap')
      : fail(`robots.txt: expected "Sitemap: ${BASE_URL}/sitemap.xml", got:\n${text}`);
  } catch (err) {
    fail(`robots.txt: request failed (${err.message})`);
  }
}

async function checkRedirect(from, expectedLocation, note) {
  try {
    const res = await fetchWithTimeout(from);
    const location = res.headers.get('location');
    if (res.status !== 301) {
      fail(`${note}: HTTP ${res.status}, expected 301`);
      return;
    }
    if (location !== expectedLocation) {
      fail(`${note}: Location "${location}", expected "${expectedLocation}"`);
      return;
    }
    pass(`${note}: 301 -> ${location}`);
  } catch (err) {
    fail(`${note}: request failed (${err.message})`);
  }
}

async function checkLegacyRedirects() {
  if (!OLD_BASE_URL) {
    console.log('\nLegacy 301 redirects: skipped (OLD_BASE_URL empty)');
    return;
  }
  console.log('\nLegacy 301 redirects:');
  await checkRedirect(`${OLD_BASE_URL}/`, `${BASE_URL}/`, 'old root');
  await checkRedirect(`${OLD_BASE_URL}/pdf/redact`, `${BASE_URL}/pdf/redact`, 'old deep path');
  await checkRedirect(
    `${OLD_BASE_URL}/pdf/redact-ssn/?utm_source=producthunt`,
    `${BASE_URL}/pdf/redact-ssn/?utm_source=producthunt`,
    'old path keeps query string'
  );
  const oldWww = OLD_BASE_URL.replace('://', '://www.');
  await checkRedirect(`${oldWww}/tools`, `${BASE_URL}/tools`, 'old www subdomain');
}

async function main() {
  console.log(`Checking ${BASE_URL}`);
  console.log('\nPages:');
  for (const path of PAGES) {
    await checkPage(path);
  }
  await checkSitemap();
  await checkRobots();
  await checkLegacyRedirects();

  console.log('');
  if (failures > 0) {
    console.error(`FAILED: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('ALL LIVE CHECKS PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
