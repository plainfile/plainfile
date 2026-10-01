/**
 * Post-deploy smoke checks for the live site.
 *
 * The page list is taken from the sitemap, not hardcoded, so it can no longer go stale:
 *   - expected = dist/sitemap.xml (what you just built and intended to deploy)
 *   - actual   = the live sitemap.xml
 * Any difference between the two sets is a failure, then every live page gets its metadata checked.
 *
 * Usage:
 *   node scripts/check-live.mjs
 *   BASE_URL=https://staging.plainfile.io node scripts/check-live.mjs   # check another host
 *   OLD_BASE_URL= node scripts/check-live.mjs                           # skip legacy-domain 301 checks
 *   node scripts/check-live.mjs --concurrency=8                         # parallel page checks
 *   node scripts/check-live.mjs --skip-dist                             # expect-list = live sitemap only
 *
 * Exit code 0 = all checks passed, 1 = at least one failure.
 * Designed for the deploy pipeline: no dependencies, plain Node fetch.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_SITEMAP = resolve(__dirname, '../dist/sitemap.xml');

function arg(name, fallback = undefined) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const [, value] = hit.split('=');
  return value === undefined ? true : value;
}

const BASE_URL = (process.env.BASE_URL || 'https://plainfile.io').replace(/\/$/, '');
const OLD_BASE_URL = process.env.OLD_BASE_URL === undefined
  ? 'https://quietkit.io'
  : process.env.OLD_BASE_URL.replace(/\/$/, '');
const CONCURRENCY = Number(arg('concurrency', 4));
const SKIP_DIST = Boolean(arg('skip-dist', false));

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

function locsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].trim());
}

/** Absolute URL -> the same path shape used by routes-manifest ('/' for the root). */
function urlToPath(url, base) {
  if (url === `${base}/` || url === base) return '/';
  return url.startsWith(base) ? url.slice(base.length) : url;
}

function loadExpectedPaths() {
  if (SKIP_DIST || !existsSync(DIST_SITEMAP)) {
    if (!SKIP_DIST) console.warn(`! ${DIST_SITEMAP} not found — build first to compare against your own output`);
    return null;
  }
  return locsFromSitemap(readFileSync(DIST_SITEMAP, 'utf8')).map((u) => urlToPath(u, BASE_URL));
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
  const problems = [];

  if (titles !== 1) problems.push(`${titles} <title> tags (expected 1)`);
  if (descriptions !== 1) problems.push(`${descriptions} meta descriptions (expected 1)`);
  if (canonicals.length !== 1) problems.push(`${canonicals.length} canonical links (expected 1)`);
  else if (canonicals[0] !== expectedCanonical) {
    problems.push(`canonical "${canonicals[0]}", expected "${expectedCanonical}"`);
  }
  if (ogUrls.length !== 1 || ogUrls[0] !== expectedCanonical) {
    problems.push(`og:url mismatch: ${ogUrls.join(', ') || 'none'} (expected ${expectedCanonical})`);
  }
  if (html.includes('quietkit')) problems.push('page still references "quietkit"');
  // A prerendered page must ship real content, not just the SPA shell.
  if (html.length < 2000) problems.push(`suspiciously small HTML (${html.length} bytes) — prerender may have failed`);

  if (problems.length === 0) pass(`${path}: title, description, canonical, og:url ok`);
  else fail(`${path}: ${problems.join('; ')}`);
}

async function checkSitemapAndSet(expectedPaths) {
  console.log('\nSitemap:');
  let livePaths;
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/sitemap.xml`);
    if (res.status !== 200) {
      fail(`sitemap.xml: HTTP ${res.status}`);
      return null;
    }
    const locs = locsFromSitemap(await res.text());
    const wrongDomain = locs.filter((l) => !l.startsWith(BASE_URL));
    wrongDomain.length === 0
      ? pass('sitemap.xml: all URLs on the expected domain')
      : fail(`sitemap.xml: URLs on wrong domain: ${wrongDomain.join(', ')}`);
    livePaths = locs.map((u) => urlToPath(u, BASE_URL));
    pass(`sitemap.xml: ${livePaths.length} URLs`);
  } catch (err) {
    fail(`sitemap.xml: request failed (${err.message})`);
    return null;
  }

  if (!expectedPaths) {
    console.log('  · no dist/sitemap.xml to compare against — checking the live set as-is');
    return livePaths;
  }

  const missing = expectedPaths.filter((p) => !livePaths.includes(p));
  const extra = livePaths.filter((p) => !expectedPaths.includes(p));
  const duplicates = livePaths.filter((p, i) => livePaths.indexOf(p) !== i);

  missing.length === 0
    ? pass(`all ${expectedPaths.length} built URLs are live`)
    : fail(`built but not live: ${missing.join(', ')}`);
  extra.length === 0
    ? pass('no URLs live that are missing from the build')
    : fail(`live but not in the build (stale deploy or stale dist): ${extra.join(', ')}`);
  if (duplicates.length > 0) fail(`duplicate entries in sitemap: ${[...new Set(duplicates)].join(', ')}`);

  return livePaths;
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

/** Run tasks with a fixed concurrency so 30+ pages do not open 30+ sockets at once. */
async function pool(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    let item;
    while ((item = queue.shift()) !== undefined) {
      await worker(item);
    }
  });
  await Promise.all(runners);
}

async function main() {
  console.log(`Checking ${BASE_URL}`);

  const expectedPaths = loadExpectedPaths();
  const livePaths = await checkSitemapAndSet(expectedPaths);

  const pages = livePaths ?? expectedPaths ?? [];
  if (pages.length === 0) {
    fail('no pages to check — sitemap unreadable and no local build');
  } else {
    console.log(`\nPage metadata (${pages.length} pages, concurrency ${CONCURRENCY}):`);
    await pool(pages, CONCURRENCY, checkPage);
  }

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
