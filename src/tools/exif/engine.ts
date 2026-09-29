// EXIF engine: контракт worker'а + чистая lossless-логика работы с метаданными.
// Без React, без DOM, без тяжёлых зависимостей — этот файл можно исполнять в Node
// (используется verify-скриптами и smoke-тестами).
//
// Privacy-правила: ноль сетевых вызовов; strip — только lossless-операции
// (JPEG-сегменты, PNG/WebP-чанки). Canvas re-encode здесь НЕ используется.

// ---------- Контракт worker'а (план Phase 2, §B.2) ----------

export interface ExifTag {
  key: string;
  value: string;
}

export interface ExifTagGroup {
  name: string;
  tags: ExifTag[];
}

export interface ExifGps {
  lat: number;
  lon: number;
  altitude?: number;
}

export interface ExifData {
  /** Нормализованная проекция, НЕ сырой dump: Camera / Location / Time / Software / Other. */
  groups: ExifTagGroup[];
  gps?: ExifGps;
  /** Полный dump для таблицы «All tags». */
  raw: Record<string, unknown>;
  warnings: string[];
}

/** all: удалить всё. gps-only: только GPS. keep-camera: выдержка/ISO/фокусное остаются. */
export type ExifStripMode = "all" | "gps-only" | "keep-camera";

export type ExifWorkerRequest =
  | { id: number; op: "read"; bytes: Uint8Array; fileName: string }
  | { id: number; op: "strip"; bytes: Uint8Array; fileName: string; mode: ExifStripMode };

export type ExifWorkerResponse =
  | { id: number; op: "read"; ok: true; data: ExifData }
  | { id: number; op: "strip"; ok: true; bytes: Uint8Array; removedCount: number; keptCount: number }
  | { id: number; ok: false; error: string };

// ---------- Форматы ----------

export type ExifFormat = "jpeg" | "png" | "webp" | "heic" | "tiff" | "unknown";

const HEIC_BRANDS = /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|miaf)$/;

export function detectFormat(bytes: Uint8Array): ExifFormat {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // "WEBP"
  ) {
    return "webp";
  }
  // ISO-BMFF: box size (4) + "ftyp" (4) + brand (4)
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 // "ftyp"
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    if (HEIC_BRANDS.test(brand)) return "heic";
    // совместимые бренды лежат дальше в major-compat list — ищем heic-family в первых 64 байтах
    const head = bytes.length >= 64 ? bytes.slice(0, 64) : bytes;
    for (let i = 16; i + 4 <= head.length; i += 4) {
      const compat = String.fromCharCode(head[i], head[i + 1], head[i + 2], head[i + 3]).toLowerCase();
      if (HEIC_BRANDS.test(compat)) return "heic";
    }
  }
  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  ) {
    return "tiff";
  }
  return "unknown";
}

// ---------- Byte helpers ----------

export function bytesToBinaryString(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return parts.join("");
}

