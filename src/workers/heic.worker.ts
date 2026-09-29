import type { HeicWorkerRequest, HeicWorkerResponse } from "@/lib/heic-engine";
import wasmUrl from "libheif-js/libheif-wasm/libheif.wasm?url";

interface HeifImageHandle {
  delete(): void;
}

interface HeifContext {
  delete(): void;
}

interface HeifErrorValue {
  value: number;
}

interface HeifImageDisplay {
  get_width(): number;
  get_height(): number;
  has_alpha_channel(): number;
  display(imageData: ImageData, callback: (imageData: ImageData | null) => void): void;
  free(): void;
}

interface LibheifModule {
  HeifImage: new (handle: HeifImageHandle) => HeifImageDisplay;
  heif_context_alloc(): HeifContext;
  heif_context_free(context: HeifContext): void;
  heif_context_read_from_memory(context: HeifContext, bytes: Uint8Array): { code: HeifErrorValue; message?: EmbindString };
  heif_context_get_number_of_top_level_images(context: HeifContext): number;
  heif_js_context_get_primary_image_handle(context: HeifContext): HeifImageHandle | { code: HeifErrorValue };
  heif_image_handle_get_width(handle: HeifImageHandle): number;
  heif_image_handle_get_height(handle: HeifImageHandle): number;
  heif_image_handle_release(handle: HeifImageHandle): void;
  heif_error_code: { heif_error_Ok: { value: number } };
}

type EmbindString = string | ArrayBuffer | Uint8Array | Int8Array;

let libheifPromise: Promise<LibheifModule> | null = null;

async function getLibheif(): Promise<LibheifModule> {
  if (!libheifPromise) {
    libheifPromise = (async () => {
      const { default: createLibheif } = await import("libheif-js/libheif-wasm/libheif.js");
      const wasmResponse = await fetch(wasmUrl);
      if (!wasmResponse.ok) {
        throw new Error(`Failed to load libheif.wasm: ${wasmResponse.status} ${wasmResponse.statusText}`);
      }
      const wasmBinary = new Uint8Array(await wasmResponse.arrayBuffer());
      return createLibheif({ wasmBinary }) as unknown as LibheifModule;
    })();
  }
  return libheifPromise;
}

function hasErrorCode(value: unknown): value is { code: HeifErrorValue } {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code?: HeifErrorValue }).code?.value === "number"
  );
}

function isOk(error: { code: HeifErrorValue }, libheif: LibheifModule): boolean {
  return error.code.value === libheif.heif_error_code.heif_error_Ok.value;
}

interface OrientationRotation {
  dimensionSwapped: boolean;
  scaleX: number;
  scaleY: number;
  rad: number;
}

async function getRotation(bytes: Uint8Array): Promise<OrientationRotation> {
  const exifr = await import("exifr");
  const orientation = await exifr.orientation(bytes);
  const rotation = exifr.rotations[orientation ?? 1];
  return rotation ?? { dimensionSwapped: false, scaleX: 1, scaleY: 1, rad: 0 };
}

async function decodePrimaryImage(
  libheif: LibheifModule,
  bytes: Uint8Array,
): Promise<{ imageData: ImageData; rawWidth: number; rawHeight: number }> {
  const context = libheif.heif_context_alloc();
  if (!context) {
    throw new Error("Could not create HEIF context");
  }

  let handle: HeifImageHandle | null = null;
  let image: HeifImageDisplay | null = null;

  try {
    const readError = libheif.heif_context_read_from_memory(context, bytes);
    if (!isOk(readError, libheif)) {
      throw new Error(readError.message ? String(readError.message) : "Could not read HEIC file");
    }

    const primary = libheif.heif_js_context_get_primary_image_handle(context);
    if (!primary || hasErrorCode(primary)) {
      throw new Error("Could not get primary HEIC image");
    }
    handle = primary;

    image = new libheif.HeifImage(handle);
    const rawWidth = image.get_width();
    const rawHeight = image.get_height();
    const imageData = new ImageData(rawWidth, rawHeight);

    const result = await new Promise<ImageData>((resolve, reject) => {
      image!.display(imageData, (displayed) => {
        if (displayed) {
          resolve(displayed);
        } else {
          reject(new Error("Could not decode HEIC image"));
        }
      });
    });

    image.free();
    image = null;

    return { imageData: result, rawWidth, rawHeight };
  } finally {
    if (image) {
      image.free();
    }
    if (handle) {
      libheif.heif_image_handle_release(handle);
    }
    libheif.heif_context_free(context);
  }
}

