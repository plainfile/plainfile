// verify-exif.mts — golden-fixture gate для EXIF-инструмента (план Phase 2, §B.5).
// Через tsx: использует TS-движок инструмента напрямую (handleExifRequest).
//
// Покрытие:
//   JPEG: read → strip(all) [exifr пуст, пиксели идентичны, thumbnail удалён]
//         → strip(gps-only) [GPS нет, Make/Model/DateTime на месте]
//         → strip(keep-camera) [ISO/выдержка есть, время/софт/комменты нет]
//   PNG: eXIf-чанк → strip(all) [чанк удалён] → strip(gps-only) [пересобран без GPS]
//   WebP: chunk-логика на уровне engine (worker-автоверификация требует
//         декодируемого изображения, а валидный WebP-энкодера в deps нет —
//         worker-путь идентичен PNG, который покрыт выше).
//
// Safety guard: этот верификатор не должен ходить в сеть.

const originalFetch = globalThis.fetch;
globalThis.fetch = async function verifyBlockedFetch(...args: unknown[]) {
  throw new Error(`Network fetch blocked in verify-exif: ${args[0]}`);
};

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import piexif from "piexifjs";
import jpeg from "jpeg-js";
import exifr from "exifr";
import { PNG } from "pngjs";
import { handleExifRequest } from "./src/tools/exif/worker";
import {
  buildSyntheticJpeg,
  bytesToBinaryString,
  binaryStringToBytes,
  pngReplaceExifChunk,
  stripApp1Prefix,
  webpReplaceExifChunk,
} from "./src/tools/exif/engine";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "fixtures-out", "exif");

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, extra = ""): void {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name} ${extra}`);
  }
}

function toBin(u8: Uint8Array): string {
  return bytesToBinaryString(u8);
}
function fromBin(s: string): Uint8Array {
  return binaryStringToBytes(s);
}

// ---------- fixture: JPEG с известными тегами + встроенным thumbnail ----------
function makeFixtureJpeg(): Uint8Array {
  const img = jpeg.encode({ data: Buffer.alloc(64 * 64 * 4, 200), width: 64, height: 64 }, 90);
  const thumb = jpeg.encode({ data: Buffer.alloc(8 * 8 * 4, 100), width: 8, height: 8 }, 80);
  const dict = {
    "0th": {
      [piexif.ImageIFD.Make]: "TestMake",
      [piexif.ImageIFD.Model]: "TestModel X",
      [piexif.ImageIFD.Software]: "SmokeSoft 1.0",
      [piexif.ImageIFD.ImageDescription]: "verify fixture",
    },
    Exif: {
      [piexif.ExifIFD.DateTimeOriginal]: "2026:09:29 12:00:00",
      [piexif.ExifIFD.ISOSpeedRatings]: 200,
      [piexif.ExifIFD.ExposureTime]: [1, 250],
      [piexif.ExifIFD.UserComment]: "ASCII\x00\x00\x00hello-verify",
    },
    GPS: {
      [piexif.GPSIFD.GPSLatitudeRef]: "N",
      [piexif.GPSIFD.GPSLatitude]: [[37, 1], [46, 1], [2964, 100]], // 37.7749
      [piexif.GPSIFD.GPSLongitudeRef]: "W",
      [piexif.GPSIFD.GPSLongitude]: [[122, 1], [25, 1], [984, 100]], // -122.4194
    },
    Interop: {},
    "1st": {
      [piexif.ImageIFD.Compression]: 6,
      [piexif.ImageIFD.XResolution]: [72, 1],
      [piexif.ImageIFD.YResolution]: [72, 1],
      [piexif.ImageIFD.ResolutionUnit]: 2,
    },
    thumbnail: thumb.data.toString("binary"),
  };
  return fromBin(piexif.insert(piexif.dump(dict), img.data.toString("binary")));
}

async function main(): Promise<void> {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const fixture = makeFixtureJpeg();
  const loaded = piexif.load(toBin(fixture));
  check("fixture: GPS written", Object.keys(loaded.GPS).length >= 4);
  check("fixture: thumbnail embedded", typeof loaded.thumbnail === "string" && loaded.thumbnail.length > 0);

  // ---------- read ----------
  const read = await handleExifRequest({ id: 1, op: "read", bytes: fixture, fileName: "fixture.jpg" });
  check("read: ok", read.op === "read" && read.ok);
  if (read.op === "read" && read.ok) {
    check("read: gps 37.7749,-122.4194", Math.abs(read.data.gps!.lat - 37.7749) < 0.001 && Math.abs(read.data.gps!.lon + 122.4194) < 0.001);
    const flat = Object.fromEntries(read.data.groups.flatMap((g) => g.tags.map((t) => [t.key, t.value])));
    check("read: Make=TestMake", flat.Make === "TestMake");
    check("read: groups present", ["Camera", "Location", "Time", "Software"].every((n) => read.data.groups.some((g) => g.name === n)));
  }

  // ---------- strip all ----------
  const stripAll = await handleExifRequest({ id: 2, op: "strip", bytes: fixture, fileName: "fixture.jpg", mode: "all" });
  check("strip(all): ok", stripAll.op === "strip" && stripAll.ok);
  if (stripAll.op === "strip" && stripAll.ok) {
    fs.writeFileSync(path.join(OUT_DIR, "strip-all.jpg"), stripAll.bytes);
    check("strip(all): exifr.parse finds nothing", await exifr.parse(stripAll.bytes).then((r: unknown) => !r || Object.keys(r as object).length === 0).catch(() => true));
    const reloaded = piexif.load(toBin(stripAll.bytes));
    check("strip(all): piexif.load empty", Object.keys(reloaded["0th"]).length === 0 && Object.keys(reloaded.Exif).length === 0 && Object.keys(reloaded.GPS).length === 0);
    check("strip(all): thumbnail removed", !reloaded.thumbnail);
    const p1 = jpeg.decode(fixture).data;
    const p2 = jpeg.decode(Buffer.from(stripAll.bytes)).data;
    check("strip(all): pixel data identical (lossless)", p1.equals(p2), `${p1.length} vs ${p2.length}`);
    check("strip(all): file smaller", stripAll.bytes.length < fixture.length);
    check("strip(all): counts", stripAll.removedCount > 0 && stripAll.keptCount === 0, `removed=${stripAll.removedCount} kept=${stripAll.keptCount}`);
  }

  // ---------- strip gps-only ----------
  const stripGps = await handleExifRequest({ id: 3, op: "strip", bytes: fixture, fileName: "fixture.jpg", mode: "gps-only" });
  check("strip(gps-only): ok", stripGps.op === "strip" && stripGps.ok);
  if (stripGps.op === "strip" && stripGps.ok) {
    fs.writeFileSync(path.join(OUT_DIR, "strip-gps-only.jpg"), stripGps.bytes);
    const gpsAfterAll = await exifr.gps(stripGps.bytes).catch(() => undefined);
    check("strip(gps-only): GPS gone", gpsAfterAll === undefined, JSON.stringify(gpsAfterAll));
    const raw = (await exifr.parse(stripGps.bytes).catch(() => ({}))) as Record<string, unknown>;
    check("strip(gps-only): Make/Model kept", raw.Make === "TestMake" && raw.Model === "TestModel X", JSON.stringify(raw));
    check("strip(gps-only): DateTimeOriginal kept", "DateTimeOriginal" in raw, JSON.stringify(Object.keys(raw)));
    const p1 = jpeg.decode(fixture).data;
    const p2 = jpeg.decode(Buffer.from(stripGps.bytes)).data;
    check("strip(gps-only): pixel data identical (lossless)", p1.equals(p2));
  }

  // ---------- strip keep-camera ----------
  const stripKeep = await handleExifRequest({ id: 4, op: "strip", bytes: fixture, fileName: "fixture.jpg", mode: "keep-camera" });
  check("strip(keep-camera): ok", stripKeep.op === "strip" && stripKeep.ok);
  if (stripKeep.op === "strip" && stripKeep.ok) {
    fs.writeFileSync(path.join(OUT_DIR, "strip-keep-camera.jpg"), stripKeep.bytes);
    const raw = (await exifr.parse(stripKeep.bytes).catch(() => ({}))) as Record<string, unknown>;
    const gpsAfterKeep = await exifr.gps(stripKeep.bytes).catch(() => undefined);
    check("strip(keep-camera): GPS gone", gpsAfterKeep === undefined, JSON.stringify(gpsAfterKeep));
    check("strip(keep-camera): Make kept", raw.Make === "TestMake", JSON.stringify(raw));
    check("strip(keep-camera): ISO kept", Number(raw.ISO ?? raw.ISOSpeedRatings) === 200, JSON.stringify(raw));
    check("strip(keep-camera): DateTimeOriginal gone", !("DateTimeOriginal" in raw));
    check("strip(keep-camera): Software gone", !("Software" in raw));
    check("strip(keep-camera): UserComment gone", !("UserComment" in raw));
    const p1 = jpeg.decode(fixture).data;
    const p2 = jpeg.decode(Buffer.from(stripKeep.bytes)).data;
    check("strip(keep-camera): pixel data identical (lossless)", p1.equals(p2));
  }

  // ---------- PNG ----------
  const pngBase = PNG.sync.write((() => {
    const p = new PNG({ width: 8, height: 8 });
    p.data = Buffer.alloc(8 * 8 * 4, 128);
    return p;
  })());
  const pngDict = {
    "0th": {
      [piexif.ImageIFD.Make]: "TestMake",
      [piexif.ImageIFD.Model]: "TestModel X",
      [piexif.ImageIFD.Software]: "SmokeSoft 1.0",
    },
    Exif: {
      [piexif.ExifIFD.DateTimeOriginal]: "2026:09:29 12:00:00",
      [piexif.ExifIFD.ISOSpeedRatings]: 200,
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
  const tiffPayload = stripApp1Prefix(binaryStringToBytes(piexif.dump(pngDict as never)));
  const pngWithExif = pngReplaceExifChunk(pngBase, tiffPayload).bytes;
  check("png: eXIf chunk injected", toBin(pngWithExif).includes("eXIf"));

  const pngAll = await handleExifRequest({ id: 5, op: "strip", bytes: pngWithExif, fileName: "f.png", mode: "all" });
  check("png strip(all): ok", pngAll.op === "strip" && pngAll.ok);
  if (pngAll.op === "strip" && pngAll.ok) {
    fs.writeFileSync(path.join(OUT_DIR, "strip-all.png"), pngAll.bytes);
    check("png strip(all): eXIf gone", !toBin(pngAll.bytes).includes("eXIf"));
    const raw = (await exifr.parse(pngAll.bytes).catch(() => ({}))) as Record<string, unknown>;
    check("png strip(all): no user tags", !raw.Make && !(await exifr.gps(pngAll.bytes).catch(() => undefined)));
    const roundtrip = PNG.sync.read(Buffer.from(pngAll.bytes));
    check("png strip(all): image still decodes", roundtrip.width === 8 && roundtrip.height === 8);
  }

  const pngGps = await handleExifRequest({ id: 6, op: "strip", bytes: pngWithExif, fileName: "f.png", mode: "gps-only" });
  check("png strip(gps-only): ok", pngGps.op === "strip" && pngGps.ok);
  if (pngGps.op === "strip" && pngGps.ok) {
    fs.writeFileSync(path.join(OUT_DIR, "strip-gps-only.png"), pngGps.bytes);
    check("png strip(gps-only): eXIf kept", toBin(pngGps.bytes).includes("eXIf"));
    const raw = (await exifr.parse(pngGps.bytes).catch(() => ({}))) as Record<string, unknown>;
    check("png strip(gps-only): Make kept", raw.Make === "TestMake", JSON.stringify(raw));
    check("png strip(gps-only): GPS gone", !(await exifr.gps(pngGps.bytes).catch(() => undefined)));
  }

  // ---------- WebP: engine-level (см. шапку файла) ----------
  function makeFakeWebp(withExif: boolean): Uint8Array {
    const vp8 = new Uint8Array([1, 2, 3, 4]);
    const chunk = (fourcc: string, data: Uint8Array) => {
      const c = new Uint8Array(8 + data.length + (data.length % 2));
      for (let i = 0; i < 4; i++) c[i] = fourcc.charCodeAt(i);
      c[4] = (data.length >>> 24) & 0xff; c[5] = (data.length >>> 16) & 0xff; c[6] = (data.length >>> 8) & 0xff; c[7] = data.length & 0xff;
      c.set(data, 8);
      return c;
    };
    const parts = [chunk("VP8 ", vp8)];
    if (withExif) parts.push(chunk("EXIF", tiffPayload));
    const bodySize = 4 + parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(8 + bodySize);
    out.set([0x52, 0x49, 0x46, 0x46], 0);
    out[4] = (bodySize >>> 24) & 0xff; out[5] = (bodySize >>> 16) & 0xff; out[6] = (bodySize >>> 8) & 0xff; out[7] = bodySize & 0xff;
    out.set([0x57, 0x45, 0x42, 0x50], 8);
    let pos = 12;
    for (const p of parts) { out.set(p, pos); pos += p.length; }
    return out;
  }
  const webpAll = webpReplaceExifChunk(makeFakeWebp(true), null);
  check("webp engine: EXIF chunk removed", webpAll.changed && !toBin(webpAll.bytes).includes("EXIF"));
  const riffSize = ((webpAll.bytes[4] << 24) | (webpAll.bytes[5] << 16) | (webpAll.bytes[6] << 8) | webpAll.bytes[7]) >>> 0;
  check("webp engine: RIFF size consistent", riffSize === webpAll.bytes.length - 8);
  const dictNoGps = piexif.load(toBin(buildSyntheticJpeg(tiffPayload))) as { GPS: Record<number, unknown> };
  dictNoGps.GPS = {};
  const webpSel = webpReplaceExifChunk(webpAll.bytes, stripApp1Prefix(binaryStringToBytes(piexif.dump(dictNoGps as never))));
  check("webp engine: selective rebuild keeps EXIF chunk", webpSel.changed && toBin(webpSel.bytes).includes("EXIF"));

  void originalFetch;

  console.log("\n==============================");
  if (failed) {
    console.log(`VERIFY FAILED (${failed} checks)`);
    process.exit(1);
  }
  console.log("ALL EXIF CHECKS PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