export function binaryStringToBytes(str: string): Uint8Array {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

// ---------- CRC32 (PNG-чанки) ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------- PNG: чанк eXIf ----------

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function writeUint32BE(out: Uint8Array, offset: number, value: number): void {
  out[offset] = (value >>> 24) & 0xff;
  out[offset + 1] = (value >>> 16) & 0xff;
  out[offset + 2] = (value >>> 8) & 0xff;
  out[offset + 3] = value & 0xff;
}

export interface ChunkReplaceResult {
  bytes: Uint8Array;
  /** Была ли реальная замена/удаление/вставка чанка. */
  changed: boolean;
  /** Был ли исходный EXIF-чанк (для подсчёта «до»). */
  hadExif: boolean;
}

/**
 * Заменяет чанк eXIf в PNG. payload === null удаляет чанк.
 * Новый чанк (если есть) вставляется сразу после IHDR — так требует спецификация.
 */
export function pngReplaceExifChunk(bytes: Uint8Array, payload: Uint8Array | null): ChunkReplaceResult {
  if (detectFormat(bytes) !== "png") throw new Error("Not a PNG file");
  interface Chunk {
    type: string;
    data: Uint8Array;
  }
  const chunks: Chunk[] = [];
  let offset = PNG_SIG.length;
  let hadExif = false;
  while (offset + 12 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const data = bytes.slice(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    if (type === "eXIf") hadExif = true;
    offset += 12 + length;
    if (type === "IEND") break;
  }

  const newExifChunkLength = payload ? 12 + payload.length : 0;
  const oldExifLength = chunks.reduce((sum, c) => sum + (c.type === "eXIf" ? 12 + c.data.length : 0), 0);
  const total = PNG_SIG.length + chunks.reduce((sum, c) => sum + 12 + c.data.length, 0) - oldExifLength + newExifChunkLength;
  const out = new Uint8Array(total);
  out.set(PNG_SIG, 0);
  let pos = PNG_SIG.length;

  const writeChunk = (type: string, data: Uint8Array) => {
    writeUint32BE(out, pos, data.length);
    const typeBytes = [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)];
    out[pos + 4] = typeBytes[0];
    out[pos + 5] = typeBytes[1];
    out[pos + 6] = typeBytes[2];
    out[pos + 7] = typeBytes[3];
    out.set(data, pos + 8);
    const crcInput = new Uint8Array(4 + data.length);
    crcInput.set(typeBytes, 0);
    crcInput.set(data, 4);
    writeUint32BE(out, pos + 8 + data.length, crc32(crcInput));
    pos += 12 + data.length;
  };

  let inserted = false;
  const changed = hadExif || payload !== null;
  for (const chunk of chunks) {
    if (chunk.type === "eXIf") continue; // старый eXIf выбрасываем
    writeChunk(chunk.type, chunk.data);
    if (!inserted && payload !== null && chunk.type === "IHDR") {
      writeChunk("eXIf", payload);
      inserted = true;
    }
  }
  // на случай экзотического PNG без IHDR на первом месте
  if (!inserted && payload !== null) {
    throw new Error("PNG without IHDR chunk — cannot insert eXIf");
  }
  return { bytes: out, changed, hadExif };
}

// ---------- WebP: чанк EXIF (RIFF) ----------

const EXIF_CHUNK_WEBP = "EXIF";

/**
 * Заменяет чанк EXIF в WebP (RIFF). payload === null удаляет чанк.
 * Данные WebP-EXIF-чанка — сырая TIFF-структура (без префикса "Exif\0\0").
 */
export function webpReplaceExifChunk(bytes: Uint8Array, payload: Uint8Array | null): ChunkReplaceResult {
  if (detectFormat(bytes) !== "webp") throw new Error("Not a WebP file");
  interface Chunk {
    fourcc: string;
    data: Uint8Array;
  }
  const chunks: Chunk[] = [];
  let offset = 12; // RIFF(4) + size(4) + "WEBP"(4)
  let hadExif = false;
  while (offset + 8 <= bytes.length) {
    const fourcc = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const length = readUint32BE(bytes, offset + 4);
    const padded = length + (length % 2); // RIFF: нечётные данные дополняются до чётного
    const data = bytes.slice(offset + 8, offset + 8 + length);
    chunks.push({ fourcc, data });
    if (fourcc === EXIF_CHUNK_WEBP) hadExif = true;
    offset += 8 + padded;
  }

  const newLength = payload ? 8 + payload.length + (payload.length % 2) : 0;
  const oldLength = chunks.reduce((sum, c) => sum + (c.fourcc === EXIF_CHUNK_WEBP ? 8 + c.data.length + (c.data.length % 2) : 0), 0);
  const bodySize = 4 + chunks.reduce((sum, c) => sum + 8 + c.data.length + (c.data.length % 2), 0) - oldLength + newLength;
  const out = new Uint8Array(8 + bodySize);
  out.set(bytes.slice(0, 4), 0); // "RIFF"
  writeUint32BE(out, 4, bodySize);
  out.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  let pos = 12;

  const writeChunk = (fourcc: string, data: Uint8Array) => {
    out[pos] = fourcc.charCodeAt(0);
    out[pos + 1] = fourcc.charCodeAt(1);
    out[pos + 2] = fourcc.charCodeAt(2);
    out[pos + 3] = fourcc.charCodeAt(3);
    writeUint32BE(out, pos + 4, data.length);
    out.set(data, pos + 8);
    pos += 8 + data.length + (data.length % 2); // pad-байт остаётся нулевым
  };

  const changed = hadExif || payload !== null;
  let inserted = false;
  for (const chunk of chunks) {
    if (chunk.fourcc === EXIF_CHUNK_WEBP) continue;
    writeChunk(chunk.fourcc, chunk.data);
    if (!inserted && payload !== null) {
      // EXIF принято держать после image-чанков, до конца — вставляем в конец
      inserted = true; // вставка после цикла
    }
  }
  if (payload !== null) writeChunk(EXIF_CHUNK_WEBP, payload);
  return { bytes: out, changed, hadExif };
}

// ---------- JPEG EXIF (piexifjs) ----------

/** Префикс APP1-сегмента: piexif.dump() возвращает "Exif\0\0" + TIFF. */
export const EXIF_APP1_PREFIX_LENGTH = 6;

export function stripApp1Prefix(dumped: Uint8Array): Uint8Array {
  const head = String.fromCharCode(dumped[0], dumped[1], dumped[2], dumped[3]);
  if (head === "Exif" && dumped[4] === 0 && dumped[5] === 0) {
    return dumped.slice(EXIF_APP1_PREFIX_LENGTH);
  }
  return dumped;
}

/**
 * Минимальный JPEG-конверт (SOI + APP1 + EOI) вокруг TIFF-пayload,
 * чтобы piexif.load мог разобрать EXIF из PNG/WebP-чанка.
 */
export function buildSyntheticJpeg(tiffPayload: Uint8Array): Uint8Array {
  const out = new Uint8Array(2 + 2 + 2 + EXIF_APP1_PREFIX_LENGTH + tiffPayload.length + 2);
  out[0] = 0xff; out[1] = 0xd8; // SOI
  out[2] = 0xff; out[3] = 0xe1; // APP1
  const segLength = 2 + EXIF_APP1_PREFIX_LENGTH + tiffPayload.length;
  out[4] = (segLength >>> 8) & 0xff;
  out[5] = segLength & 0xff;
  out.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 6); // "Exif\0\0"
  out.set(tiffPayload, 6 + EXIF_APP1_PREFIX_LENGTH);
  out[out.length - 2] = 0xff;
  out[out.length - 1] = 0xd9; // EOI
  return out;
}