async function applyOrientation(
  imageData: ImageData,
  rawWidth: number,
  rawHeight: number,
  rotation: OrientationRotation,
): Promise<{ canvas: OffscreenCanvas; width: number; height: number }> {
  const targetWidth = rotation.dimensionSwapped ? rawHeight : rawWidth;
  const targetHeight = rotation.dimensionSwapped ? rawWidth : rawHeight;

  const sourceCanvas = new OffscreenCanvas(rawWidth, rawHeight);
  const sourceContext = sourceCanvas.getContext("2d");
  if (!sourceContext) {
    throw new Error("Could not create source canvas context");
  }
  sourceContext.putImageData(imageData, 0, 0);

  const targetCanvas = new OffscreenCanvas(targetWidth, targetHeight);
  const targetContext = targetCanvas.getContext("2d");
  if (!targetContext) {
    throw new Error("Could not create target canvas context");
  }

  targetContext.translate(targetWidth / 2, targetHeight / 2);
  targetContext.rotate(rotation.rad);
  targetContext.scale(rotation.scaleX, rotation.scaleY);
  targetContext.drawImage(sourceCanvas, -rawWidth / 2, -rawHeight / 2);

  return { canvas: targetCanvas, width: targetWidth, height: targetHeight };
}

async function handleProbe(request: Extract<HeicWorkerRequest, { op: "probe" }>): Promise<HeicWorkerResponse> {
  const libheif = await getLibheif();
  const context = libheif.heif_context_alloc();
  if (!context) {
    throw new Error("Could not create HEIF context");
  }

  let handle: HeifImageHandle | null = null;

  try {
    const readError = libheif.heif_context_read_from_memory(context, request.bytes);
    if (!isOk(readError, libheif)) {
      throw new Error(readError.message ? String(readError.message) : "Could not read HEIC file");
    }

    const imageCount = libheif.heif_context_get_number_of_top_level_images(context);

    const primary = libheif.heif_js_context_get_primary_image_handle(context);
    if (!primary || hasErrorCode(primary)) {
      throw new Error("Could not get primary HEIC image");
    }
    handle = primary;

    const rawWidth = libheif.heif_image_handle_get_width(handle);
    const rawHeight = libheif.heif_image_handle_get_height(handle);

    const rotation = await getRotation(request.bytes);
    const width = rotation.dimensionSwapped ? rawHeight : rawWidth;
    const height = rotation.dimensionSwapped ? rawWidth : rawHeight;

    return {
      id: request.id,
      op: "probe",
      ok: true,
      imageCount,
      width,
      height,
    };
  } finally {
    if (handle) {
      libheif.heif_image_handle_release(handle);
    }
    libheif.heif_context_free(context);
  }
}

async function handleConvert(
  request: Extract<HeicWorkerRequest, { op: "convert" }>,
): Promise<HeicWorkerResponse> {
  const start = performance.now();
  const libheif = await getLibheif();

  const { imageData, rawWidth, rawHeight } = await decodePrimaryImage(libheif, request.bytes);
  const rotation = await getRotation(request.bytes);
  const { canvas, width, height } = await applyOrientation(imageData, rawWidth, rawHeight, rotation);

  const mimeType = request.format === "jpeg" ? "image/jpeg" : "image/png";
  const options: ImageEncodeOptions = { type: mimeType };
  if (request.format === "jpeg") {
    options.quality = request.quality;
  }

  const blob = await canvas.convertToBlob(options);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const durationMs = Math.round(performance.now() - start);

  return {
    id: request.id,
    op: "convert",
    ok: true,
    bytes,
    width,
    height,
    durationMs,
  };
}

async function handleRequest(request: HeicWorkerRequest): Promise<HeicWorkerResponse> {
  switch (request.op) {
    case "probe":
      return handleProbe(request);
    case "convert":
      return handleConvert(request);
    default:
      throw new Error(`Unknown operation: ${(request as { op?: string }).op ?? "undefined"}`);
  }
}

self.addEventListener("message", async (event: MessageEvent<HeicWorkerRequest>) => {
  const request = event.data;
  try {
    const response = await handleRequest(request);
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
