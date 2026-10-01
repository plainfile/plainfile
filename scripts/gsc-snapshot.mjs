/**
 * Google Search Console snapshot: indexing state + performance baseline.
 *
 * Writes a dated snapshot into content/seo-reports/<YYYY-MM-DD>/ and appends a row
 * to content/seo-reports/history.csv so week-over-week comparison is a diff, not a memory exercise.
 *
 * Zero dependencies: the service-account JWT is signed with node:crypto, the API is called
 * with plain fetch. No googleapis, no google-auth-library.
 *
 * Usage:
 *   node scripts/gsc-snapshot.mjs                    # full snapshot (inspection + performance + sitemaps)
 *   node scripts/gsc-snapshot.mjs --dry-run          # print the plan, no API calls, no credentials needed
 *   node scripts/gsc-snapshot.mjs --only=inspection  # inspection | performance | sitemaps
 *   node scripts/gsc-snapshot.mjs --days=7 --end=2026-09-28
 *   node scripts/gsc-snapshot.mjs --source=dist      # take URLs from dist/sitemap.xml instead of the live site
 *   node scripts/gsc-snapshot.mjs --urls=https://plainfile.io/,https://plainfile.io/tools
 *
 * Environment:
 *   GSC_CREDENTIALS  path to the service-account JSON (default: ./gsc-service-account.json)
 *   GSC_SITE         property, URL-prefix or domain (default: sc-domain:plainfile.io)
 *   GSC_OUT          output root (default: ../content/seo-reports)
 *   BASE_URL         site origin used by --source=live (default: https://plainfile.io)
 *
 * One-time setup (see content/seo-baseline.md):
 *   1. console.cloud.google.com -> new project -> enable "Google Search Console API"
 *   2. create a service account -> key -> JSON -> save as app/gsc-service-account.json (gitignored)
 *   3. Search Console -> Settings -> Users and permissions -> add the service-account e-mail as Full or Restricted
 *
 * Quotas respected on purpose: URL Inspection allows 2000/day and 600/minute per site
 * (https://developers.google.com/webmaster-tools/limits), so requests are spaced out.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, '..');

const CREDENTIALS_PATH = resolve(APP_DIR, process.env.GSC_CREDENTIALS || 'gsc-service-account.json');
const SITE = process.env.GSC_SITE || 'sc-domain:plainfile.io';
const OUT_ROOT = resolve(APP_DIR, process.env.GSC_OUT || '../content/seo-reports');
const BASE_URL = (process.env.BASE_URL || 'https://plainfile.io').replace(/\/$/, '');

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const API = 'https://www.googleapis.com/webmasters/v3';

// ---------- args ----------

function arg(name, fallback = undefined) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const [, value] = hit.split('=');
  return value === undefined ? true : value;
}

const DRY_RUN = Boolean(arg('dry-run', false));
const ONLY = arg('only', null);
const DAYS = Number(arg('days', 28));
const DELAY_MS = Number(arg('delay', 250));
const SOURCE = arg('source', 'live');
const EXPLICIT_URLS = arg('urls', null);

// Google finalises data with a ~2 day lag, so a "last 28 days" window ends 2 days back
// instead of including two days of guaranteed zeros.
function isoDate(d) {
  return d.toISOString().split('T')[0];
}
function defaultWindow(days) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

const WINDOW = {
  startDate: arg('start', defaultWindow(DAYS).startDate),
  endDate: arg('end', defaultWindow(DAYS).endDate),
};

// ---------- auth ----------

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken(credentials) {
  const tokenUri = credentials.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(credentials.private_key, 'base64url');

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: HTTP ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.access_token;
}

function loadCredentials() {
  if (!existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `service-account JSON not found at ${CREDENTIALS_PATH}\n` +
        `  Create one (see content/seo-baseline.md) or point GSC_CREDENTIALS at it.`
    );
  }
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
  for (const field of ['client_email', 'private_key']) {
    if (!credentials[field]) throw new Error(`service-account JSON is missing "${field}"`);
  }
  return credentials;
}

// ---------- http helpers ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiFetch(url, init, { attempt = 1, retries = 4 } = {}) {
  const res = await fetch(url, init);
  if ((res.status === 429 || res.status >= 500) && attempt <= retries) {
    const backoff = 1000 * 2 ** (attempt - 1);
    console.warn(`  ! HTTP ${res.status}, retrying in ${backoff}ms (attempt ${attempt}/${retries})`);
    await sleep(backoff);
    return apiFetch(url, init, { attempt: attempt + 1, retries });
  }
  return res;
}

// ---------- url discovery ----------

function parseLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].trim());
}

async function loadUrls() {
  if (EXPLICIT_URLS) {
    return String(EXPLICIT_URLS).split(',').map((u) => u.trim()).filter(Boolean);
  }
  if (SOURCE === 'dist') {
    const path = resolve(APP_DIR, 'dist/sitemap.xml');
    if (!existsSync(path)) throw new Error(`dist/sitemap.xml not found — run npm run build first`);
    return parseLocs(readFileSync(path, 'utf8'));
  }
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseLocs(await res.text());
  } catch (err) {
    const path = resolve(APP_DIR, 'dist/sitemap.xml');
    if (existsSync(path)) {
      console.warn(`! live sitemap unavailable (${err.message}); falling back to dist/sitemap.xml`);
      return parseLocs(readFileSync(path, 'utf8'));
    }
    throw new Error(`could not load URLs: live sitemap failed (${err.message}) and no dist/sitemap.xml`);
  }
}

// ---------- api calls ----------

async function inspectUrl(token, url) {
  const res = await apiFetch(INSPECT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE, languageCode: 'en-US' }),
  });
  if (!res.ok) {
    return { url, error: `HTTP ${res.status} ${(await res.text()).slice(0, 200)}` };
  }
  const json = await res.json();
  const s = json.inspectionResult?.indexStatusResult || {};
  const rich = json.inspectionResult?.richResultsResult || {};
  return {
    url,
    verdict: s.verdict || '',
    coverageState: s.coverageState || '',
    indexingState: s.indexingState || '',
    pageFetchState: s.pageFetchState || '',
    robotsTxtState: s.robotsTxtState || '',
    crawledAs: s.crawledAs || '',
    lastCrawlTime: s.lastCrawlTime || '',
    googleCanonical: s.googleCanonical || '',
    userCanonical: s.userCanonical || '',
    sitemaps: (s.sitemap || []).join(' '),
    richResultsVerdict: rich.verdict || '',
    richResultsTypes: (rich.detectedItems || []).map((i) => i.richResultType).join(' '),
  };
}

async function searchAnalytics(token, dimensions, rowLimit = 5000) {
  const site = encodeURIComponent(SITE);
  const res = await apiFetch(`${API}/sites/${site}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: WINDOW.startDate,
      endDate: WINDOW.endDate,
      dimensions,
      rowLimit,
      type: 'web',
      dataState: 'final',
    }),
  });
  if (!res.ok) throw new Error(`searchAnalytics(${dimensions.join('+')}) HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return (json.rows || []).map((row) => ({
    keys: row.keys || [],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

async function loadSitemaps(token) {
  const site = encodeURIComponent(SITE);
  const res = await apiFetch(`${API}/sites/${site}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`sitemaps HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return (json.sitemap || []).map((s) => ({
    path: s.path,
    lastSubmitted: s.lastSubmitted || '',
    lastDownloaded: s.lastDownloaded || '',
    isPending: s.isPending ?? '',
    isSitemapsIndex: s.isSitemapsIndex ?? '',
    warnings: s.warnings ?? 0,
    errors: s.errors ?? 0,
    contents: (s.contents || []).map((c) => `${c.type}:${c.submitted}`).join(' '),
  }));
}

// ---------- output ----------

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, columns) {
  const head = columns.join(',');
  const body = rows.map((row) => columns.map((c) => csvCell(row[c])).join(',')).join('\n');
  return `${head}\n${body}\n`;
}

function pct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function summarizeInspection(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = row.error ? `ERROR: ${row.error.slice(0, 60)}` : row.coverageState || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function writeReports({ urls, inspection, performance, sitemaps, totals }) {
  const dir = resolve(OUT_ROOT, isoDate(new Date()));
  mkdirSync(dir, { recursive: true });

  const written = [];

  if (inspection) {
    writeFileSync(
      resolve(dir, 'url-inspection.csv'),
      toCsv(inspection, [
        'url', 'verdict', 'coverageState', 'indexingState', 'pageFetchState', 'robotsTxtState',
        'crawledAs', 'lastCrawlTime', 'googleCanonical', 'userCanonical', 'sitemaps',
        'richResultsVerdict', 'richResultsTypes', 'error',
      ]),
      'utf8'
    );
    written.push('url-inspection.csv');
  }

  if (performance) {
    for (const [name, rows] of Object.entries(performance)) {
      const columns = ['key', 'clicks', 'impressions', 'ctr', 'position'];
      const flat = rows.map((r) => ({
        key: r.keys.join(' / '),
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: (r.ctr * 100).toFixed(2),
        position: r.position.toFixed(1),
      }));
      writeFileSync(resolve(dir, `performance-${name}.csv`), toCsv(flat, columns), 'utf8');
      written.push(`performance-${name}.csv`);
    }
  }

  if (sitemaps) {
    writeFileSync(
      resolve(dir, 'sitemaps.csv'),
      toCsv(sitemaps, ['path', 'lastSubmitted', 'lastDownloaded', 'isPending', 'warnings', 'errors', 'contents']),
      'utf8'
    );
    written.push('sitemaps.csv');
  }

  const counts = inspection ? summarizeInspection(inspection) : new Map();
  const indexed = counts.get('Submitted and indexed') || 0;

  const summary = [
    `# GSC snapshot — ${isoDate(new Date())}`,
    '',
    `- Property: \`${SITE}\``,
    `- Window: ${WINDOW.startDate} … ${WINDOW.endDate} (${DAYS} days)`,
    `- URLs in sitemap: ${urls.length}`,
    '',
    '## Performance',
    '',
    totals
      ? `- Clicks: **${totals.clicks}** · Impressions: **${totals.impressions}** · CTR: ${pct(totals.ctr)} · Avg position: ${totals.position.toFixed(1)}`
      : '- not collected in this run',
    '',
    '## Indexing',
    '',
    ...(inspection
      ? [
          `- Indexed: **${indexed} / ${urls.length}**`,
          '',
          '| coverageState | URLs |',
          '|---|---|',
          ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
        ]
      : ['- not collected in this run']),
    '',
    '## Reminder',
    '',
    '- `Discovered — currently not indexed` is expected for a young domain: Google knows the URL but has not fetched it yet.',
    '- `Crawled — currently not indexed` and canonical mismatches are the buckets worth acting on.',
    '',
  ].join('\n');

  writeFileSync(resolve(dir, 'summary.md'), summary, 'utf8');
  written.push('summary.md');

  // Append-only trend line: one row per run, so movement is visible without re-reading CSVs.
  const historyPath = resolve(OUT_ROOT, 'history.csv');
  const historyHeader = 'date,window_start,window_end,urls,indexed,clicks,impressions,ctr,position,discovered_not_indexed,crawled_not_indexed\n';
  if (!existsSync(historyPath)) mkdirSync(OUT_ROOT, { recursive: true });
  if (!existsSync(historyPath)) writeFileSync(historyPath, historyHeader, 'utf8');
  appendFileSync(
    historyPath,
    [
      isoDate(new Date()),
      WINDOW.startDate,
      WINDOW.endDate,
      urls.length,
      inspection ? indexed : '',
      totals ? totals.clicks : '',
      totals ? totals.impressions : '',
      totals ? (totals.ctr * 100).toFixed(2) : '',
      totals ? totals.position.toFixed(1) : '',
      inspection ? counts.get('Discovered - currently not indexed') || 0 : '',
      inspection ? counts.get('Crawled - currently not indexed') || 0 : '',
    ].join(',') + '\n',
    'utf8'
  );
  written.push('history.csv (appended)');

  return { dir, written, indexed, counts };
}

// ---------- main ----------

async function main() {
  const urls = await loadUrls();

  console.log('GSC snapshot');
  console.log(`  property : ${SITE}`);
  console.log(`  window   : ${WINDOW.startDate} … ${WINDOW.endDate}`);
  console.log(`  urls     : ${urls.length}`);
  console.log(`  only     : ${ONLY || 'all'}`);

  if (DRY_RUN) {
    console.log('\n--dry-run: no API calls, no credentials needed.\n');
    console.log(`Would inspect ${urls.length} URLs (spaced ${DELAY_MS}ms apart):`);
    for (const url of urls) console.log(`  · ${url}`);
    console.log(`\nWould query searchAnalytics for: date, query, page, country, device`);
    console.log(`Would fetch the sitemap list for ${SITE}`);
    console.log(`Would write ${resolve(OUT_ROOT, isoDate(new Date()))}/`);
    return;
  }

  const credentials = loadCredentials();
  const token = await getAccessToken(credentials);
  console.log(`  auth     : ok (${credentials.client_email})`);

  const wantInspection = !ONLY || ONLY === 'inspection';
  const wantPerformance = !ONLY || ONLY === 'performance';
  const wantSitemaps = !ONLY || ONLY === 'sitemaps';

  let inspection = null;
  if (wantInspection) {
    console.log(`\nURL inspection (${urls.length} URLs, ~${Math.round((urls.length * DELAY_MS) / 1000)}s):`);
    inspection = [];
    for (const [i, url] of urls.entries()) {
      const row = await inspectUrl(token, url);
      inspection.push(row);
      const state = row.error ? `ERROR ${row.error}` : row.coverageState || row.verdict;
      console.log(`  [${String(i + 1).padStart(2)}/${urls.length}] ${url.replace(BASE_URL, '') || '/'} — ${state}`);
      if (i < urls.length - 1) await sleep(DELAY_MS);
    }
  }

  let performance = null;
  let totals = null;
  if (wantPerformance) {
    console.log('\nPerformance:');
    performance = {};
    for (const [name, dimensions] of [
      ['dates', ['date']],
      ['queries', ['query']],
      ['pages', ['page']],
      ['countries', ['country']],
      ['devices', ['device']],
    ]) {
      performance[name] = await searchAnalytics(token, dimensions);
      console.log(`  ${name.padEnd(10)} ${performance[name].length} row(s)`);
    }
    totals = performance.dates.reduce(
      (acc, row) => ({
        clicks: acc.clicks + row.clicks,
        impressions: acc.impressions + row.impressions,
        ctr: 0,
        position: 0,
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );
    totals.ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
    const weighted = performance.dates.reduce(
      (acc, row) => acc + row.position * row.impressions,
      0
    );
    totals.position = totals.impressions ? weighted / totals.impressions : 0;
    console.log(
      `  totals     ${totals.clicks} clicks, ${totals.impressions} impressions, CTR ${pct(totals.ctr)}, avg position ${totals.position.toFixed(1)}`
    );
  }

  let sitemaps = null;
  if (wantSitemaps) {
    console.log('\nSitemaps:');
    sitemaps = await loadSitemaps(token);
    if (sitemaps.length === 0) console.log('  (none reported)');
    for (const s of sitemaps) {
      console.log(`  ${s.path} — last downloaded ${s.lastDownloaded || 'never'}, warnings ${s.warnings}, errors ${s.errors}`);
    }
  }

  const result = writeReports({ urls, inspection, performance, sitemaps, totals });
  console.log(`\nWrote ${result.written.length} file(s) to ${result.dir}:`);
  for (const file of result.written) console.log(`  · ${file}`);
  if (inspection) {
    console.log(`\nIndexed: ${result.indexed}/${urls.length}`);
    for (const [state, count] of [...result.counts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(3)}  ${state}`);
    }
  }
}

main().catch((err) => {
  console.error(`\ngsc-snapshot failed: ${err.message}`);
  process.exit(1);
});