// ---------- Фильтрация тегов по режиму ----------

/** Структурный тип EXIF-dict piexifjs без зависимости от библиотеки. */
export interface ExifDictLike {
  "0th": Record<number, unknown>;
  Exif: Record<number, unknown>;
  GPS: Record<number, unknown>;
  Interop: Record<number, unknown>;
  "1st": Record<number, unknown>;
  thumbnail: unknown;
}

// Image IFD (0th)
const TAG_IMAGE_DESCRIPTION = 0x010e;
const TAG_SOFTWARE = 0x0131;
const TAG_DATETIME = 0x0132;
const TAG_ARTIST = 0x013b;
const TAG_PROCESSING_SOFTWARE = 0x000b;
const TAG_COPYRIGHT = 0x8298;
const TAG_GPS_INFO_IFD_POINTER = 0x8825;
const TAG_XP_TITLE = 0x9c9b;
const TAG_XP_COMMENT = 0x9c9c;
const TAG_XP_AUTHOR = 0x9c9d;
const TAG_XP_KEYWORDS = 0x9c9e;
const TAG_XP_SUBJECT = 0x9c9f;

// Exif IFD
const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_DATETIME_DIGITIZED = 0x9004;
const TAG_OFFSET_TIME = 0x9010;
const TAG_OFFSET_TIME_ORIGINAL = 0x9011;
const TAG_OFFSET_TIME_DIGITIZED = 0x9012;
const TAG_MAKER_NOTE = 0x927c;
const TAG_USER_COMMENT = 0x9286;
const TAG_SUBSEC_TIME = 0x9290;
const TAG_SUBSEC_TIME_ORIGINAL = 0x9291;
const TAG_SUBSEC_TIME_DIGITIZED = 0x9292;
const TAG_IMAGE_UNIQUE_ID = 0xa420;
const TAG_CAMERA_OWNER_NAME = 0xa430;
const TAG_BODY_SERIAL_NUMBER = 0xa431;
const TAG_LENS_SERIAL_NUMBER = 0xa435;

/** Теги, удаляемые в режиме keep-camera (время, софт, комментарии, идентификаторы). */
const KEEP_CAMERA_DELETE_0TH = [
  TAG_IMAGE_DESCRIPTION,
  TAG_PROCESSING_SOFTWARE,
  TAG_SOFTWARE,
  TAG_DATETIME,
  TAG_ARTIST,
  TAG_COPYRIGHT,
  TAG_GPS_INFO_IFD_POINTER,
  TAG_XP_TITLE,
  TAG_XP_COMMENT,
  TAG_XP_AUTHOR,
  TAG_XP_KEYWORDS,
  TAG_XP_SUBJECT,
];

const KEEP_CAMERA_DELETE_EXIF = [
  TAG_DATETIME_ORIGINAL,
  TAG_DATETIME_DIGITIZED,
  TAG_OFFSET_TIME,
  TAG_OFFSET_TIME_ORIGINAL,
  TAG_OFFSET_TIME_DIGITIZED,
  TAG_MAKER_NOTE,
  TAG_USER_COMMENT,
  TAG_SUBSEC_TIME,
  TAG_SUBSEC_TIME_ORIGINAL,
  TAG_SUBSEC_TIME_DIGITIZED,
  TAG_IMAGE_UNIQUE_ID,
  TAG_CAMERA_OWNER_NAME,
  TAG_BODY_SERIAL_NUMBER,
  TAG_LENS_SERIAL_NUMBER,
];

