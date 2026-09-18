import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Loader2,
  MousePointer2,
  Pencil,
  Shield,
  Trash2,
  Type,
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FieldOverlay } from "./FieldOverlay";
import { SignaturePad } from "./SignaturePad";

const RENDER_DPI = 144;
const SCALE = RENDER_DPI / 72;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const DEFAULT_SIGNATURE_WIDTH = 150;
const DEFAULT_SIGNATURE_HEIGHT = 60;
const DEFAULT_OVERLAY_FONT_SIZE = 14;

function createRedactWorker(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/redact.worker.ts", import.meta.url),
      { type: "module" },
    );
    const readyHandler = (event: MessageEvent) => {
      if (event.data?.type === "ready") {
        worker.removeEventListener("message", readyHandler);
        resolve(worker);
      }
    };
    worker.addEventListener("message", readyHandler);
    worker.addEventListener("error", reject);
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
    worker.postMessage(request);
  });
}

function createFillWorker(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/fill.worker.ts", import.meta.url),
      { type: "module" },
    );
    const readyHandler = (event: MessageEvent) => {
      if (event.data?.type === "ready") {
        worker.removeEventListener("message", readyHandler);
        resolve(worker);
      }
    };
    worker.addEventListener("message", readyHandler);
    worker.addEventListener("error", reject);
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
    worker.postMessage(request);
  });
}

export interface FormToolProps {
  title?: string;
  description?: string;
  // Optional initial PDF bytes/fileName for scenario pages (D4). Not used in D2.
  initialPdf?: { bytes: ArrayBuffer; fileName: string };
}

export function FormTool({ title, description, initialPdf }: FormToolProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageBitmapRef = useRef<ImageBitmap | null>(null);
  const originalBytesRef = useRef<Uint8Array | null>(null);
  const redactWorkerPromiseRef = useRef<Promise<Worker> | null>(null);
  const fillWorkerPromiseRef = useRef<Promise<Worker> | null>(null);

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
  const [zoom, setZoom] = useState(1);

  const [activeTool, setActiveTool] = useState<"form" | "text" | "signature">("form");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [editingOverlayId, setEditingOverlayId] = useState<number | null>(null);
  const [signature, setSignature] = useState<SignaturePlacement | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);

  useEffect(() => {
    redactWorkerPromiseRef.current = createRedactWorker();
    fillWorkerPromiseRef.current = createFillWorker();
    return () => {
      redactWorkerPromiseRef.current?.then((w) => w.terminate());
      redactWorkerPromiseRef.current = null;
      fillWorkerPromiseRef.current?.then((w) => w.terminate());
      fillWorkerPromiseRef.current = null;
    };
  }, []);

  const ensureRedactWorker = useCallback(async () => {
    if (!redactWorkerPromiseRef.current) {
      redactWorkerPromiseRef.current = createRedactWorker();
    }
    return redactWorkerPromiseRef.current;
  }, []);

  const ensureFillWorker = useCallback(async () => {
    if (!fillWorkerPromiseRef.current) {
      fillWorkerPromiseRef.current = createFillWorker();
    }
    return fillWorkerPromiseRef.current;
  }, []);

  const measureZoom = useCallback(() => {
    const canvas = canvasRef.current;
    const size = pageSizes[currentPage];
    if (!canvas || !size) return;
    setZoom(canvas.clientWidth / size.width);
  }, [pageSizes, currentPage]);

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
          setError("File is too large. Max size is 50 MB.");
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
        setFields(formFields);
        setPageSizes(sizes);
        const initialValues: Record<string, string | boolean> = {};
        for (const field of formFields) {
          initialValues[field.name] = field.value;
        }
        setValues(initialValues);

        if (pageInfos.length > 0) {
          setCurrentPage(0);
          await renderPage(0);
        }
        setLoading(false);
      } catch (err: unknown) {
        setLoading(false);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [ensureRedactWorker, ensureFillWorker, renderPage],
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
      const worker = await ensureFillWorker();
      const response = await postFillMessage(worker, {
        id: 2,
        op: "fill",
        bytes: originalBytesRef.current,
        values,
        overlays: textOverlays,
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
  }, [values, textOverlays, signature, fileName, ensureFillWorker, downloadFile]);

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
        <Badge variant="outline" className="w-fit font-mono text-xs">
          0 bytes uploaded
        </Badge>
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
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

            <div className="relative overflow-auto rounded-lg border bg-white p-2 shadow-sm dark:bg-black">
              <canvas
                ref={canvasRef}
                className={`max-w-full ${activeTool === "text" ? "cursor-crosshair" : ""}`}
                onClick={handleCanvasClick}
              />
              {fields.length > 0 && currentPageSize && (
                <FieldOverlay
                  fields={fields}
                  page={currentPage}
                  zoom={zoom}
                  values={values}
                  onChange={handleValueChange}
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
                  onClick={() => setActiveTool("form")}
                  aria-pressed={activeTool === "form"}
                >
                  <MousePointer2 className="mr-1 h-3 w-3" />
                  Form
                </Button>
                <Button
                  variant={activeTool === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTool("text")}
                  aria-pressed={activeTool === "text"}
                >
                  <Type className="mr-1 h-3 w-3" />
                  Text
                </Button>
                <Button
                  variant={activeTool === "signature" ? "default" : "outline"}
                  size="sm"
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
                        className="space-y-1 rounded-md border p-2 text-sm"
                      >
                        <Label
                          htmlFor={`field-${field.name}`}
                          className="block text-xs text-muted-foreground"
                        >
                          {field.name}
                          {field.page !== currentPage && (
                            <span className="ml-1 text-[10px]">
                              (page {field.page + 1})
                            </span>
                          )}
                        </Label>
                        {renderSideInput(field, value, handleValueChange)}
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
                          className="h-6 w-6 shrink-0"
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
                      className="h-6 w-6 shrink-0"
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
                className="w-full"
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
                  className="w-full"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download filled PDF
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full"
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
          className="h-8 text-sm"
        />
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2 py-1">
          <Checkbox
            id={inputId}
            checked={value === true}
            onCheckedChange={(state) => onChange(field.name, state === true)}
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
          className="h-8 w-full rounded border border-input bg-background px-2 text-sm focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
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
              minWidth: 44,
              minHeight: 44,
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
                className="h-auto border-[#0066CC] bg-white/95 px-1 py-0 text-sm shadow-sm dark:bg-black/95"
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
        width: signature.width * zoom,
        height: signature.height * zoom,
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
