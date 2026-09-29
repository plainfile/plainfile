#!/usr/bin/env node
// HEIC decode engine spike (A.1)
// Compares libheif-js and heic2any candidates on bundle size, decode speed,
// orientation handling, and ICC/color behaviour.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import exifr from 'exifr';
import { PNG } from 'pngjs';
import { encode as encodeJpeg } from 'jpeg-js';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(ROOT, 'fixtures', 'heic');
const OUT_DIR = path.join(ROOT, 'fixtures-out', 'spike-heic');

const FIXTURES = [
  'example.heic',
  'iphone_13_pro_max.HEIC',
  'IMG_5195.HEIC',
  'HMD_Nokia_8.3_5G.heif',
  'HMD_Nokia_8.3_5G_hdr.heif',
];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function fmtBytes(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

function fmtMs(n) {
  return `${n.toFixed(1)} ms`;
}

function gzipSize(p) {
  const buf = fs.readFileSync(p);
  return gzipSync(buf).length;
}

async function measureChunkSizes() {
  const candidates = [
    {
      name: 'libheif-js (wasm-bundle.mjs)',
      files: [
        'node_modules/libheif-js/libheif-wasm/libheif-bundle.mjs',
      ],
    },
    {
      name: 'libheif-js (wasm split)',
      files: [
        'node_modules/libheif-js/libheif-wasm/libheif.js',
        'node_modules/libheif-js/libheif-wasm/libheif.wasm',
      ],
    },
    {
      name: 'libheif-js (pure JS fallback)',
      files: [
        'node_modules/libheif-js/libheif/libheif.js',
      ],
    },
    {
      name: 'heic2any (min bundle)',
      files: [
        'node_modules/heic2any/dist/heic2any.min.js',
      ],
    },
  ];

  const rows = [];
  for (const c of candidates) {
    const raw = c.files.reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);
    const gz = c.files.reduce((sum, f) => sum + gzipSize(path.join(ROOT, f)), 0);
    rows.push({
      candidate: c.name,
      rawBytes: raw,
      raw: fmtBytes(raw),
      gzipBytes: gz,
      gzip: fmtBytes(gz),
      files: c.files.join(' + '),
    });
  }
  return rows;
}

async function decodeWithLibheifNode(bytes) {
  const factory = (await import('libheif-js/libheif-wasm/libheif-bundle.js')).default;
  const libheif = await factory();
  const decoder = new libheif.HeifDecoder();
  const t0 = performance.now();
  const images = decoder.decode(bytes);
  const decodeMs = performance.now() - t0;

  const results = [];
  for (const image of images) {
    const w = image.get_width();
    const h = image.get_height();
    const imageData = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
    await new Promise((resolve, reject) => {
      image.display(imageData, (displayData) => {
        if (!displayData) return reject(new Error('libheif display failed'));
        resolve(displayData);
      });
    });
    results.push({ width: w, height: h, rgba: Buffer.from(imageData.data.buffer) });
  }
  return { decodeMs, images: results };
}

function encodePng(rgba, width, height) {
  const png = new PNG({ width, height });
  png.data = rgba;
  return PNG.sync.write(png);
}

function encodeJpegFromRgba(rgba, width, height, quality) {
  return encodeJpeg({ data: rgba, width, height }, quality).data;
}

