/**
 * IndexNow submitter: tells Bing, Yandex, Seznam, Naver and Yep which URLs changed.
 *
 * Google does NOT participate in IndexNow — for Google use sitemaps and URL Inspection
 * (see scripts/gsc-snapshot.mjs). IndexNow only triggers a recrawl; it does not guarantee indexing.
 *
 * Only changed URLs are submitted. A per-URL content hash is stored in .indexnow-state.json,
 * so a repeat run of an unchanged build submits nothing instead of spamming the endpoint
 * (repeated submissions get HTTP 429 and dilute the signal).
 *
 * Usage:
 *   node scripts/indexnow.mjs --generate-key     # create public/<key>.txt once, then deploy it
 *   node scripts/indexnow.mjs --dry-run          # show what would be submitted
 *   node scripts/indexnow.mjs                    # submit new + changed URLs
 *   node scripts/indexnow.mjs --all              # submit every URL, ignoring the state file
 *   node scripts/indexnow.mjs --urls=https://plainfile.io/,https://plainfile.io/tools
 *   node scripts/indexnow.mjs --include-deleted  # also announce removed URLs
 *
 * Environment:
 *   INDEXNOW_KEY    key to use (otherwise auto-discovered from public/*.txt)
 *   INDEXNOW_HOST   site origin (default: https://plainfile.io)
 *   INDEXNOW_STATE  state file (default: .indexnow-state.json next to package.json)
 *
 * Protocol reference: https://www.indexnow.org/documentation
 *   - key: 8–128 characters, only a–z A–Z 0–9 and "-"
 *   - the key must be served as UTF-8 text at https://<host>/<key>.txt containing the key itself
 *   - POST { host, key, keyLocation, urlList }, up to 10 000 URLs per request
 *   - 200 = submitted, 202 = accepted (key validation pending), 429 = too many requests
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { dirname, resolve, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(APP_DIR, 'dist');
const PUBLIC_DIR = resolve(APP_DIR, 'public');

const HOST = (process.env.INDEXNOW_HOST || 'https://plainfile.io').replace(/\/$/, '');
const STATE_PATH = resolve(APP_DIR, process.env.INDEXNOW_STATE || '.indexnow-state.json');
const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

// ---------- args ----------

function arg(name, fallback = undefined) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const [, value] = hit.split('=');
  return value === undefined ? true : value;
}

const DRY_RUN = Boolean(arg('dry-run', false));
const ALL = Boolean(arg('all', false));
const GENERATE_KEY = Boolean(arg('generate-key', false));
const SKIP_KEY_CHECK = Boolean(arg('skip-key-check', false));
const INCLUDE_DELETED = Boolean(arg('include-deleted', false));
const ENDPOINT = arg('endpoint', 'https://api.indexnow.org/indexnow');
const CHUNK_SIZE = Number(arg('chunk', 100));
const EXPLICIT_URLS = arg('urls', null);

// ---------- key ----------

function discoverKey() {
  if (process.env.INDEXNOW_KEY) {
    return { key: process.env.INDEXNOW_KEY, file: join(PUBLIC_DIR, `${process.env.INDEXNOW_KEY}.txt`) };
  }
  if (!existsSync(PUBLIC_DIR)) return null;
  for (const name of readdirSync(PUBLIC_DIR)) {
    if (!name.endsWith('.txt')) continue;
    const stem = name.slice(0, -4);
    if (!KEY_PATTERN.test(stem)) continue;
    const content = readFileSync(join(PUBLIC_DIR, name), 'utf8').trim();
    if (content === stem) return { key: stem, file: join(PUBLIC_DIR, name) };
  }
  return null;
}

function generateKey() {
  const key = randomBytes(16).toString('hex');
  mkdirSync(PUBLIC_DIR, { recursive: true });
  writeFileSync(join(PUBLIC_DIR, `${key}.txt`), key, 'utf8');
  console.log(`Generated IndexNow key: ${key}`);
  console.log(`Wrote public/${key}.txt — deploy the site so it is served at ${HOST}/${key}.txt`);
  console.log('Then run: node scripts/indexnow.mjs --all');
}

// ---------- urls from dist ----------

function walkHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

function fileToUrl(file) {
  const rel = relative(DIST_DIR, dirname(file));
  if (rel === '' || rel === '.') return `${HOST}/`;
  const path = rel.split(sep).join('/');
  return `${HOST}/${path}`;
}

function collectDistUrls() {
  if (!existsSync(DIST_DIR)) {
    throw new Error('dist/ not found — run npm run build && npm run prerender first');
  }
  const rows = walkHtml(DIST_DIR).map((file) => {
    const bytes = readFileSync(file);
    return {
      url: fileToUrl(file),
      hash: createHash('sha256').update(bytes).digest('hex').slice(0, 16),
    };
  });
  rows.sort((a, b) => a.url.localeCompare(b.url));
  return rows;
}

function loadState() {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8')).urls || {};
  } catch {
    console.warn(`! ${STATE_PATH} is unreadable, treating everything as changed`);
    return {};
  }
}

function saveState(urls) {
  const urlsMap = Object.fromEntries(urls.map((r) => [r.url, r.hash]));
  writeFileSync(
    STATE_PATH,
    JSON.stringify({ host: HOST, updatedAt: new Date().toISOString(), urls: urlsMap }, null, 2),
    'utf8'
  );
}

// ---------- submit ----------

async function verifyKeyFile(key) {
  const keyLocation = `${HOST}/${key}.txt`;
  try {
    const res = await fetch(keyLocation, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { ok: false, reason: `${keyLocation} returned HTTP ${res.status}` };
    const body = (await res.text()).trim();
    if (body !== key) return { ok: false, reason: `${keyLocation} does not contain the key` };
    return { ok: true, keyLocation };
  } catch (err) {
    return { ok: false, reason: `${keyLocation} unreachable (${err.message})` };
  }
}

function explain(status) {
  switch (status) {
    case 200: return 'submitted';
    case 202: return 'accepted (key validation pending)';
    case 400: return 'bad request — invalid format';
    case 403: return 'forbidden — key file missing or key not inside it';
    case 422: return 'unprocessable — URL does not belong to the host';
    case 429: return 'too many requests — you are submitting too often';
    default: return `unexpected status`;
  }
}

async function submit(urls, key, keyLocation) {
  const accepted = [];
  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    const chunk = urls.slice(i, i + CHUNK_SIZE);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST.replace(/^https?:\/\//, ''), key, keyLocation, urlList: chunk }),
    });
    const note = explain(res.status);
    if (res.status === 200 || res.status === 202) {
      accepted.push(...chunk);
      console.log(`  ✓ ${chunk.length} URL(s) — HTTP ${res.status} ${note}`);
    } else {
      console.error(`  ✗ ${chunk.length} URL(s) — HTTP ${res.status} ${note}`);
      if (res.status !== 429) {
        const body = await res.text();
        if (body) console.error(`    ${body.slice(0, 300)}`);
      }
    }
  }
  return accepted;
}

// ---------- main ----------

async function main() {
  if (GENERATE_KEY) {
    generateKey();
    return;
  }

  const found = discoverKey();
  if (!found) {
    console.error(
      'No IndexNow key found.\n' +
        `  Expected public/<key>.txt containing the key itself (8–128 chars, a–z A–Z 0–9 "-").\n` +
        '  Create one: node scripts/indexnow.mjs --generate-key'
    );
    process.exit(1);
  }
  const { key } = found;
  console.log(`IndexNow → ${HOST}`);
  console.log(`  endpoint : ${ENDPOINT}`);
  console.log(`  key      : ${key}`);

  if (!DRY_RUN && !SKIP_KEY_CHECK) {
    const check = await verifyKeyFile(key);
    if (!check.ok) {
      console.error(`\nKey check failed: ${check.reason}`);
      console.error('Deploy the key file first (public/<key>.txt must be live at the site root), or pass --skip-key-check.');
      process.exit(1);
    }
    console.log(`  key file : ok (${check.keyLocation})`);
  }
  const keyLocation = `${HOST}/${key}.txt`;

  let urls;
  let removed = [];
  if (EXPLICIT_URLS) {
    urls = String(EXPLICIT_URLS).split(',').map((u) => u.trim()).filter(Boolean);
    console.log(`\nExplicit URL list: ${urls.length}`);
  } else {
    const current = collectDistUrls();
    const state = ALL ? {} : loadState();
    urls = current.filter((r) => state[r.url] !== r.hash).map((r) => r.url);
    removed = Object.keys(state).filter((url) => !current.some((r) => r.url === url));
    console.log(`\nURLs in dist/ : ${current.length}`);
    console.log(`  new/changed : ${urls.length}`);
    console.log(`  unchanged   : ${current.length - urls.length}`);
    if (removed.length) console.log(`  removed     : ${removed.length}${INCLUDE_DELETED ? ' (will be announced)' : ' (skipped, use --include-deleted)'}`);
  }

  const toSubmit = INCLUDE_DELETED ? [...urls, ...removed] : urls;
  if (toSubmit.length === 0) {
    console.log('\nNothing to submit — every URL matches the stored hash.');
    return;
  }

  for (const url of toSubmit) console.log(`  · ${url}`);

  if (DRY_RUN) {
    console.log(`\n--dry-run: would POST ${toSubmit.length} URL(s) to ${ENDPOINT}. Nothing was sent.`);
    return;
  }

  console.log('');
  const accepted = await submit(toSubmit, key, keyLocation);
  const acceptedSet = new Set(accepted);
  if (accepted.length > 0 && !EXPLICIT_URLS) {
    // Record a hash only when that exact content was accepted now, or was already stored before.
    // A failed chunk keeps its old hash, so the next run retries it instead of silently skipping it.
    const prevState = ALL ? {} : loadState();
    const currentAfter = collectDistUrls();
    saveState(
      currentAfter
        .map((r) => ({
          url: r.url,
          hash: acceptedSet.has(r.url) || prevState[r.url] === r.hash ? r.hash : prevState[r.url],
        }))
        .filter((r) => Boolean(r.hash))
    );
    console.log(`State updated: ${STATE_PATH}`);
  }
  console.log(`\nDone: ${accepted.length}/${toSubmit.length} URL(s) accepted.`);
  if (accepted.length < toSubmit.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nindexnow failed: ${err.message}`);
  process.exit(1);
});
