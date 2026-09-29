import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  FileImage,
  FileUp,
  Loader2,
  Trash2,
  X,
  XCircle,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
} from "lucide-react";
import type { HeicTargetFormat, HeicWorkerRequest, HeicWorkerResponse } from "@/lib/heic-engine";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 200;
const DEFAULT_QUALITY = 0.85;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  status: "queued" | "probing" | "converting" | "done" | "error" | "cancelled";
  error?: string;
  probe?: { imageCount: number; width: number; height: number };
  result?: {
    bytes: Uint8Array;
    width: number;
    height: number;
    format: HeicTargetFormat;
    durationMs: number;
  };
}

interface WorkerRef {
  worker: Worker;
  terminate: () => void;
}

function createWorker(): Promise<WorkerRef> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/heic.worker.ts", import.meta.url),
      { type: "module" },
    );

    const readyHandler = (event: MessageEvent) => {
      if (event.data?.type === "ready") {
        worker.removeEventListener("message", readyHandler);
        resolve({
          worker,
          terminate: () => worker.terminate(),
        });
      }
    };

    worker.addEventListener("message", readyHandler);
    worker.addEventListener("error", (event) => {
      worker.removeEventListener("message", readyHandler);
      reject(new Error(event.message || "Worker failed to start"));
    });
  });
}

type HeicWorkerRequestWithoutId = Omit<HeicWorkerRequest, "id">;

type ResponseFor<T extends HeicWorkerRequestWithoutId> =
  T extends { op: "probe" }
    ? Extract<HeicWorkerResponse, { op: "probe" }>
    : T extends { op: "convert" }
      ? Extract<HeicWorkerResponse, { op: "convert" }>
      : never;

function postMessage<T extends HeicWorkerRequestWithoutId>(
  workerRef: WorkerRef,
  request: T,
  signal?: AbortSignal,
): Promise<ResponseFor<T>> {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    let settled = false;

    const handler = (event: MessageEvent<HeicWorkerResponse>) => {
      const data = event.data;
      if (data.id !== id) return;
      settled = true;
      workerRef.worker.removeEventListener("message", handler);
      signal?.removeEventListener("abort", onAbort);
      if (data.ok) {
        resolve(data as ResponseFor<T>);
      } else {
        reject(new Error(data.error ?? "Worker error"));
      }
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      workerRef.worker.removeEventListener("message", handler);
      reject(new Error("Cancelled"));
    };

    workerRef.worker.addEventListener("message", handler);
    signal?.addEventListener("abort", onAbort);
    workerRef.worker.postMessage({ ...request, id });
  });
}

export interface HeicToolProps {
  title?: string;
  description?: string;
}

