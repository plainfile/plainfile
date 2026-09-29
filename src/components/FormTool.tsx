import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Loader2,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Type,
  ZoomIn,
} from "lucide-react";
import type {
  PageInfo,
  WorkerRequest,
  WorkerResponse,
} from "@/lib/mupdf-engine";
import type {
  FillWorkerRequest,
  FillWorkerResponse,
  FormFieldInfo,
  PageSize,
  SignaturePlacement,
  TextOverlay,
} from "@/lib/fill-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useVisualViewportScroll } from "@/hooks/use-visual-viewport";
import { getFieldLabel } from "@/lib/field-labels";
import { FORMS } from "@/lib/forms";
import { FieldOverlay } from "./FieldOverlay";
import { SignaturePad } from "./SignaturePad";

const RENDER_DPI = 144;
const SCALE = RENDER_DPI / 72;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_PAGES = 200;
const DEFAULT_SIGNATURE_WIDTH = 150;
const DEFAULT_SIGNATURE_HEIGHT = 60;
const DEFAULT_OVERLAY_FONT_SIZE = 14;
const MIN_TAP_SIZE = 44;
const PREVIEW_PADDING = 16;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createRedactWorker(onFatal?: (message: string) => void): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/redact.worker.ts", import.meta.url),
      { type: "module" },
    );
    const readyHandler = (event: MessageEvent) => {
      if (event.data?.type === "ready") {
        worker.removeEventListener("message", readyHandler);
        worker.addEventListener("error", (event) => {
          const message = event.message || "Worker encountered an unexpected error";
          onFatal?.(message);
        });
        worker.addEventListener("messageerror", () => {
          onFatal?.("Worker message could not be deserialized");
        });
        resolve(worker);
      }
    };
    const startErrorHandler = (event: ErrorEvent) => {
      const message =
        event.message || event.error?.message || "Worker failed to start";
      onFatal?.(message);
      reject(new Error(message));
    };
    worker.addEventListener("message", readyHandler);
    worker.addEventListener("error", startErrorHandler, { once: true });
  });
}

function postRedactMessage(
  worker: Worker,
  request: WorkerRequest,
): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent<WorkerResponse>) => {
      worker.removeEventListener("message", handler);
      if (event.data.ok) {
        resolve(event.data);
      } else {
        reject(new Error(event.data.error ?? "Worker error"));
      }
    };
    worker.addEventListener("message", handler);
    try {
      worker.postMessage(request);
    } catch (err: unknown) {
      worker.removeEventListener("message", handler);
      const message = err instanceof Error ? err.message : "Failed to send message to worker";
      reject(new Error(message));
    }
  });
}

function createFillWorker(onFatal?: (message: string) => void): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/fill.worker.ts", import.meta.url),
      { type: "module" },
    );
    const readyHandler = (event: MessageEvent) => {
      if (event.data?.type === "ready") {
        worker.removeEventListener("message", readyHandler);
        worker.addEventListener("error", (event) => {
          const message = event.message || "Worker encountered an unexpected error";
          onFatal?.(message);
        });
        worker.addEventListener("messageerror", () => {
          onFatal?.("Worker message could not be deserialized");
        });
        resolve(worker);
      }
    };
    const startErrorHandler = (event: ErrorEvent) => {
      const message =
        event.message || event.error?.message || "Worker failed to start";
      onFatal?.(message);
      reject(new Error(message));
    };
    worker.addEventListener("message", readyHandler);
    worker.addEventListener("error", startErrorHandler, { once: true });
  });
}

type FillWorkerSuccessResponse = Extract<FillWorkerResponse, { ok: true }>;

function postFillMessage(
  worker: Worker,
  request: FillWorkerRequest,
): Promise<FillWorkerSuccessResponse> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent<FillWorkerResponse>) => {
      worker.removeEventListener("message", handler);
      if (event.data.ok) {
        resolve(event.data as FillWorkerSuccessResponse);
      } else {
        reject(new Error(event.data.error ?? "Worker error"));
      }
    };
    worker.addEventListener("message", handler);
    try {
      worker.postMessage(request);
    } catch (err: unknown) {
      worker.removeEventListener("message", handler);
      const message = err instanceof Error ? err.message : "Failed to send message to worker";
      reject(new Error(message));
    }
  });
}

