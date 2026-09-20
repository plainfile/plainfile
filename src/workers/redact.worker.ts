import type {
  LoadPayload,
  PageInfo,
  RedactPayload,
  RedactionRegion,
  RenderPayload,
  SearchMatch,
  SearchPayload,
  VerifyPayload,
  WorkerRequest,
  WorkerResponse,
} from "@/lib/mupdf-engine";
import * as mupdf from "mupdf";

let currentDoc: mupdf.PDFDocument | null = null;
let currentBytes: ArrayBuffer | null = null;

const DeviceRGB = mupdf.ColorSpace.DeviceRGB;

function rectFromQuad(quad: number[]) {
  const x0 = Math.min(quad[0], quad[2], quad[4], quad[6]);
  const y0 = Math.min(quad[1], quad[3], quad[5], quad[7]);
  const x1 = Math.max(quad[0], quad[2], quad[4], quad[6]);
  const y1 = Math.max(quad[1], quad[3], quad[5], quad[7]);
  return { x0, y0, x1, y1 };
}

function sanitizeDocument(doc: mupdf.PDFDocument) {
  const infoKeys = [
    mupdf.Document.META_INFO_TITLE,
    mupdf.Document.META_INFO_AUTHOR,
    mupdf.Document.META_INFO_SUBJECT,
    mupdf.Document.META_INFO_KEYWORDS,
    mupdf.Document.META_INFO_CREATOR,
    mupdf.Document.META_INFO_PRODUCER,
  ];
  for (const key of infoKeys) {
    try {
      doc.setMetaData(key, "");
    } catch {
      // ignore
    }
  }

  try {
    const trailer = doc.getTrailer();
    const root = trailer.get("Root");
    if (root && !root.isNull()) {
      root.delete("Metadata");
      root.delete("Names");
      root.delete("OpenAction");
      root.delete("AA");
    }
  } catch {
    // ignore
  }

  try {
    const iter = doc.outlineIterator();
    while (iter.item()) {
      iter.delete();
    }
  } catch {
    // ignore
  }

  const pageCount = doc.countPages();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    for (const annot of page.getAnnotations()) {
      try {
        page.deleteAnnotation(annot);
      } catch {
        // ignore
      }
    }
  }

  try {
    doc.subsetFonts();
  } catch {
    // ignore
  }
}

async function handleLoad(payload: LoadPayload): Promise<WorkerResponse> {
  currentBytes = payload.bytes.slice(0);
  currentDoc = (await mupdf.PDFDocument.openDocument(
    new Uint8Array(currentBytes),
    "application/pdf",
  )) as mupdf.PDFDocument;
  if (currentDoc.needsPassword()) {
    currentDoc = null;
    throw new Error("Password-protected PDF. Remove the password first.");
  }
  const pageCount = currentDoc.countPages();
  const pages: PageInfo[] = [];
  for (let i = 0; i < pageCount; i++) {
    const page = currentDoc.loadPage(i);
    const bounds = page.getBounds();
    pages.push({
      page: i,
      width: bounds[2] - bounds[0],
      height: bounds[3] - bounds[1],
    });
  }
  return { type: "load", ok: true, data: { pageCount, pages } };
}

function handleRender(payload: RenderPayload): WorkerResponse {
  if (!currentDoc) throw new Error("No document loaded");
  const page = currentDoc.loadPage(payload.page);
  const scale = payload.dpi / 72;
  const matrix = mupdf.Matrix.scale(scale, scale);
  const pixmap = page.toPixmap(matrix, DeviceRGB, false);
  const width = pixmap.getWidth();
  const height = pixmap.getHeight();
  // Return PNG instead of raw pixels to avoid stride/component mismatches in ImageData.
  const png = pixmap.asPNG();

  return { type: "render", ok: true, data: { png, width, height } };
}

