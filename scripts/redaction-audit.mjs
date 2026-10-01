/**
 * Redaction audit: measures whether the sensitive strings in a PDF are actually gone.
 *
 * This is the measurement half of the "we tested N redaction tools" research. It answers one
 * question objectively: after a tool has "redacted" the document, can the removed values still
 * be recovered?
 *
 * Three independent checks per file:
 *   1. text layer   — MuPDF text extraction (what copy-paste or any PDF parser would see)
 *   2. metadata     — the Info dictionary (title, author, subject, keywords, producer…)
 *   3. raw bytes    — a literal scan of the file, which also catches XMP streams and
 *                     uncompressed content streams. Absence here is not proof of removal
 *                     (streams may be compressed), but presence is proof of a leak.
 *
 * Usage:
 *   node scripts/redaction-audit.mjs fixtures/audit/audit-fixture-naive.pdf
 *   node scripts/redaction-audit.mjs output/*.pdf --json=results/audit.json
 *   node scripts/redaction-audit.mjs file.pdf --tokens="ACME-1,123-45-6789"
 *   node scripts/redaction-audit.mjs file.pdf --quiet          # summary line only
 *
 * Exit code 0 = every file is clean, 1 = at least one file still leaks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mupdf from 'mupdf';
import { TOKENS, TOKEN_VALUES } from './audit-tokens.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name, fallback = undefined) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const [, value] = hit.split('=');
  return value === undefined ? true : value;
}

const JSON_OUT = arg('json', null);
const QUIET = Boolean(arg('quiet', false));
const CUSTOM_TOKENS = arg('tokens', null);
const FILES = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const TOKEN_SET = CUSTOM_TOKENS
  ? String(CUSTOM_TOKENS).split(',').map((v) => ({ id: v, value: v.trim(), kind: 'custom' })).filter((t) => t.value)
  : TOKENS;

const INFO_KEYS = [
  ['title', mupdf.Document.META_INFO_TITLE],
  ['author', mupdf.Document.META_INFO_AUTHOR],
  ['subject', mupdf.Document.META_INFO_SUBJECT],
  ['keywords', mupdf.Document.META_INFO_KEYWORDS],
  ['creator', mupdf.Document.META_INFO_CREATOR],
  ['producer', mupdf.Document.META_INFO_PRODUCER],
];

function extractText(doc) {
  const parts = [];
  for (let i = 0; i < doc.countPages(); i++) {
    parts.push(doc.loadPage(i).toStructuredText().asText());
  }
  return parts.join('\n');
}

function readInfo(doc) {
  const info = {};
  for (const [name, key] of INFO_KEYS) {
    try {
      info[name] = doc.getMetaData(key) || '';
    } catch {
      info[name] = '';
    }
  }
  return info;
}

function catalogFlags(doc) {
  const flags = { xmp: false, embeddedFiles: false, javascript: false };
  try {
    const root = doc.getTrailer().get('Root');
    if (!root || root.isNull()) return flags;
    const metadata = root.get('Metadata');
    flags.xmp = Boolean(metadata && !metadata.isNull());
    const names = root.get('Names');
    flags.embeddedFiles = Boolean(names && !names.isNull() && !names.get('EmbeddedFiles')?.isNull?.());
    flags.javascript = Boolean(root.get('OpenAction') && !root.get('OpenAction').isNull());
  } catch {
    // best effort only
  }
  return flags;
}

function countAnnotations(doc) {
  let total = 0;
  for (let i = 0; i < doc.countPages(); i++) {
    try {
      total += doc.loadPage(i).getAnnotations().length;
    } catch {
      // ignore
    }
  }
  return total;
}

/**
 * Lowercase and drop everything that is not a letter or digit, so a value that a tool
 * re-flowed or re-encoded ("123-45-\n6789", "ACCT 4417 …") still matches the original.
 * Without this the audit could report a false CLEAN, which is the dangerous direction of error.
 */