export interface FormToolProps {
  title?: string;
  description?: string;
  // Optional initial PDF bytes/fileName for scenario pages (D4). Not used in D2.
  initialPdf?: { bytes: ArrayBuffer; fileName: string };
  // Optional form ID for looking up human-readable field labels.
  formId?: string;
}

export function FormTool({ title, description, initialPdf, formId }: FormToolProps) {
  const formConfig = useMemo(() => FORMS.find((f) => f.id === formId), [formId]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const pageBitmapRef = useRef<ImageBitmap | null>(null);
  const originalBytesRef = useRef<Uint8Array | null>(null);
  const redactWorkerPromiseRef = useRef<Promise<Worker> | null>(null);
  const fillWorkerPromiseRef = useRef<Promise<Worker> | null>(null);
  const pinchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [fields, setFields] = useState<FormFieldInfo[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [baseZoom, setBaseZoom] = useState(1);
  const [userZoom, setUserZoom] = useState(1);

  const [activeTool, setActiveTool] = useState<"form" | "text" | "signature">("form");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [editingOverlayId, setEditingOverlayId] = useState<number | null>(null);
  const [signature, setSignature] = useState<SignaturePlacement | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);

  useVisualViewportScroll();

  const zoom = baseZoom * userZoom;

  const handleWorkerFatal = useCallback((message: string) => {
    setLoading(false);
    setError(
      `${message}. The worker stopped unexpectedly. Please reload the page and try again.`,
    );
    redactWorkerPromiseRef.current
      ?.then((w) => w.terminate())
      .catch(() => {
        // ignore termination errors
      });
    fillWorkerPromiseRef.current
      ?.then((w) => w.terminate())
      .catch(() => {
        // ignore termination errors
      });
    redactWorkerPromiseRef.current = null;
    fillWorkerPromiseRef.current = null;
  }, []);

  useEffect(() => {
    redactWorkerPromiseRef.current = createRedactWorker(handleWorkerFatal);
    fillWorkerPromiseRef.current = createFillWorker(handleWorkerFatal);
    return () => {
      redactWorkerPromiseRef.current
        ?.then((w) => w.terminate())
        .catch(() => {
          // ignore termination errors
        });
      redactWorkerPromiseRef.current = null;
      fillWorkerPromiseRef.current
        ?.then((w) => w.terminate())
        .catch(() => {
          // ignore termination errors
        });
      fillWorkerPromiseRef.current = null;
    };
  }, [handleWorkerFatal]);

  const ensureRedactWorker = useCallback(async () => {
    if (!redactWorkerPromiseRef.current) {
      redactWorkerPromiseRef.current = createRedactWorker(handleWorkerFatal);
    }
    return redactWorkerPromiseRef.current;
  }, [handleWorkerFatal]);

  const ensureFillWorker = useCallback(async () => {
    if (!fillWorkerPromiseRef.current) {
      fillWorkerPromiseRef.current = createFillWorker(handleWorkerFatal);
    }
    return fillWorkerPromiseRef.current;
  }, [handleWorkerFatal]);

  const measureZoom = useCallback(() => {
    const container = previewRef.current;
    const size = pageSizes[currentPage];
    if (!container || !size) return;
    const available = Math.max(100, container.clientWidth - PREVIEW_PADDING);
    setBaseZoom(available / size.width);
  }, [pageSizes, currentPage]);

  // Apply the current zoom to the canvas CSS size so overlays stay aligned.
  useEffect(() => {
    const canvas = canvasRef.current;
    const size = pageSizes[currentPage];
    if (!canvas || !size) return;
    canvas.style.width = `${size.width * zoom}px`;
    canvas.style.height = `${size.height * zoom}px`;
  }, [zoom, pageSizes, currentPage]);

  const canvasToPdfPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const size = pageSizes[currentPage];
      if (!canvas || !size) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (clientX - rect.left) * scaleX;
      const py = (clientY - rect.top) * scaleY;
      return {
        x: px / SCALE,
        y: py / SCALE,
      };
    },
    [pageSizes, currentPage],
  );

  useEffect(() => {
    measureZoom();
    const handleResize = () => measureZoom();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measureZoom]);

  const zoomIn = useCallback(() => {
    setUserZoom((prev) => Math.min(3, Math.round(prev * 1.2 * 100) / 100));
  }, []);

  const zoomOut = useCallback(() => {
    setUserZoom((prev) => Math.max(0.25, Math.round(prev / 1.2 * 100) / 100));
  }, []);

  const resetZoom = useCallback(() => {
    setUserZoom(1);
  }, []);

  const getPinchDistance = useCallback(() => {
    const points = Array.from(pinchPointersRef.current.values());
    if (points.length !== 2) return 0;
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    return Math.hypot(dx, dy);
  }, []);

  const handlePreviewPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activeTool !== "form") return;
      const target = event.currentTarget;
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      pinchPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (pinchPointersRef.current.size === 2) {
        const distance = getPinchDistance();
        if (distance > 0) {
          pinchStartRef.current = { distance, zoom: userZoom };
        }
      }
    },
    [activeTool, userZoom, getPinchDistance],
  );

  const handlePreviewPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activeTool !== "form") return;
      if (!pinchPointersRef.current.has(event.pointerId)) return;
      pinchPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (pinchPointersRef.current.size === 2 && pinchStartRef.current) {
        event.preventDefault();
        const distance = getPinchDistance();
        if (distance > 0 && pinchStartRef.current.distance > 0) {
          const next =
            pinchStartRef.current.zoom * (distance / pinchStartRef.current.distance);
          setUserZoom(Math.min(3, Math.max(0.25, Math.round(next * 100) / 100)));
        }
      }
    },
    [activeTool, getPinchDistance],
  );

  const handlePreviewPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      pinchPointersRef.current.delete(event.pointerId);
      if (pinchPointersRef.current.size < 2) {
        pinchStartRef.current = null;
      }
    },
    [],
  );

  const renderPage = useCallback(
    async (pageIndex: number) => {
      const worker = await ensureRedactWorker();
      setProgress(10);
      const response = await postRedactMessage(worker, {
        type: "render",
        payload: { page: pageIndex, dpi: RENDER_DPI },
      });
      setProgress(100);
      const { png, width, height } = response.data as {
        png: Uint8Array;
        width: number;
        height: number;
      };

      pageBitmapRef.current?.close();
      pageBitmapRef.current = await createImageBitmap(
        new Blob([new Uint8Array(png)], { type: "image/png" }),
      );

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx && pageBitmapRef.current) {
          ctx.drawImage(pageBitmapRef.current, 0, 0);
        }
      }
      measureZoom();
      setTimeout(() => setProgress(0), 300);
    },
    [ensureRedactWorker, measureZoom],
  );

  // Render the current page whenever it changes or when page sizes become available.
  // This effect synchronizes the canvas with the active page state.
  useEffect(() => {
    if (!fileName || !pageSizes[currentPage]) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    renderPage(currentPage);
  }, [currentPage, fileName, pageSizes, renderPage]);

  const loadFile = useCallback(
    async (file: File) => {
      try {
        if (
          file.type !== "application/pdf" &&
          !file.name.toLowerCase().endsWith(".pdf")
        ) {
          setError("Please upload a PDF file.");
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(
            `File is too large (${formatSize(file.size)}). Maximum file size is ${formatSize(MAX_FILE_SIZE)}.`,
          );
          return;
        }

        setLoading(true);
        setError(null);
        setProgress(5);
        setOutputBytes(null);
        setFields([]);
        setValues({});
        setPageSizes([]);
        setCurrentPage(0);
        setUserZoom(1);

        const bytes = await file.arrayBuffer();
        originalBytesRef.current = new Uint8Array(bytes);
        setFileName(file.name);

        const redactWorker = await ensureRedactWorker();
        const loadResponse = await postRedactMessage(redactWorker, {
          type: "load",
          payload: { bytes },
        });
        setProgress(50);
        const { pages: pageInfos } = loadResponse.data as {
          pages: PageInfo[];
        };
        if (pageInfos.length > MAX_PAGES) {
          setLoading(false);
          setError(
            `This PDF has ${pageInfos.length} pages. The maximum supported is ${MAX_PAGES} pages. Please upload a shorter PDF.`,
          );
          return;
        }
        setPages(pageInfos);

        const fillWorker = await ensureFillWorker();
        const inspectResponse = await postFillMessage(fillWorker, {
          id: 1,
          op: "inspect",
          bytes: new Uint8Array(bytes),
        });
        if (inspectResponse.op !== "inspect") {
          throw new Error("Unexpected worker response");
        }
        const { fields: formFields, pageSizes: sizes } = inspectResponse.result;
        const virtualFields = formConfig?.virtualFields ?? [];
        const mergedFields: FormFieldInfo[] = [
          ...formFields,
          ...virtualFields.map((vf) => ({
            name: vf.name,
            type: vf.type,
            page: vf.page,
            rect: vf.rect,
            value: vf.type === "checkbox" ? false : "",
          })),
        ];
        setFields(mergedFields);
        setPageSizes(sizes);
        const initialValues: Record<string, string | boolean> = {};
        for (const field of mergedFields) {
          initialValues[field.name] = field.value;
        }
        setValues(initialValues);

        if (pageInfos.length > 0) {
          setCurrentPage(0);
        }
        setLoading(false);
      } catch (err: unknown) {
        setLoading(false);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [ensureRedactWorker, ensureFillWorker, formConfig],
  );

  const initialLoadStartedRef = useRef(false);

  useEffect(() => {
    // Auto-load the provided template once. Guard against re-runs caused by
    // loadFile reference changes during the initial load sequence.
    if (!initialPdf || initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    const syntheticFile = new File([initialPdf.bytes], initialPdf.fileName, {
      type: "application/pdf",
    });
    void loadFile(syntheticFile);
  }, [initialPdf, loadFile]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) void loadFile(file);
    },
    [loadFile],
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void loadFile(file);
    },
    [loadFile],
  );

  const handleValueChange = useCallback(
    (name: string, value: string | boolean) => {
      setValues((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const scrollToField = useCallback((name: string) => {
    const sideEl = document.getElementById(`field-side-${name}`);
    const overlayEl = document.getElementById(`field-overlay-${name}`);
    if (sideEl) {
      sideEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (overlayEl) {
      overlayEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, []);

  const handleFieldFocus = useCallback(
    (name: string) => {
      const field = fields.find((f) => f.name === name);
      if (field && field.page !== currentPage) {
        setCurrentPage(field.page);
      }
      // Allow the layout/page render to settle before scrolling.
      window.setTimeout(() => scrollToField(name), 50);
    },
    [fields, currentPage, scrollToField],
  );

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool !== "text" || !pageSizes[currentPage]) return;
      const point = canvasToPdfPoint(event.clientX, event.clientY);
      let newIndex = 0;
      setTextOverlays((prev) => {
        newIndex = prev.length;
        const newOverlay: TextOverlay = {
          page: currentPage,
          x: point.x,
          y: point.y,
          text: "",
          fontSize: DEFAULT_OVERLAY_FONT_SIZE,
        };
        return [...prev, newOverlay];
      });
      setEditingOverlayId(newIndex);
      setActiveTool("form");
    },
    [activeTool, canvasToPdfPoint, currentPage, pageSizes],
  );

  const updateOverlayText = useCallback((index: number, text: string) => {
    setTextOverlays((prev) =>
      prev.map((overlay, idx) => (idx === index ? { ...overlay, text } : overlay)),
    );
  }, []);

  const deleteOverlay = useCallback((index: number) => {
    setTextOverlays((prev) => prev.filter((_, idx) => idx !== index));
    setEditingOverlayId((prev) => (prev === index ? null : prev));
  }, []);

  const handleSignature = useCallback(
    (pngBytes: Uint8Array) => {
      const size = pageSizes[currentPage];
      if (!size) return;
      setSignature({
        page: currentPage,
        x: size.width / 2 - DEFAULT_SIGNATURE_WIDTH / 2,
        y: size.height / 2 - DEFAULT_SIGNATURE_HEIGHT / 2,
        width: DEFAULT_SIGNATURE_WIDTH,
        height: DEFAULT_SIGNATURE_HEIGHT,
        pngBytes,
      });
      setActiveTool("form");
    },
    [currentPage, pageSizes],
  );

  const downloadFile = useCallback((bytes: Uint8Array, name: string | null) => {
    if (!name) return;
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name.replace(/\.pdf$/i, "-filled.pdf");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleFill = useCallback(async () => {
    if (!originalBytesRef.current || !fileName) return;
    try {
      setLoading(true);
      setError(null);
      setProgress(30);

      // Split values into AcroForm fields and manually-defined virtual fields.
      const virtualFieldMap = new Map(
        (formConfig?.virtualFields ?? []).map((vf) => [vf.name, vf]),
      );
      const acroValues: Record<string, string | boolean> = {};
      const virtualOverlays: TextOverlay[] = [];
      for (const [name, value] of Object.entries(values)) {
        const vf = virtualFieldMap.get(name);
        if (vf) {
          if (vf.type === "text" && typeof value === "string" && value.trim() !== "") {
            virtualOverlays.push({
              page: vf.page,
              x: vf.rect.x,
              y: vf.rect.y + vf.rect.height - DEFAULT_OVERLAY_FONT_SIZE - 2,
              text: value,
              fontSize: DEFAULT_OVERLAY_FONT_SIZE,
            });
          }
        } else {
          acroValues[name] = value;
        }
      }

      const worker = await ensureFillWorker();
      const response = await postFillMessage(worker, {
        id: 2,
        op: "fill",
        bytes: originalBytesRef.current,
        values: acroValues,
        overlays: [...textOverlays, ...virtualOverlays],
        signature: signature ?? undefined,
        flatten: true,
      });
      if (response.op !== "fill") {
        throw new Error("Unexpected worker response");
      }
      setProgress(100);
      setOutputBytes(response.bytes);
      downloadFile(response.bytes, fileName);
      setLoading(false);
      setTimeout(() => setProgress(0), 300);
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [values, textOverlays, signature, fileName, ensureFillWorker, downloadFile, formConfig]);

  const handleDownload = useCallback(() => {
    if (!outputBytes || !fileName) return;
    downloadFile(outputBytes, fileName);
  }, [outputBytes, fileName, downloadFile]);

  const displayTitle = title ?? "Fill PDF Forms — Free, No Upload, No Sign Up";
  const displayDescription =
    description ?? "Fill PDF forms in your browser. Your data never leaves your device.";

  const currentPageSize = pageSizes[currentPage];

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{displayTitle}</h1>
          <p className="text-muted-foreground">{displayDescription}</p>
        </div>
      </div>

      {!fileName ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-muted/30 px-6 py-16 text-center transition-colors hover:bg-muted/50"
        >
          <FileUp className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {initialPdf
                ? `Template loaded: ${initialPdf.fileName}`
                : "Drop a PDF here or click to upload"}
            </p>
            <p className="text-sm text-muted-foreground">
              {initialPdf
                ? "Drop a different PDF below to replace the template."
                : "Files stay on your device. Max 50 MB."}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{fileName}</span>
                <span>&middot;</span>
                <span>
                  Page {currentPage + 1} of {pages.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 sm:hidden">
                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11"
                    onClick={zoomOut}
                    aria-label="Zoom out"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11"
                    onClick={resetZoom}
                    aria-label="Reset zoom"
                    title={`${Math.round(userZoom * 100)}%`}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11"
                    onClick={zoomIn}
                    aria-label="Zoom in"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-8"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-8"
                  disabled={currentPage >= pages.length - 1}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(pages.length - 1, p + 1))
                  }
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>

            <div
              ref={previewRef}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerCancel={handlePreviewPointerUp}
              className="relative overflow-auto rounded-lg border bg-white p-2 shadow-sm dark:bg-black"
            >
              <canvas
                ref={canvasRef}
                className={`${activeTool === "text" ? "cursor-crosshair" : ""}`}
                onClick={handleCanvasClick}
              />
              {fields.length > 0 && currentPageSize && (
                <FieldOverlay
                  fields={fields}
                  page={currentPage}
                  zoom={zoom}
                  values={values}
                  onChange={handleValueChange}
                  onFieldFocus={handleFieldFocus}
                />
              )}
              {currentPageSize && (
                <OverlayLayer
                  textOverlays={textOverlays}
                  signature={signature}
                  page={currentPage}
                  zoom={zoom}
                  editingId={editingOverlayId}
                  onEdit={setEditingOverlayId}
                  onChangeText={updateOverlayText}
                  onDelete={deleteOverlay}
                  onMoveSignature={(x, y) =>
                    setSignature((prev) => (prev ? { ...prev, x, y } : prev))
                  }
                />
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {activeTool === "text"
                ? "Click on the page where you want to add text."
                : "Edit fields directly on the page or use the sidebar. Add text or a signature from the sidebar."}
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <MousePointer2 className="h-4 w-4" />
                <h3 className="font-semibold">Tools</h3>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-2">
                <Button
                  variant={activeTool === "form" ? "default" : "outline"}
                  size="sm"
                  className="min-h-11 sm:min-h-8"
                  onClick={() => setActiveTool("form")}
                  aria-pressed={activeTool === "form"}
                >
                  <MousePointer2 className="mr-1 h-3 w-3" />
                  Form
                </Button>
                <Button
                  variant={activeTool === "text" ? "default" : "outline"}
                  size="sm"
                  className="min-h-11 sm:min-h-8"
                  onClick={() => setActiveTool("text")}
                  aria-pressed={activeTool === "text"}
                >
                  <Type className="mr-1 h-3 w-3" />
                  Text
                </Button>
                <Button
                  variant={activeTool === "signature" ? "default" : "outline"}
                  size="sm"
                  className="min-h-11 sm:min-h-8"
                  onClick={() => setSignatureOpen(true)}
                  aria-pressed={activeTool === "signature"}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Sign
                </Button>
              </div>

              <h4 className="mb-2 text-sm font-semibold">Form fields</h4>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No AcroForm fields found. You can still fill flat PDFs once
                  text overlay support is enabled.
                </p>
              ) : (
                <ul className="max-h-[60vh] space-y-3 overflow-auto pr-1">
                  {fields.map((field) => {
                    const value = values[field.name];
                    return (
                      <li
                        key={field.name}
                        id={`field-side-${field.name}`}
                        className="space-y-1 rounded-md border p-2 text-sm"
                      >
                        <Label
                          htmlFor={`field-${field.name}`}
                          className="block text-xs text-muted-foreground"
                        >
                          {getFieldLabel(formId, field.name)}
                          {field.page !== currentPage && (
                            <span className="ml-1 text-[10px]">
                              (page {field.page + 1})
                            </span>
                          )}
                        </Label>
                        {renderSideInput(field, value, handleValueChange, handleFieldFocus)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {(textOverlays.length > 0 || signature) && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <h4 className="mb-2 text-sm font-semibold">Overlays</h4>
                {textOverlays.length > 0 && (
                  <ul className="mb-3 max-h-[30vh] space-y-2 overflow-auto">
                    {textOverlays.map((overlay, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <span className="truncate">
                          {overlay.text || `(text ${idx + 1})`}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                          onClick={() => deleteOverlay(idx)}
                          aria-label={`Delete text overlay ${idx + 1}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {signature && (
                  <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm">
                    <span>Signature</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                      onClick={() => setSignature(null)}
                      aria-label="Delete signature"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Progress
                value={progress}
                className={progress === 0 ? "opacity-0" : ""}
              />
              <Button
                className="w-full min-h-11"
                disabled={
                  loading ||
                  (fields.length === 0 && textOverlays.length === 0 && !signature)
                }
                onClick={() => void handleFill()}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Fill and download PDF
              </Button>
              {outputBytes && (
                <Button
                  variant="outline"
                  className="w-full min-h-11"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download filled PDF
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full min-h-11"
                onClick={() => window.location.reload()}
              >
                Start over
              </Button>
            </div>
          </div>
        </div>
      )}

      <SignaturePad
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        onSignature={handleSignature}
      />

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function renderSideInput(
  field: FormFieldInfo,
  value: string | boolean | undefined,
  onChange: (name: string, value: string | boolean) => void,
  onFocus?: (name: string) => void,
): React.ReactNode {
  const inputId = `field-${field.name}`;

  switch (field.type) {
    case "text":
      return (
        <Input
          id={inputId}
          type="text"
          maxLength={field.maxLength}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(field.name, event.target.value)}
          onFocus={() => onFocus?.(field.name)}
          className="h-8 min-h-11 text-sm"
        />
      );
    case "checkbox":
      return (
        <div className="flex min-h-11 items-center gap-2 py-1">
          <Checkbox
            id={inputId}
            checked={value === true}
            onCheckedChange={(state) => onChange(field.name, state === true)}
            onFocus={() => onFocus?.(field.name)}
          />
          <Label htmlFor={inputId} className="text-xs">
            Yes
          </Label>
        </div>
      );
    case "radio":
    case "dropdown":
    case "optionlist": {
      const options = field.options ?? [];
      const stringValue = typeof value === "string" ? value : "";
      return (
        <select
          id={inputId}
          value={stringValue}
          onChange={(event) => onChange(field.name, event.target.value)}
          onFocus={() => onFocus?.(field.name)}
          className="h-8 min-h-11 w-full rounded border border-input bg-background px-2 text-sm focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    default:
      return null;
  }
}

interface OverlayLayerProps {
  textOverlays: TextOverlay[];
  signature: SignaturePlacement | null;
  page: number;
  zoom: number;
  editingId: number | null;
  onEdit: (id: number | null) => void;
  onChangeText: (index: number, text: string) => void;
  onDelete: (index: number) => void;
  onMoveSignature: (x: number, y: number) => void;
}

function OverlayLayer({
  textOverlays,
  signature,
  page,
  zoom,
  editingId,
  onEdit,
  onChangeText,
  onDelete,
  onMoveSignature,
}: OverlayLayerProps): React.ReactNode {
  const pageOverlays = textOverlays.filter((o) => o.page === page);

  return (
    <>
      {pageOverlays.map((overlay, globalIndex) => {
        const isEditing = editingId === globalIndex;
        return (
          <div
            key={globalIndex}
            className="absolute"
            style={{
              left: overlay.x * zoom,
              top: overlay.y * zoom,
              minWidth: MIN_TAP_SIZE,
              minHeight: MIN_TAP_SIZE,
            }}
          >
            {isEditing ? (
              <Input
                autoFocus
                value={overlay.text}
                onChange={(event) => onChangeText(globalIndex, event.target.value)}
                onBlur={() => {
                  if (!overlay.text.trim()) {
                    onDelete(globalIndex);
                  }
                  onEdit(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (!overlay.text.trim()) {
                      onDelete(globalIndex);
                    }
                    onEdit(null);
                  }
                }}
                className="h-auto min-h-[44px] border-[#0066CC] bg-white/95 px-1 py-0 text-sm shadow-sm dark:bg-black/95"
                style={{ fontSize: overlay.fontSize * zoom }}
              />
            ) : (
              <div
                onClick={() => onEdit(globalIndex)}
                className="cursor-pointer whitespace-nowrap bg-white/90 px-1 py-0.5 text-sm shadow-sm hover:bg-white dark:bg-black/90 dark:hover:bg-black"
                style={{ fontSize: overlay.fontSize * zoom }}
              >
                {overlay.text}
              </div>
            )}
          </div>
        );
      })}
      {signature && signature.page === page && (
        <DraggableSignature
          signature={signature}
          zoom={zoom}
          onMove={onMoveSignature}
        />
      )}
    </>
  );
}

interface DraggableSignatureProps {
  signature: SignaturePlacement;
  zoom: number;
  onMove: (x: number, y: number) => void;
}

function DraggableSignature({
  signature,
  zoom,
  onMove,
}: DraggableSignatureProps): React.ReactNode {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number; sigX: number; sigY: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    container.setPointerCapture(event.pointerId);
    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      sigX: signature.x,
      sigY: signature.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    event.preventDefault();
    const deltaX = (event.clientX - startRef.current.x) / zoom;
    const deltaY = (event.clientY - startRef.current.y) / zoom;
    onMove(startRef.current.sigX + deltaX, startRef.current.sigY + deltaY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (container) {
      try {
        container.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }
    startRef.current = null;
  };

  const url = URL.createObjectURL(
    new Blob([signature.pngBytes.buffer as ArrayBuffer], { type: "image/png" }),
  );

  return (
    <div
      ref={containerRef}
      className="absolute cursor-move touch-none"
      style={{
        left: signature.x * zoom,
        top: signature.y * zoom,
        width: Math.max(signature.width * zoom, MIN_TAP_SIZE),
        height: Math.max(signature.height * zoom, MIN_TAP_SIZE),
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <img
        src={url}
        alt="Signature"
        className="pointer-events-none h-full w-full object-contain"
        onLoad={() => URL.revokeObjectURL(url)}
      />
    </div>
  );
}