export function HeicTool({ title, description }: HeicToolProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workerPromiseRef = useRef<Promise<WorkerRef> | null>(null);
  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [format, setFormat] = useState<HeicTargetFormat>("jpeg");
  const [quality, setQuality] = useState<number>(DEFAULT_QUALITY);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);

  const displayTitle = title ?? "HEIC to JPG Converter — Free, No Upload";
  const displayDescription =
    description ?? "Convert iPhone HEIC photos to JPG or PNG in your browser.";

  useEffect(() => {
    workerPromiseRef.current = createWorker();
    return () => {
      abortControllerRef.current?.abort();
      workerPromiseRef.current?.then((ref) => ref.terminate()).catch(() => {});
      workerPromiseRef.current = null;
    };
  }, []);

  const ensureWorker = useCallback(async () => {
    if (!workerPromiseRef.current) {
      workerPromiseRef.current = createWorker();
    }
    return workerPromiseRef.current;
  }, []);

  const resetWorker = useCallback(async () => {
    abortControllerRef.current?.abort();
    workerPromiseRef.current?.then((ref) => ref.terminate()).catch(() => {});
    workerPromiseRef.current = createWorker();
    return workerPromiseRef.current;
  }, []);

  const doneCount = useMemo(
    () => files.filter((f) => f.status === "done").length,
    [files],
  );
  const errorCount = useMemo(
    () => files.filter((f) => f.status === "error").length,
    [files],
  );
  const pendingCount = useMemo(
    () => files.filter((f) => f.status === "queued" || f.status === "probing" || f.status === "converting").length,
    [files],
  );
  const isBusy = pendingCount > 0;
  const canDownload = doneCount > 0;

  const updateFile = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const addFiles = useCallback(
    async (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;

      setGlobalError(null);

      const newFiles: QueuedFile[] = [];
      for (const file of Array.from(incoming)) {
        const lower = file.name.toLowerCase();
        if (!lower.endsWith(".heic") && !lower.endsWith(".heif")) {
          setGlobalError(`"${file.name}" is not a HEIC/HEIF file.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setGlobalError(
            `"${file.name}" is ${formatSize(file.size)}. Maximum file size is ${formatSize(MAX_FILE_SIZE)}.`,
          );
          continue;
        }
        newFiles.push({
          id: generateFileId(),
          file,
          name: file.name,
          status: "queued",
        });
      }

      if (newFiles.length === 0) return;

      setFiles((prev) => {
        const combined = [...prev, ...newFiles];
        if (combined.length > MAX_FILES) {
          setGlobalError(`Maximum ${MAX_FILES} files allowed. Only the first ${MAX_FILES} were kept.`);
          return combined.slice(0, MAX_FILES);
        }
        return combined;
      });
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      void addFiles(event.dataTransfer.files);
    },
    [addFiles],
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      void addFiles(event.target.files);
      event.target.value = "";
    },
    [addFiles],
  );

  const handleCancel = useCallback(async () => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "queued" || f.status === "probing" || f.status === "converting"
          ? { ...f, status: "cancelled" }
          : f,
      ),
    );
    setOverallProgress(0);
    await resetWorker();
    isCancelledRef.current = false;
  }, [resetWorker]);

  const processQueue = useCallback(async () => {
    if (isCancelledRef.current) return;

    const queued = files.filter((f) => f.status === "queued");
    if (queued.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const workerRef = await ensureWorker();

      for (let i = 0; i < queued.length; i++) {
        if (controller.signal.aborted || isCancelledRef.current) break;

        const item = queued[i];
        updateFile(item.id, { status: "probing" });

        try {
          const bytes = new Uint8Array(await item.file.arrayBuffer());

          const probeResponse = await postMessage(
            workerRef,
            { op: "probe", bytes },
            controller.signal,
          );

          if (probeResponse.op !== "probe") {
            throw new Error("Unexpected worker response");
          }

          updateFile(item.id, {
            status: "converting",
            probe: {
              imageCount: probeResponse.imageCount,
              width: probeResponse.width,
              height: probeResponse.height,
            },
          });

          const convertResponse = await postMessage(
            workerRef,
            { op: "convert", bytes, format, quality },
            controller.signal,
          );

          if (convertResponse.op !== "convert") {
            throw new Error("Unexpected worker response");
          }

          updateFile(item.id, {
            status: "done",
            result: {
              bytes: convertResponse.bytes,
              width: convertResponse.width,
              height: convertResponse.height,
              format,
              durationMs: convertResponse.durationMs,
            },
          });
        } catch (err: unknown) {
          if (controller.signal.aborted || isCancelledRef.current) {
            updateFile(item.id, { status: "cancelled" });
          } else {
            updateFile(item.id, {
              status: "error",
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        setOverallProgress(Math.round(((i + 1) / queued.length) * 100));
      }
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : String(err));
    } finally {
      abortControllerRef.current = null;
      setOverallProgress(0);
    }
  }, [files, format, quality, ensureWorker, updateFile]);

  useEffect(() => {
    // Auto-start the worker queue whenever new files are queued and the worker is idle.
    if (!isBusy && files.some((f) => f.status === "queued")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void processQueue();
    }
  }, [files, format, quality, isBusy, processQueue]);

  const handleDownloadOne = useCallback((item: QueuedFile) => {
    if (!item.result) return;
    const extension = item.result.format === "jpeg" ? "jpg" : "png";
    const blob = new Blob([item.result.bytes as BlobPart], {
      type: item.result.format === "jpeg" ? "image/jpeg" : "image/png",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name.replace(/\.(heic|heif)$/i, `.${extension}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadZip = useCallback(async () => {
    const doneFiles = files.filter((f): f is QueuedFile & { result: NonNullable<QueuedFile["result"]> } => f.status === "done" && f.result !== undefined);
    if (doneFiles.length === 0) return;

    try {
      setGlobalError(null);
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      for (const item of doneFiles) {
        const extension = item.result.format === "jpeg" ? "jpg" : "png";
        const outputName = item.name.replace(/\.(heic|heif)$/i, `.${extension}`);
        zip.file(outputName, item.result.bytes);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `heic-converted-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : String(err));
    }
  }, [files]);

  const handleClearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== "done" && f.status !== "error" && f.status !== "cancelled"));
  }, []);

  const handleStartOver = useCallback(async () => {
    await handleCancel();
    setFiles([]);
    setGlobalError(null);
    setOverallProgress(0);
  }, [handleCancel]);

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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop or select HEIC/HEIF photos to convert"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-muted/30 px-6 py-12 text-center transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066CC] focus-visible:ring-offset-2"
          >
            <FileUp className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium">Drop HEIC/HEIF photos here or click to upload</p>
              <p className="text-sm text-muted-foreground">
                Files stay on your device. Max {formatSize(MAX_FILE_SIZE)} per file, up to {MAX_FILES} files.
              </p>
            </div>
            <input
              ref={fileInputRef}
              id="heic-file-input"
              type="file"
              accept=".heic,.heif"
              multiple
              className="hidden"
              aria-label="HEIC/HEIF file input"
              onChange={handleFileSelect}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {files.length} file{files.length === 1 ? "" : "s"} · {doneCount} done · {errorCount} failed
                </span>
                <Button
                  type="button"
                  variant="link"
                  onClick={handleClearCompleted}
                  className="h-auto min-h-11 px-2 py-1 text-[#0066CC] hover:underline"
                >
                  Clear finished
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {files.map((item) => (
                  <HeicFileCard
                    key={item.id}
                    item={item}
                    onDownload={() => handleDownloadOne(item)}
                    onRemove={() => removeFile(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <h3 className="font-semibold">Output settings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={format === "jpeg"}
                    onClick={() => setFormat("jpeg")}
                    className={cn(
                      "min-h-11 min-w-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      format === "jpeg"
                        ? "border-[#0066CC] bg-[#0066CC]/10 text-[#0066CC]"
                        : "border-input bg-background hover:bg-accent",
                    )}
                  >
                    JPG
                  </button>
                  <button
                    type="button"
                    aria-pressed={format === "png"}
                    onClick={() => setFormat("png")}
                    className={cn(
                      "min-h-11 min-w-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      format === "png"
                        ? "border-[#0066CC] bg-[#0066CC]/10 text-[#0066CC]"
                        : "border-input bg-background hover:bg-accent",
                    )}
                  >
                    PNG
                  </button>
                </div>
              </div>

              {format === "jpeg" && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="heic-quality" className="text-sm font-medium">
                      JPEG quality
                    </label>
                    <span className="text-sm text-muted-foreground">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    id="heic-quality"
                    type="range"
                    min={0.5}
                    max={1}
                    step={0.05}
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-[#0066CC]"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    85% is a good balance of size and quality.
                  </p>
                </div>
              )}

              <div className="rounded-md border border-amber-500/30 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Metadata (EXIF/GPS) is removed during conversion.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {isBusy && (
              <div className="space-y-2">
                <Progress value={overallProgress} />
                <p className="text-center text-xs text-muted-foreground">
                  Converting {files.length - pendingCount + 1} of {files.length}…
                </p>
              </div>
            )}

            <Button
              className="w-full min-h-11"
              onClick={handleDownloadZip}
              disabled={!canDownload}
            >
              <FolderArchive className="mr-2 h-4 w-4" />
              Download all as ZIP
            </Button>

            {isBusy && (
              <Button
                variant="outline"
                className="w-full min-h-11"
                onClick={() => void handleCancel()}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full min-h-11"
              onClick={handleStartOver}
              disabled={files.length === 0}
            >
              Start over
            </Button>
          </div>
        </div>
      </div>

      {globalError && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {globalError}
        </div>
      )}
    </div>
  );
}

interface HeicFileCardProps {
  item: QueuedFile;
  onDownload: () => void;
  onRemove: () => void;
}

function HeicFileCard({ item, onDownload, onRemove }: HeicFileCardProps) {
  const objectUrl = useMemo(() => {
    if (!item.result) return null;
    const blob = new Blob([item.result.bytes as BlobPart], {
      type: item.result.format === "jpeg" ? "image/jpeg" : "image/png",
    });
    return URL.createObjectURL(blob);
  }, [item.result]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return (
    <div className="relative rounded-xl border bg-card p-3 shadow-sm">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {objectUrl ? (
            <img
              src={objectUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <FileImage className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={item.name}>
            {item.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatSize(item.file.size)}
            {item.probe && ` · ${item.probe.width}×${item.probe.height}`}
          </p>

          <div className="mt-2 flex items-center gap-2">
            {item.status === "queued" && (
              <Badge variant="secondary" className="text-xs">
                Queued
              </Badge>
            )}
            {item.status === "probing" && (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Probing
              </Badge>
            )}
            {item.status === "converting" && (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Converting
              </Badge>
            )}
            {item.status === "done" && (
              <Badge className="bg-green-600 text-xs text-white hover:bg-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Done
              </Badge>
            )}
            {item.status === "error" && (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="mr-1 h-3 w-3" />
                Failed
              </Badge>
            )}
            {item.status === "cancelled" && (
              <Badge variant="outline" className="text-xs">
                Cancelled
              </Badge>
            )}
          </div>

          {item.status === "error" && item.error && (
            <p className="mt-2 text-xs text-destructive">{item.error}</p>
          )}

          {item.status === "done" && item.result && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 min-h-11"
              onClick={onDownload}
            >
              <Download className="mr-1 h-3 w-3" aria-hidden="true" />
              Download {item.result.format === "jpeg" ? "JPG" : "PNG"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