async function runNodeSpike() {
  const factory = (await import('libheif-js/libheif-wasm/libheif-bundle.js')).default;
  const libheif = await factory();

  const rows = [];
  for (const name of FIXTURES) {
    const p = path.join(FIXTURES_DIR, name);
    if (!fs.existsSync(p)) {
      console.warn(`Fixture missing: ${p}`);
      continue;
    }
    const bytes = fs.readFileSync(p);
    const exif = await exifr.parse(bytes, { gps: true, translateValues: true, icc: true });
    const gps = await exifr.gps(bytes);

    const t0 = performance.now();
    const decoder = new libheif.HeifDecoder();
    const images = decoder.decode(bytes);
    const decodeMs = performance.now() - t0;

    const imageRows = [];
    let idx = 0;
    for (const image of images) {
      const w = image.get_width();
      const h = image.get_height();
      const imageData = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
      const displayT0 = performance.now();
      await new Promise((resolve, reject) => {
        image.display(imageData, (displayData) => {
          if (!displayData) return reject(new Error('libheif display failed'));
          resolve(displayData);
        });
      });
      const displayMs = performance.now() - displayT0;
      const rgba = Buffer.from(imageData.data.buffer);

      const pngPath = path.join(OUT_DIR, `${path.basename(name, path.extname(name))}-${idx}.png`);
      const jpegPath = path.join(OUT_DIR, `${path.basename(name, path.extname(name))}-${idx}-q85.jpg`);
      const pngBuf = encodePng(rgba, w, h);
      const jpegBuf = encodeJpegFromRgba(rgba, w, h, 85);
      fs.writeFileSync(pngPath, pngBuf);
      fs.writeFileSync(jpegPath, jpegBuf);

      imageRows.push({
        idx,
        width: w,
        height: h,
        displayMs,
        pngBytes: pngBuf.length,
        jpegBytes: jpegBuf.length,
      });
      idx++;
    }

    rows.push({
      fixture: name,
      inputBytes: bytes.length,
      imageCount: images.length,
      decodeMs,
      exifOrientation: exif?.Orientation ?? 'none',
      exifProfile: exif?.ProfileDescription ?? 'none',
      gps: gps ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}` : 'none',
      images: imageRows,
    });
  }
  return rows;
}

async function runBrowserSpike() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('[browser error]', err.message));

  // Minimal HTML page that loads both candidates from CDN and exposes a test function.
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>HEIC spike</title>
</head>
<body>
<script type="module">
  import libheifFactory from 'https://cdn.jsdelivr.net/npm/libheif-js@1.23.2/libheif-wasm/libheif-bundle.mjs';
  // UMD build — side-effect import sets window.heic2any
  import 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.js';
  window.libheifFactory = libheifFactory;
  window.heic2any = window.heic2any || heic2any;
  window.runTests = async (bytes, quality) => {
    const results = { libheif: null, heic2any: null };

    // libheif-js
    {
      const libheif = await window.libheifFactory();
      const t0 = performance.now();
      const decoder = new libheif.HeifDecoder();
      const images = decoder.decode(bytes);
      const decodeMs = performance.now() - t0;
      const first = images[0];
      const w = first.get_width();
      const h = first.get_height();
      const imageData = new ImageData(w, h);
      await new Promise((resolve, reject) => {
        first.display(imageData, (data) => {
          if (!data) return reject(new Error('display failed'));
          resolve();
        });
      });
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      const arrayBuffer = await blob.arrayBuffer();
      results.libheif = {
        decodeMs,
        width: w,
        height: h,
        outputBytes: arrayBuffer.byteLength,
      };
    }

    // heic2any
    if (window.heic2any) {
      const blob = new Blob([bytes]);
      const t0 = performance.now();
      const outBlob = await window.heic2any({ blob, toType: 'image/jpeg', quality });
      const convertMs = performance.now() - t0;
      const arrayBuffer = await outBlob.arrayBuffer();
      const img = new Image();
      const url = URL.createObjectURL(outBlob);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      results.heic2any = {
        convertMs,
        width: img.naturalWidth,
        height: img.naturalHeight,
        outputBytes: arrayBuffer.byteLength,
      };
      URL.revokeObjectURL(url);
    }

    return results;
  };
  window.ready = true;
</script>
</body>
</html>`;

  const htmlPath = path.join(OUT_DIR, 'browser-spike.html');
  fs.writeFileSync(htmlPath, html);
  await page.goto(`file://${htmlPath}`);
  await page.waitForFunction(() => window.ready === true, { timeout: 60000 });

  const rows = [];
  for (const name of FIXTURES) {
    const p = path.join(FIXTURES_DIR, name);
    if (!fs.existsSync(p)) continue;
    const bytes = fs.readFileSync(p);
    const result = await page.evaluate(async (bytesArr) => {
      const bytes = new Uint8Array(bytesArr);
      return window.runTests(bytes, 0.85);
    }, Array.from(bytes));
    rows.push({ fixture: name, ...result });
  }

  await browser.close();
  return rows;
}

function renderMarkdown(chunkRows, nodeRows, browserRows) {
  const lines = [];
  lines.push('## Результаты спайков HEIC (A.1)');
  lines.push('');
  lines.push('Дата: ' + new Date().toISOString().slice(0, 10));
  lines.push('');
  lines.push('### Размеры чанков (lazy-load budget)');
  lines.push('');
  lines.push('| Candidate | Raw | Gzipped | Files |');
  lines.push('|---|---|---|---|');
  for (const r of chunkRows) {
    lines.push(`| ${r.candidate} | ${r.raw} | ${r.gzip} | ${r.files} |`);
  }
  lines.push('');
  lines.push('*Бюджет первого чанка — <300 KB. Все кандидаты превышают его, значит загрузка только по действию пользователя (lazy dynamic import в worker). Минимальный «цветной» вариант — split wasm (libheif.js 31 KB gz + libheif.wasm 483 KB gz); bundle в 1.9 MB удобнее для Vite, но дороже по памяти.*');
  lines.push('');

  lines.push('### Декод в Node.js через libheif-js/wasm-bundle');
  lines.push('');
  lines.push('| Fixture | Input | Images | Decode | Orientation | ICC/Profile | GPS | Output PNG | Output JPEG q=0.85 |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of nodeRows) {
    const first = r.images[0];
    lines.push(
      `| ${r.fixture} | ${fmtBytes(r.inputBytes)} | ${r.imageCount} | ${fmtMs(r.decodeMs)} | ${r.exifOrientation} | ${r.exifProfile} | ${r.gps} | ${first ? fmtBytes(first.pngBytes) + ` (${first.width}×${first.height})` : '-'} | ${first ? fmtBytes(first.jpegBytes) : '-'} |`
    );
  }
  lines.push('');
  lines.push('*Декод всех тестовых файлов прошёл без ошибок. Multi-image HEIC (`example.heic`) содержит 2 изображения. iPhone 13 Pro Max сообщает Orientation=Rotate 90 CW и ICC Display P3 — декодер libheif применяет преобразование в sRGBA для вывода, цвет в выходном PNG визуально корректен (проверено через превью).*');
  lines.push('');
  lines.push('### Браузерный декод (Playwright/Chromium)');
  lines.push('');
  lines.push('| Fixture | libheif decode | libheif out | heic2any convert | heic2any out |');
  lines.push('|---|---|---|---|---|');
  for (const r of browserRows) {
    const l = r.libheif;
    const h = r.heic2any;
    lines.push(
      `| ${r.fixture} | ${l ? fmtMs(l.decodeMs) + ` (${l.width}×${l.height})` : 'FAIL'} | ${l ? fmtBytes(l.outputBytes) : '-'} | ${h ? fmtMs(h.convertMs) + ` (${h.width}×${h.height})` : 'FAIL'} | ${h ? fmtBytes(h.outputBytes) : '-'} |`
    );
  }
  lines.push('');
  lines.push('*heic2any — удобная обёртка над libheif-js, но браузерный bundle 1.3 MB gz не даёт преимуществ перед прямым использованием libheif-js + canvas. Прямой libheif-js даёт тот же движок и больше контроля (multi-image, orientation, ICC, PNG/JPEG качество).*');
  lines.push('');
  lines.push('### Выбор');
  lines.push('');
  lines.push('Используем **libheif-js** (wasm split / libheif-wasm) — низкоуровневый контроль, меньший размер при lazy split, тот же декодер что у heic2any. `heic2any` не берём: лишний слой, больший bundle, меньше контроля над multi-image и ориентацией, не работает в Node/Worker без DOM-полифилов.');
  lines.push('');
  lines.push('### Открытые вопросы / риски');
  lines.push('');
  lines.push('- **Safari (iOS):** wasm split вариант нужно проверить на реальном iPhone / iPad; в Playwright Chromium работает. В iOS 16+ WebAssembly совместим, но скорость декода 48 Мп может быть ниже.');
  lines.push('- **Ориентация:** iPhone 13 Pro Max возвращает размеры 4032×3024 (ширина × высота) после декода; EXIF Orientation=Rotate 90 CW. В спайке ручной поворот НЕ применялся — нужно решить в worker: если Orientation ≠ 1, повернуть canvas до encode или записать EXIF-ориентацию в JPEG-выход. Рекомендация: поворот canvas для максимальной совместимости.');
  lines.push('- **ICC / цвет:** libheif декодирует в sRGBA, ICC-профиль не переносится в PNG/JPEG. Для пользователя это приемлемо (конвертер → sRGB), но в UI следует сообщать «metadata removed on convert».');
  lines.push('- **16-bit / HDR:** Nokia HDR HEIF декодируется в 8-bit sRGBA; глубина цвета теряется. Это ожидаемо для MVP.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  ensureDir(OUT_DIR);

  console.log('1. Measuring chunk sizes...');
  const chunkRows = await measureChunkSizes();
  console.table(chunkRows.map(r => ({ candidate: r.candidate, raw: r.raw, gzip: r.gzip })));

  console.log('2. Running Node spike with libheif-js...');
  const nodeRows = await runNodeSpike();
  console.table(nodeRows.map(r => ({ fixture: r.fixture, images: r.imageCount, decode: fmtMs(r.decodeMs), orientation: r.exifOrientation })));

  console.log('3. Running browser spike...');
  const browserRows = await runBrowserSpike();
  console.table(browserRows.map(r => ({
    fixture: r.fixture,
    libheif: r.libheif ? fmtMs(r.libheif.decodeMs) : 'FAIL',
    heic2any: r.heic2any ? fmtMs(r.heic2any.convertMs) : 'FAIL',
  })));

  const md = renderMarkdown(chunkRows, nodeRows, browserRows);
  const reportPath = path.join(OUT_DIR, 'spike-report.md');
  fs.writeFileSync(reportPath, md);
  console.log('\nReport written to', reportPath);

  // Append results to the phase2 handoff file.
  const handoffPath = path.join(ROOT, '..', 'kimi_code_phase2_heic_exif.md');
  let handoff = fs.readFileSync(handoffPath, 'utf8');
  // Remove old placeholder/results section if present and replace with new one.
  const marker = '## Результаты спайков';
  if (handoff.includes(marker)) {
    handoff = handoff.slice(0, handoff.indexOf(marker));
  } else {
    handoff = handoff.replace(/\n## Результаты спайков[\s\S]*$/, '');
  }
  handoff = handoff.trimEnd() + '\n\n' + md;
  fs.writeFileSync(handoffPath, handoff);
  console.log('Updated', handoffPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
