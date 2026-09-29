import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mupdf from 'mupdf';
import exifr from 'exifr';

// Safety guard: this verifier must never send file bytes over the network.
const originalFetch = globalThis.fetch;
globalThis.fetch = async function verifyBlockedFetch(...args) {
  throw new Error(`Network fetch blocked in verify-heic: ${args[0]}`);
};
if (originalFetch === undefined) {
  // Restore nothing; global fetch remains our guard.
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures', 'heic');
const OUT_DIR = path.resolve(__dirname, 'fixtures-out', 'heic');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function loadLibheif() {
  const wasmUrl = new URL(
    './node_modules/libheif-js/libheif-wasm/libheif.wasm',
    import.meta.url,
  );
  const wasmBinary = fs.readFileSync(fileURLToPath(wasmUrl));
  const factory = await import('libheif-js/libheif-wasm/libheif.js');
  return factory.default({ wasmBinary });
}

function getExpectedDimensions(rawWidth, rawHeight, orientation) {
  if (orientation >= 5 && orientation <= 8) {
    return { width: rawHeight, height: rawWidth };
  }
  return { width: rawWidth, height: rawHeight };
}

function applyOrientation(srcRGBA, rawWidth, rawHeight, orientation) {
  const o = orientation || 1;
  if (o === 1) {
    return { data: srcRGBA, width: rawWidth, height: rawHeight };
  }

  const outW = o >= 5 && o <= 8 ? rawHeight : rawWidth;
  const outH = o >= 5 && o <= 8 ? rawWidth : rawHeight;
  const out = new Uint8ClampedArray(outW * outH * 4);

  // Inverse canvas transforms derived from the standard EXIF-to-canvas
  // mapping (source: https://stackoverflow.com/a/40867559). For each
  // destination pixel we sample the corresponding source pixel.
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const dx = x + 0.5;
      const dy = y + 0.5;
      let su, sv;

      switch (o) {
        case 2:
          su = rawWidth - dx;
          sv = dy;
          break;
        case 3:
          su = rawWidth - dx;
          sv = rawHeight - dy;
          break;
        case 4:
          su = dx;
          sv = rawHeight - dy;
          break;
        case 5:
          su = dy;
          sv = dx;
          break;
        case 6:
          su = dy;
          sv = rawHeight - dx;
          break;
        case 7:
          su = rawWidth - dy;
          sv = rawHeight - dx;
          break;
        case 8:
          su = rawWidth - dy;
          sv = dx;
          break;
        default:
          su = dx;
          sv = dy;
      }

      let u = Math.floor(su);
      let v = Math.floor(sv);
      u = Math.max(0, Math.min(rawWidth - 1, u));
      v = Math.max(0, Math.min(rawHeight - 1, v));

      const srcIdx = (v * rawWidth + u) * 4;
      const dstIdx = (y * outW + x) * 4;
      out[dstIdx] = srcRGBA[srcIdx];
      out[dstIdx + 1] = srcRGBA[srcIdx + 1];
      out[dstIdx + 2] = srcRGBA[srcIdx + 2];
      out[dstIdx + 3] = srcRGBA[srcIdx + 3];
    }
  }

  return { data: out, width: outW, height: outH };
}

async function probe(libheif, bytes) {
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(bytes);
  if (!images || images.length === 0) {
    throw new Error('No images found in HEIC file');
  }
  const image = images[0];
  const rawWidth = image.get_width();
  const rawHeight = image.get_height();
  const orientation = await exifr.orientation(bytes);
  const expected = getExpectedDimensions(rawWidth, rawHeight, orientation);
  return {
    imageCount: images.length,
    rawWidth,
    rawHeight,
    orientation: orientation || 1,
    width: expected.width,
    height: expected.height,
  };
}

async function convert(libheif, bytes, format, quality) {
  const start = performance.now();
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(bytes);
  const image = images[0];
  const rawWidth = image.get_width();
  const rawHeight = image.get_height();

  const displayData = await new Promise((resolve, reject) => {
    image.display(
      { data: new Uint8ClampedArray(rawWidth * rawHeight * 4), width: rawWidth, height: rawHeight },
      (result) => {
        if (!result) return reject(new Error('HEIF display() failed'));
        resolve(result.data);
      },
    );
  });

  const orientation = await exifr.orientation(bytes);
  const oriented = applyOrientation(displayData, rawWidth, rawHeight, orientation);

  const pixmap = new mupdf.Pixmap(
    mupdf.ColorSpace.DeviceRGB,
    [0, 0, oriented.width, oriented.height],
    false,
  );
  const pixels = pixmap.getPixels();
  for (let i = 0; i < oriented.width * oriented.height; i++) {
    pixels[i * 3] = oriented.data[i * 4];
    pixels[i * 3 + 1] = oriented.data[i * 4 + 1];
    pixels[i * 3 + 2] = oriented.data[i * 4 + 2];
  }

  if (format !== 'jpeg') {
    throw new Error(`Unsupported output format: ${format}`);
  }

  // MuPDF asJPEG expects 0-100 integer quality.
  const jpegBytes = pixmap.asJPEG(Math.round(quality * 100));
  const durationMs = performance.now() - start;

  return {
    bytes: new Uint8Array(jpegBytes),
    width: oriented.width,
    height: oriented.height,
    durationMs,
  };
}