function handleSearch(payload: SearchPayload): WorkerResponse {
  if (!currentDoc) throw new Error("No document loaded");
  const matches: SearchMatch[] = [];
  const pageCount = currentDoc.countPages();
  for (let i = 0; i < pageCount; i++) {
    const page = currentDoc.loadPage(i);
    const st = page.toStructuredText();

    if (payload.regex) {
      const text = st.asText();
      const re = new RegExp(payload.pattern, "g");
      const seen = new Set<string>();
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        seen.add(m[0]);
      }
      for (const literal of seen) {
        const hits = st.search(literal);
        for (const hit of hits) {
          for (const quad of hit) {
            matches.push({ page: i, rect: rectFromQuad(quad) });
          }
        }
      }
    } else {
      const hits = st.search(payload.pattern);
      for (const hit of hits) {
        for (const quad of hit) {
          matches.push({ page: i, rect: rectFromQuad(quad) });
        }
      }
    }
  }
  return { type: "search", ok: true, data: { matches } };
}

function applyManualRegions(doc: mupdf.PDFDocument, regions: RedactionRegion[]) {
  for (const region of regions) {
    const page = doc.loadPage(region.page);
    const annot = page.createAnnotation("Redact");
    annot.setRect([region.rect.x0, region.rect.y0, region.rect.x1, region.rect.y1]);
  }
}

function applySearchMatches(doc: mupdf.PDFDocument, matches: SearchMatch[]) {
  for (const match of matches) {
    const page = doc.loadPage(match.page);
    const annot = page.createAnnotation("Redact");
    annot.setRect([
      match.rect.x0 - 2,
      match.rect.y0 - 2,
      match.rect.x1 + 2,
      match.rect.y1 + 2,
    ]);
  }
}

function applyRedactions(doc: mupdf.PDFDocument) {
  const pageCount = doc.countPages();
  // Runtime enum value that the TypeScript declarations omit.
  const PDFPageAny = mupdf.PDFPage as unknown as Record<string, number>;
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    page.applyRedactions(
      true,
      PDFPageAny.REDACT_IMAGE_REMOVE_IF_COVERED,
      mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_COVERED,
      mupdf.PDFPage.REDACT_TEXT_REMOVE,
    );
  }
}

async function handleRedact(payload: RedactPayload): Promise<WorkerResponse> {
  if (!currentDoc || !currentBytes) throw new Error("No document loaded");
  // Work on a fresh copy so the original remains available for further edits.
  const doc = (await mupdf.PDFDocument.openDocument(
    new Uint8Array(currentBytes),
    "application/pdf",
  )) as mupdf.PDFDocument;

  if (payload.regions.length > 0) {
    applyManualRegions(doc, payload.regions);
  }
  if (payload.searchMatches.length > 0) {
    applySearchMatches(doc, payload.searchMatches);
  }

  applyRedactions(doc);
  sanitizeDocument(doc);

  const buf = doc.saveToBuffer("garbage=4,compress=yes");
  const raw = buf.asUint8Array();
  const bytes = new Uint8Array(raw.byteLength);
  bytes.set(raw);

  return { type: "redact", ok: true, data: { bytes: bytes.buffer } };
}

async function handleVerify(payload: VerifyPayload): Promise<WorkerResponse> {
  const doc = (await mupdf.PDFDocument.openDocument(
    new Uint8Array(payload.bytes),
    "application/pdf",
  )) as mupdf.PDFDocument;
  let remaining = 0;
  for (let i = 0; i < doc.countPages(); i++) {
    const page = doc.loadPage(i);
    const text = page.toStructuredText().asText();
    for (const term of payload.terms) {
      if (text.includes(term)) {
        remaining += 1;
      }
    }
  }
  return { type: "verify", ok: true, data: { remaining } };
}

async function processMessage(request: WorkerRequest): Promise<WorkerResponse> {
  switch (request.type) {
    case "load":
      return handleLoad(request.payload as LoadPayload);
    case "render":
      return handleRender(request.payload as RenderPayload);
    case "search":
      return handleSearch(request.payload as SearchPayload);
    case "redact":
      return handleRedact(request.payload as RedactPayload);
    case "verify":
      return handleVerify(request.payload as VerifyPayload);
    default:
      throw new Error(`Unknown request type`);
  }
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  try {
    const response = await processMessage(event.data);
    self.postMessage(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: event.data.type, ok: false, error: message });
  }
});

self.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  self.postMessage({ type: "error", ok: false, error: `Unhandled worker error: ${message}` });
  event.preventDefault();
});

self.postMessage({ type: "ready" });
