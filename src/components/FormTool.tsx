import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Loader2,
  MousePointer2,
  Shield,
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
} from "@/lib/fill-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FieldOverlay } from "./FieldOverlay";

const RENDER_DPI = 144;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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

export function FormTool({ title, description }: FormToolProps) {
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
        overlays: [],
        signature: undefined,
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
  }, [values, fileName, ensureFillWorker, downloadFile]);

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
            <p className="font-medium">Drop a PDF here or click to upload</p>
            <p className="text-sm text-muted-foreground">
              Files stay on your device. Max 50 MB.
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
              <canvas ref={canvasRef} className="max-w-full" />
              {fields.length > 0 && currentPageSize && (
                <FieldOverlay
                  fields={fields}
                  page={currentPage}
                  zoom={zoom}
                  values={values}
                  onChange={handleValueChange}
                />
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Edit fields directly on the page or use the sidebar. When you are
              ready, click Fill and download PDF.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <MousePointer2 className="h-4 w-4" />
                <h3 className="font-semibold">Form fields</h3>
              </div>
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

            <div className="space-y-3">
              <Progress
                value={progress}
                className={progress === 0 ? "opacity-0" : ""}
              />
              <Button
                className="w-full"
                disabled={loading || fields.length === 0}
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
