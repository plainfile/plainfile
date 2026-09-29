// Временный smoke-тест EXIF engine/worker (B.2) в Node.
// Полноценный verify-exif.mjs — отдельная задача (план Phase 2, §B.5).
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import piexif from "piexifjs";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import exifr from "exifr";
import { handleExifRequest } from "../src/tools/exif/worker";
import { buildSyntheticJpeg, pngReplaceExifChunk, webpReplaceExifChunk, detectFormat, stripApp1Prefix, bytesToBinaryString, binaryStringToBytes } from "../src/tools/exif/engine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = resolve(__dirname, "..");
let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, extra = "") {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} ${extra}`); }
}

function toBin(u8: Uint8Array): string { return bytesToBinaryString(u8); }
function fromBin(s: string): Uint8Array { return binaryStringToBytes(s); }

// ---------- fixture JPEG ----------
const img = jpeg.encode({ data: Buffer.alloc(64 * 64 * 4, 200), width: 64, height: 64 }, 90);
const exifDict = {
  "0th": {
    [piexif.ImageIFD.Make]: "TestMake",
    [piexif.ImageIFD.Model]: "TestModel X",
    [piexif.ImageIFD.Software]: "SmokeSoft 1.0",
  },
  Exif: {
    [piexif.ExifIFD.DateTimeOriginal]: "2026:09:29 12:00:00",
    [piexif.ExifIFD.ISOSpeedRatings]: 200,
    [piexif.ExifIFD.ExposureTime]: [1, 250],
  },
  GPS: {
    [piexif.GPSIFD.GPSLatitudeRef]: "N",
    [piexif.GPSIFD.GPSLatitude]: [[37, 1], [46, 1], [2964, 100]],
    [piexif.GPSIFD.GPSLongitudeRef]: "W",
    [piexif.GPSIFD.GPSLongitude]: [[122, 1], [25, 1], [984, 100]],
  },
  Interop: {},
  "1st": {},
  thumbnail: null,
};
const jpegWithExif = fromBin(piexif.insert(piexif.dump(exifDict), img.data.toString("binary")));
check("jpeg fixture has EXIF", Object.keys(piexif.load(toBin(jpegWithExif)).GPS).length > 0);

// ---------- read ----------
const readRes = await handleExifRequest({ id: 1, op: "read", bytes: jpegWithExif, fileName: "t.jpg" });
if (readRes.op === "read" && readRes.ok) {
  const d = readRes.data;
  const flat = Object.fromEntries(d.groups.flatMap((g) => g.tags.map((t) => [t.key, t.value])));
  check("read: format detected (Camera group has Make)", flat.Make === "TestMake", JSON.stringify(d.groups.map(g=>g.name)));
  check("read: Software in Software group", d.groups.find((g) => g.name === "Software")?.tags.some((t) => t.key === "Software") ?? false);
  check("read: gps parsed", Math.abs(d.gps!.lat - 37.7749) < 0.001 && Math.abs(d.gps!.lon + 122.4194) < 0.001, JSON.stringify(d.gps));
  check("read: raw dump non-empty", Object.keys(d.raw).length > 3);
} else {
  check("read: response ok", false, JSON.stringify(readRes));
}

// ---------- strip all (JPEG) ----------
const stripAll = await handleExifRequest({ id: 2, op: "strip", bytes: jpegWithExif, fileName: "t.jpg", mode: "all" });
if (stripAll.op === "strip" && stripAll.ok) {
  check("strip all: removedCount > 0", stripAll.removedCount > 0, `removed=${stripAll.removedCount} kept=${stripAll.keptCount}`);
  check("strip all: result smaller", stripAll.bytes.length < jpegWithExif.length);
  const reparse = await exifr.parse(stripAll.bytes).catch(() => undefined);
  check("strip all: exifr finds nothing", !reparse || Object.keys(reparse).length === 0, JSON.stringify(reparse));
  const p1 = jpeg.decode(jpegWithExif).data;
  const p2 = jpeg.decode(Buffer.from(stripAll.bytes)).data;
  check("strip all: pixels identical (lossless)", p1.equals(p2));
} else {
  check("strip all: response ok", false, JSON.stringify(stripAll));
}

// ---------- strip gps-only (JPEG) ----------
const stripGps = await handleExifRequest({ id: 3, op: "strip", bytes: jpegWithExif, fileName: "t.jpg", mode: "gps-only" });
if (stripGps.op === "strip" && stripGps.ok) {
  const gps = await exifr.gps(stripGps.bytes).catch(() => undefined);
  check("gps-only: GPS gone", gps === undefined, JSON.stringify(gps));
  const raw = (await exifr.parse(stripGps.bytes)) as Record<string, unknown>;
  check("gps-only: Make kept", raw.Make === "TestMake", JSON.stringify(raw));
  check("gps-only: DateTimeOriginal kept", typeof raw.DateTimeOriginal === "string" || typeof raw.CreateDate !== "undefined" || "DateTimeOriginal" in raw);
} else {
  check("gps-only: response ok", false, JSON.stringify(stripGps));
}

// ---------- strip keep-camera (JPEG) ----------
const stripKeep = await handleExifRequest({ id: 4, op: "strip", bytes: jpegWithExif, fileName: "t.jpg", mode: "keep-camera" });
if (stripKeep.op === "strip" && stripKeep.ok) {
  const raw = (await exifr.parse(stripKeep.bytes)) as Record<string, unknown>;
  check("keep-camera: GPS gone", !(await exifr.gps(stripKeep.bytes).catch(() => undefined)));
  check("keep-camera: Make kept", raw.Make === "TestMake", JSON.stringify(raw));
  check("keep-camera: ISO kept", Number(raw.ISO ?? raw.ISOSpeedRatings) === 200, JSON.stringify(raw));
  check("keep-camera: DateTimeOriginal gone", !("DateTimeOriginal" in raw), JSON.stringify(Object.keys(raw)));
  check("keep-camera: Software gone", !("Software" in raw));
} else {
  check("keep-camera: response ok", false, JSON.stringify(stripKeep));
}

// ---------- PNG ----------
const pngBase = new PNG({ width: 8, height: 8 });
pngBase.data = Buffer.alloc(8 * 8 * 4, 128);
const pngBytesBase = PNG.sync.write(pngBase);
const tiffPayload = stripApp1Prefix(binaryStringToBytes(piexif.dump(exifDict as never)));
const pngBaseParsed = await exifr.parse(pngBytesBase).catch(() => undefined);
check("png fixture: no EXIF initially", !(pngBaseParsed as Record<string, unknown>)?.Make && !(pngBaseParsed as Record<string, unknown>)?.GPS);
const pngWithExif = pngReplaceExifChunk(pngBytesBase, tiffPayload).bytes;
check("png fixture: format detected", detectFormat(pngWithExif) === "png");
check("png fixture: read finds Make", ((await exifr.parse(pngWithExif)) as Record<string, unknown>).Make === "TestMake");

const pngStripAll = await handleExifRequest({ id: 5, op: "strip", bytes: pngWithExif, fileName: "t.png", mode: "all" });
if (pngStripAll.op === "strip" && pngStripAll.ok) {
  const hasExifChunk = (b: Uint8Array) => {
    let off = 8;
    while (off + 12 <= b.length) {
      const len = ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
      const type = String.fromCharCode(b[off + 4], b[off + 5], b[off + 6], b[off + 7]);
      if (type === "eXIf") return true;
      off += 12 + len;
      if (type === "IEND") break;
    }
    return false;
  };
  check("png strip all: eXIf chunk removed", !hasExifChunk(pngStripAll.bytes));
  const pngStrippedParsed = await exifr.parse(pngStripAll.bytes).catch(() => undefined);
  check("png strip all: exifr finds no user tags", !(pngStrippedParsed as Record<string, unknown>)?.Make && !(await exifr.gps(pngStripAll.bytes).catch(() => undefined)));
} else {
  check("png strip all: response ok", false, JSON.stringify(pngStripAll));
}

const pngStripGps = await handleExifRequest({ id: 6, op: "strip", bytes: pngWithExif, fileName: "t.png", mode: "gps-only" });
if (pngStripGps.op === "strip" && pngStripGps.ok) {
  const raw = (await exifr.parse(pngStripGps.bytes).catch(() => ({}))) as Record<string, unknown>;
  check("png gps-only: GPS gone", !(await exifr.gps(pngStripGps.bytes).catch(() => undefined)));
  check("png gps-only: Make kept", raw.Make === "TestMake", JSON.stringify(raw));
} else {
  check("png gps-only: response ok", false, JSON.stringify(pngStripGps));
}

// ---------- WebP (фейковый RIFF-контейнер: chunk-логика без валидного изображения) ----------
function makeFakeWebp(withExif: boolean): Uint8Array {
  const vp8 = new Uint8Array([1, 2, 3, 4]);
  const exif = buildSyntheticJpeg(tiffPayload); // любой payload — важна структура
  const tiffLike = tiffPayload;
  void exif;
  const parts: Uint8Array[] = [];
  const chunk = (fourcc: string, data: Uint8Array) => {
    const c = new Uint8Array(8 + data.length + (data.length % 2));
    for (let i = 0; i < 4; i++) c[i] = fourcc.charCodeAt(i);
    c[4] = (data.length >>> 24) & 0xff; c[5] = (data.length >>> 16) & 0xff; c[6] = (data.length >>> 8) & 0xff; c[7] = data.length & 0xff;
    c.set(data, 8);
    return c;
  };
  parts.push(chunk("VP8 ", vp8));
  if (withExif) parts.push(chunk("EXIF", tiffLike));
  const bodySize = 4 + parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(8 + bodySize);
  out.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  out[4] = (bodySize >>> 24) & 0xff; out[5] = (bodySize >>> 16) & 0xff; out[6] = (bodySize >>> 8) & 0xff; out[7] = bodySize & 0xff;
  out.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  let pos = 12;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}

const webpWithExif = makeFakeWebp(true);
check("webp fixture: format detected", detectFormat(webpWithExif) === "webp");
// NOTE: worker-level strip re-reads the stripped file for auto-verification,
// which needs a decodable image. The fake container has no valid VP8 payload,
// so here we exercise webpReplaceExifChunk directly (same code path the worker
// uses). Worker-level WebP coverage comes with verify-exif.mjs (real files).
const webpEngineRes = webpReplaceExifChunk(webpWithExif, null);
{
  const stripped = webpEngineRes.bytes;
  const hasExif = (b: Uint8Array) => {
    let off = 12;
    while (off + 8 <= b.length) {
      const fourcc = String.fromCharCode(b[off], b[off + 1], b[off + 2], b[off + 3]);
      if (fourcc === "EXIF") return true;
      const len = ((b[off + 4] << 24) | (b[off + 5] << 16) | (b[off + 6] << 8) | b[off + 7]) >>> 0;
      off += 8 + len + (len % 2);
    }
    return false;
  };
  check("webp strip all: EXIF chunk removed", webpEngineRes.changed && !hasExif(stripped));
  const riffSize = ((stripped[4] << 24) | (stripped[5] << 16) | (stripped[6] << 8) | stripped[7]) >>> 0;
  check("webp strip all: RIFF size consistent", riffSize === stripped.length - 8);
  const dict = piexif.load(toBin(buildSyntheticJpeg(tiffPayload)));
  (dict as { GPS: Record<number, unknown> }).GPS = {};
  const newTiff = stripApp1Prefix(binaryStringToBytes(piexif.dump(dict)));
  const rebuilt = webpReplaceExifChunk(stripped, newTiff);
  check("webp selective: chunk rebuilt without GPS", rebuilt.changed && hasExif(rebuilt.bytes));
}

// ---------- HEIC read (viewer MVP) ----------
const heicBytes = new Uint8Array(readFileSync(resolve(APP, "fixtures/heic/IMG_5195.HEIC")));
const heicRead = await handleExifRequest({ id: 8, op: "read", bytes: heicBytes, fileName: "IMG_5195.HEIC" });
if (heicRead.op === "read" && heicRead.ok) {
  check("heic read: format detected, gps present", typeof heicRead.data.gps?.lat === "number", JSON.stringify(heicRead.data.gps));
  check("heic read: heic-read-only warning", heicRead.data.warnings.some((w) => w.startsWith("heic-read-only")));
} else {
  check("heic read: response ok", false, JSON.stringify(heicRead));
}

let heicError: string | undefined;
try {
  await handleExifRequest({ id: 9, op: "strip", bytes: heicBytes, fileName: "IMG_5195.HEIC", mode: "all" });
} catch (err) {
  heicError = err instanceof Error ? err.message : String(err);
}
check("heic strip: honest error (MVP)", typeof heicError === "string" && /losslessly/.test(heicError), heicError);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
