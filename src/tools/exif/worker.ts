// EXIF worker: read (exifr) + lossless strip (piexifjs / PNG / WebP chunk ops).
// Все тяжёлые зависимости — lazy (динамические импорты).
//
// Протокол — request/response по id (образец: tools/heic/worker.ts).
// handleExifRequest экспортируется для прямых вызовов из Node
// (verify-exif.mjs, smoke-тесты) — регистрация self.onmessage стоит под guard.

import type { PiexifDict } from "piexifjs";
import {
  type ExifData,
  type ExifDictLike,
  type ExifGps,
  type ExifStripMode,
  type ExifWorkerRequest,
  type ExifWorkerResponse,
  binaryStringToBytes,
  buildSyntheticJpeg,
  bytesToBinaryString,
  countRawTags,
  detectFormat,
  filterDictForMode,
  normalizeExif,
  pngReplaceExifChunk,
  stripApp1Prefix,
  webpReplaceExifChunk,
} from "./engine";

// ---------- read ----------

async function readBytes(bytes: Uint8Array): Promise<ExifData> {
  const format = detectFormat(bytes);
  if (format === "unknown") {
    throw new Error("Unrecognized file format. JPEG, PNG, WebP and HEIC are supported.");
  }
  const exifr = await import("exifr");
  const options = { gps: true, translateValues: true, sanitize: true } as const;

  let raw: Record<string, unknown> = {};
  try {
    raw = ((await exifr.parse(bytes, { ...options })) as Record<string, unknown> | undefined) ?? {};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read metadata: ${message}`);
  }

  let gps: ExifGps | undefined;
  try {
    const coords = (await exifr.gps(bytes)) as
      | { latitude: number; longitude: number; altitude?: number }
      | undefined;
    if (coords && typeof coords.latitude === "number" && typeof coords.longitude === "number") {
      gps = { lat: coords.latitude, lon: coords.longitude, altitude: coords.altitude };
    }
  } catch {
    // GPS отсутствует — не ошибка
  }

  return normalizeExif(raw, gps, format);
}

async function handleRead(request: Extract<ExifWorkerRequest, { op: "read" }>): Promise<ExifWorkerResponse> {
  const data = await readBytes(request.bytes);
  return { id: request.id, op: "read", ok: true, data };
}

// ---------- strip ----------

type PiexifModule = typeof import("piexifjs")["default"];

function dictIsEmpty(dict: ExifDictLike): boolean {
  return (
    Object.keys(dict["0th"]).length === 0 &&
    Object.keys(dict.Exif).length === 0 &&
    Object.keys(dict.GPS).length === 0 &&
    Object.keys(dict.Interop ?? {}).length === 0 &&
    Object.keys(dict["1st"] ?? {}).length === 0 &&
    !dict.thumbnail
  );
}

async function stripJpeg(bytes: Uint8Array, mode: ExifStripMode, piexif: PiexifModule): Promise<Uint8Array> {
  const bin = bytesToBinaryString(bytes);
  if (mode === "all") {
    // piexif.remove выкидывает APP1 целиком, включая встроенный thumbnail — lossless для пикселей.
    return binaryStringToBytes(piexif.remove(bin));
  }
  const dict = piexif.load(bin) as unknown as ExifDictLike;
  if (dictIsEmpty(dict)) return bytes; // EXIF-нет → не добавляем новый APP1
  filterDictForMode(dict, mode);
  if (dictIsEmpty(dict)) {
    return binaryStringToBytes(piexif.remove(bin));
  }
  // dump возвращает "Exif\0\0" + TIFF — insert ждёт именно такой формат.
  const reinserted = piexif.insert(piexif.dump(dict as unknown as PiexifDict), piexif.remove(bin));
  return binaryStringToBytes(reinserted);
}

/** Вытащить EXIF-чанк (сырой TIFF) из PNG/WebP. */
function extractChunkPayload(bytes: Uint8Array, format: "png" | "webp"): Uint8Array | null {
  if (format === "png") {
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
      const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
      if (type === "eXIf") return bytes.slice(offset + 8, offset + 8 + length);
      offset += 12 + length;
      if (type === "IEND") break;
    }
    return null;
  }
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const length = ((bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7]) >>> 0;
    if (fourcc === "EXIF") return bytes.slice(offset + 8, offset + 8 + length);
    offset += 8 + length + (length % 2);
  }
  return null;
}

async function stripChunkFormat(
  bytes: Uint8Array,
  format: "png" | "webp",
  mode: ExifStripMode,
  piexif: PiexifModule,
): Promise<Uint8Array> {
  const replace = format === "png" ? pngReplaceExifChunk : webpReplaceExifChunk;

  if (mode === "all") {
    return replace(bytes, null).bytes;
  }

  const payload = extractChunkPayload(bytes, format);
  if (!payload) return bytes; // EXIF-чанка нет — нечего фильтровать

  // PNG eXIf / WebP EXIF хранят сырой TIFF — оборачиваем в минимальный JPEG-конверт
  // для piexif.load, фильтруем, пересобираем TIFF обратно.
  const dict = piexif.load(bytesToBinaryString(buildSyntheticJpeg(payload))) as unknown as ExifDictLike;
  if (dictIsEmpty(dict)) return replace(bytes, null).bytes;
  filterDictForMode(dict, mode);
  if (dictIsEmpty(dict)) return replace(bytes, null).bytes;
  const newTiff = stripApp1Prefix(binaryStringToBytes(piexif.dump(dict as unknown as PiexifDict)));
  return replace(bytes, newTiff).bytes;
}

async function handleStrip(request: Extract<ExifWorkerRequest, { op: "strip" }>): Promise<ExifWorkerResponse> {
  const format = detectFormat(request.bytes);
  let stripped: Uint8Array;
  switch (format) {
    case "jpeg":
      stripped = await stripJpeg(request.bytes, request.mode, (await import("piexifjs")).default);
      break;
    case "png":
    case "webp":
      stripped = await stripChunkFormat(request.bytes, format, request.mode, (await import("piexifjs")).default);
      break;
    case "heic":
      throw new Error(
        "HEIC metadata cannot be removed losslessly yet. Convert the image to JPEG with the HEIC converter — conversion strips all metadata.",
      );
    case "tiff":
      throw new Error("TIFF metadata removal is not supported yet.");
    default:
      throw new Error("Unrecognized file format. JPEG, PNG and WebP stripping is supported.");
  }

  // Автоверификация (принцип redaction): переоткрываем результат и считаем diff.
  const before = await readBytes(request.bytes);
  const after = await readBytes(stripped);
  const beforeCount = countRawTags(before);
  const afterCount = countRawTags(after);
  return {
    id: request.id,
    op: "strip",
    ok: true,
    bytes: stripped,
    removedCount: Math.max(0, beforeCount - afterCount),
    keptCount: afterCount,
  };
}

// ---------- dispatch ----------

export async function handleExifRequest(request: ExifWorkerRequest): Promise<ExifWorkerResponse> {
  switch (request.op) {
    case "read":
      return handleRead(request);
    case "strip":
      return handleStrip(request);
    default:
      throw new Error(`Unknown operation: ${(request as { op?: string }).op ?? "undefined"}`);
  }
}

// Регистрация worker-окружения (в Node smoke-тестах self не определён).
const IS_WORKER =
  typeof self !== "undefined" &&
  typeof (self as { postMessage?: unknown }).postMessage === "function" &&
  typeof window === "undefined";

if (IS_WORKER) {
  self.addEventListener("message", async (event: MessageEvent<ExifWorkerRequest>) => {
    const request = event.data;
    try {
      const response = await handleExifRequest(request);
      self.postMessage(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      self.postMessage({ id: request.id, ok: false, error: message });
    }
  });

  self.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    self.postMessage({ id: -1, ok: false, error: `Unhandled worker error: ${message}` });
    event.preventDefault();
  });

  self.postMessage({ type: "ready" });
}