function isValidJpeg(bytes) {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function readJpegDimensions(bytes) {
  for (let i = 0; i < bytes.length - 9; i++) {
    if (bytes[i] === 0xff && (bytes[i + 1] === 0xc0 || bytes[i + 1] === 0xc2)) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width, height };
    }
  }
  return null;
}

async function runCase(filename, options = {}) {
  const inputPath = path.join(FIXTURES_DIR, filename);
  const inputBytes = fs.readFileSync(inputPath);
  const libheif = await loadLibheif();

  console.log(`\n=== ${filename} ===`);

  const probeResult = await probe(libheif, inputBytes);
  console.log(
    `  Probe: ${probeResult.imageCount} image(s), ${probeResult.rawWidth}x${probeResult.rawHeight} ` +
      `(orientation ${probeResult.orientation}) -> ${probeResult.width}x${probeResult.height}`,
  );

  const converted = await convert(libheif, inputBytes, 'jpeg', 0.85);
  const outPath = path.join(OUT_DIR, `${path.parse(filename).name}-out.jpg`);
  fs.writeFileSync(outPath, converted.bytes);
  console.log(
    `  Convert: ${outPath} (${converted.bytes.length} bytes, input was ${inputBytes.length}, ` +
      `${Math.round(converted.durationMs)}ms)`,
  );

  if (!isValidJpeg(converted.bytes)) {
    throw new Error(`[${filename}] Output is not a valid JPEG (missing SOI marker)`);
  }
  console.log('  ✓ JPEG SOI marker present');

  const jpegDims = readJpegDimensions(converted.bytes);
  if (!jpegDims) {
    throw new Error(`[${filename}] Could not read JPEG dimensions (missing SOF marker)`);
  }
  if (jpegDims.width !== probeResult.width || jpegDims.height !== probeResult.height) {
    throw new Error(
      `[${filename}] JPEG dimensions ${jpegDims.width}x${jpegDims.height} do not match ` +
        `probe ${probeResult.width}x${probeResult.height}`,
    );
  }
  console.log(`  ✓ JPEG dimensions match probe (${jpegDims.width}x${jpegDims.height})`);

  const exif = await exifr.parse(converted.bytes, { tiff: true, gps: true });
  if (exif !== undefined) {
    throw new Error(`[${filename}] Output still contains EXIF/GPS metadata`);
  }
  console.log('  ✓ No EXIF/GPS metadata in output');

  if (!options.skipSizeCheck) {
    if (converted.bytes.length >= inputBytes.length) {
      throw new Error(
        `[${filename}] Output size ${converted.bytes.length} is not smaller than input ${inputBytes.length}`,
      );
    }
    console.log('  ✓ Output smaller than input');
  } else {
    console.log('  ⚠ Size check skipped (HEIC is more efficient than JPEG for this file)');
  }
}

async function main() {
  ensureDir(OUT_DIR);

  if (!fs.existsSync(FIXTURES_DIR)) {
    throw new Error(`HEIC fixtures directory not found: ${FIXTURES_DIR}`);
  }

  // Primary fixture must pass every check, including size < input.
  // Extra fixtures exercise orientation/parse paths; high-efficiency HEIC
  // files are expected to be larger than their JPEG re-encodings, so their
  // size check is skipped.
  const cases = [
    { name: 'example.heic' },
    { name: 'iphone_13_pro_max.HEIC', skipSizeCheck: true },
    { name: 'HMD_Nokia_8.3_5G_hdr.heif', skipSizeCheck: true },
    { name: 'HMD_Nokia_8.3_5G.heif', skipSizeCheck: true },
    { name: 'IMG_5195.HEIC', skipSizeCheck: true },
  ];

  const available = new Set(fs.readdirSync(FIXTURES_DIR));

  let failed = false;
  for (const c of cases) {
    if (!available.has(c.name)) {
      console.error(`\n  ✗ ${c.name} SKIPPED: fixture not found`);
      failed = true;
      continue;
    }
    try {
      await runCase(c.name, { skipSizeCheck: c.skipSizeCheck });
    } catch (err) {
      console.error(`\n  ✗ ${c.name} FAILED:`, err.message);
      failed = true;
    }
  }

  console.log('\n==============================');
  if (failed) {
    console.log('VERIFY FAILED');
    process.exit(1);
  }
  console.log('ALL CHECKS PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