function normalize(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findIn(value, tokens) {
  const raw = (value || '').toLowerCase();
  const norm = normalize(value);
  const hits = [];
  for (const t of tokens) {
    if (raw.includes(t.value.toLowerCase())) {
      hits.push({ ...t, mode: 'literal' });
      continue;
    }
    const needle = normalize(t.value);
    // Short needles (e.g. a bare date) would match by coincidence after normalisation.
    if (needle.length >= 8 && norm.includes(needle)) hits.push({ ...t, mode: 'reflowed' });
  }
  return hits;
}

function findInBytes(bytes, tokens) {
  const buf = Buffer.from(bytes);
  const hits = [];
  for (const t of tokens) {
    const utf8 = Buffer.from(t.value, 'utf8');
    const utf16 = Buffer.from(t.value, 'utf16le');
    if (buf.includes(utf8) || buf.includes(utf16)) hits.push({ ...t, mode: 'literal' });
  }
  return hits;
}

function displayPath(file) {
  const rel = path.relative(process.cwd(), file);
  return rel.startsWith('..') ? file : rel;
}

async function auditFile(file) {
  const bytes = fs.readFileSync(file);
  const doc = await mupdf.PDFDocument.openDocument(new Uint8Array(bytes), 'application/pdf');

  const text = extractText(doc);
  const info = readInfo(doc);
  const infoBlob = Object.values(info).join('\n');
  const flags = catalogFlags(doc);
  const annotations = countAnnotations(doc);

  const textHits = findIn(text, TOKEN_SET);
  const metadataHits = findIn(infoBlob, TOKEN_SET);
  const rawHits = findInBytes(bytes, TOKEN_SET);

  const leaked = new Set([...textHits, ...metadataHits, ...rawHits].map((t) => t.id));
  const verdict = leaked.size > 0 ? 'LEAK' : 'CLEAN';

  return {
    file: displayPath(file),
    bytes: bytes.length,
    pages: doc.countPages(),
    verdict,
    counts: {
      tokens: TOKEN_SET.length,
      textLeaks: textHits.length,
      metadataLeaks: metadataHits.length,
      rawLeaks: rawHits.length,
      annotations,
    },
    textLeaks: textHits,
    metadataLeaks: metadataHits,
    rawLeaks: rawHits,
    flags,
    info,
  };
}

function printReport(r) {
  const label = (hit) => `${hit.value}${hit.mode === 'reflowed' ? '  (matched after re-flow)' : ''}`;

  console.log(`\n${r.file}`);
  console.log(`  pages           ${r.pages}   bytes ${r.bytes}`);
  console.log(
    `  text layer      ${r.counts.textLeaks}/${r.counts.tokens} tokens still extractable`
  );
  console.log(`  metadata        ${r.counts.metadataLeaks}/${r.counts.tokens} tokens still present`);
  console.log(`  raw bytes       ${r.counts.rawLeaks}/${r.counts.tokens} tokens present as literals`);
  console.log(`  annotations     ${r.counts.annotations}`);
  console.log(`  xmp metadata    ${r.flags.xmp ? 'present' : 'none'}`);
  console.log(`  embedded files  ${r.flags.embeddedFiles ? 'PRESENT' : 'none'}`);
  console.log(`  verdict         ${r.verdict}`);

  if (r.textLeaks.length > 0) {
    console.log('\n  recoverable from the text layer (copy-paste):');
    for (const hit of r.textLeaks) console.log(`    · ${label(hit)}`);
  }
  if (r.metadataLeaks.length > 0) {
    console.log('\n  still present in document metadata:');
    for (const hit of r.metadataLeaks) console.log(`    · ${hit.value}`);
  }
  const textIds = new Set(r.textLeaks.map((h) => h.id));
  const rawOnly = r.rawLeaks.filter((h) => !textIds.has(h.id));
  if (rawOnly.length > 0) {
    console.log('\n  present as literals in the file (often XMP or an uncompressed stream):');
    for (const hit of rawOnly) console.log(`    · ${hit.value}`);
  }
  if (r.flags.xmp) {
    console.log('\n  note: an XMP metadata stream is still attached to the document.');
  }
}

async function main() {
  if (FILES.length === 0) {
    console.error(
      'Usage: node scripts/redaction-audit.mjs <file.pdf> [more.pdf ...] [--json=out.json] [--tokens=a,b]'
    );
    console.error('Create a test document first: npm run audit:fixture');
    process.exit(2);
  }

  const results = [];
  for (const file of FILES) {
    if (!fs.existsSync(file)) {
      console.error(`! not found: ${file}`);
      results.push({ file, verdict: 'ERROR', counts: { tokens: TOKEN_SET.length } });
      continue;
    }
    try {
      const result = await auditFile(file);
      results.push(result);
      if (QUIET) console.log(`${result.verdict.padEnd(5)} ${result.file}`);
      else printReport(result);
    } catch (err) {
      console.error(`! ${file}: ${err.message}`);
      results.push({ file, verdict: 'ERROR', counts: { tokens: TOKEN_SET.length } });
    }
  }

  const leaks = results.filter((r) => r.verdict === 'LEAK');
  const errors = results.filter((r) => r.verdict === 'ERROR');

  console.log('\n========================================');
  for (const r of results) {
    const c = r.counts;
    const detail = c.textLeaks === undefined
      ? ''
      : ` text ${c.textLeaks}/${c.tokens}, metadata ${c.metadataLeaks}/${c.tokens}, raw ${c.rawLeaks}/${c.tokens}`;
    console.log(`${r.verdict.padEnd(5)} ${r.file}${detail}`);
  }
  console.log(`\n${results.length - leaks.length - errors.length}/${results.length} clean, ${leaks.length} leaking, ${errors.length} unreadable`);

  if (JSON_OUT) {
    fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true });
    fs.writeFileSync(
      path.resolve(JSON_OUT),
      JSON.stringify({ generatedAt: new Date().toISOString(), tokens: TOKEN_SET, results }, null, 2),
      'utf8'
    );
    console.log(`JSON written to ${JSON_OUT}`);
  }

  if (leaks.length > 0 || errors.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