export function countDictTags(dict: ExifDictLike): number {
  return (
    Object.keys(dict["0th"]).length +
    Object.keys(dict.Exif).length +
    Object.keys(dict.GPS).length +
    (dict["1st"] ? Object.keys(dict["1st"]).length : 0) +
    (dict.Interop ? Object.keys(dict.Interop).length : 0)
  );
}

/**
 * Фильтрует EXIF-dict в-place по режиму. Возвращает true, если что-то удалено.
 * Внимание: встроенный JPEG-thumbnail удаляется в обоих selective-режимах —
 * он может содержать собственные метаданные (privacy).
 */
export function filterDictForMode(dict: ExifDictLike, mode: ExifStripMode): boolean {
  const before = countDictTags(dict) + (dict.thumbnail ? 1 : 0);
  const hasGps = Object.keys(dict.GPS).length > 0 || dict["0th"][TAG_GPS_INFO_IFD_POINTER] !== undefined;

  if (mode === "gps-only") {
    dict.GPS = {};
    delete dict["0th"][TAG_GPS_INFO_IFD_POINTER];
    if (dict.thumbnail) {
      dict["1st"] = {};
      dict.thumbnail = null;
    }
  } else if (mode === "keep-camera") {
    dict.GPS = {};
    for (const tag of KEEP_CAMERA_DELETE_0TH) delete dict["0th"][tag];
    for (const tag of KEEP_CAMERA_DELETE_EXIF) delete dict.Exif[tag];
    dict["1st"] = {};
    dict.thumbnail = null;
    // Interop несёт только форматную информацию — оставляем
  } else {
    throw new Error(`Unknown strip mode: ${mode}`);
  }

  const after = countDictTags(dict) + (dict.thumbnail ? 1 : 0);
  return after < before || hasGps;
}

// ---------- Нормализация в группы ----------

function formatTagValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => formatTagValue(v)).join(", ");
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const TIME_KEY = /date|time/i;
const SOFTWARE_KEYS = new Set(["Software", "ProcessingSoftware", "HostComputer", "CreatorTool"]);
const CAMERA_KEY =
  /^(Make|Model|Lens|Focal|FNumber|Exposure|ISO|ISOSpeed|Aperture|Shutter|Flash|WhiteBalance|Metering|Orientation|ColorSpace|Pixel|Scene|DigitalZoom|Contrast|Saturation|Sharpness|GainControl|Brightness|LightSource|MaxAperture|SubjectDistance|Photographic|Sensitivity|SensingMethod|FileSource|Components|CustomRendered|ExifVersion|FlashpixVersion|SerialNumber|CameraOwnerName|ImageUniqueID|RecommendedExposure|Interop)/i;
const LOCATION_KEY = /^(GPS|latitude|longitude|altitude)/i;

export function normalizeExif(
  raw: Record<string, unknown>,
  gps: ExifGps | undefined,
  format: ExifFormat,
): ExifData {
  const groups = new Map<string, ExifTag[]>([
    ["Camera", []],
    ["Location", []],
    ["Time", []],
    ["Software", []],
    ["Other", []],
  ]);

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    let group = "Other";
    if (LOCATION_KEY.test(key)) group = "Location";
    else if (SOFTWARE_KEYS.has(key)) group = "Software";
    else if (TIME_KEY.test(key)) group = "Time";
    else if (CAMERA_KEY.test(key)) group = "Camera";
    groups.get(group)!.push({ key, value: formatTagValue(value) });
  }

  const warnings: string[] = [];
  if (format === "heic") {
    warnings.push("heic-read-only: HEIC metadata is view-only; remove it by converting to JPEG with the HEIC converter.");
  }
  if ("thumbnail" in raw) {
    warnings.push("thumbnail-embedded: this file carries an embedded thumbnail inside its metadata.");
  }

  return {
    groups: [...groups.entries()]
      .filter(([, tags]) => tags.length > 0)
      .map(([name, tags]) => ({ name, tags })),
    gps,
    raw,
    warnings,
  };
}

/** Общее число тегов в raw-dump (для подсчёта removed/kept после strip). */
export function countRawTags(data: ExifData): number {
  return Object.keys(data.raw).length;
}
