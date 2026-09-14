import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Loader2,
  MousePointer2,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import type {
  PageInfo,
  RedactionRegion,
  SearchMatch,
  WorkerRequest,
  WorkerResponse,
} from "@/lib/mupdf-engine";
import { PRESET_PATTERNS } from "@/lib/mupdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const RENDER_DPI = 150;
const SCALE = RENDER_DPI / 72;

function createWorker(): Promise<Worker> {
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

function postMessage(worker: Worker, request: WorkerRequest): Promise<WorkerResponse> {
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

interface PendingRegion {
  page: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface RedactToolProps {
  title?: string;
  description?: string;
  /** Preset pattern ids (from PRESET_PATTERNS) pre-selected on this page. */
  defaultPresets?: string[];
}

export function RedactTool({ title, description, defaultPresets }: RedactToolProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageBitmapRef = useRef<ImageBitmap | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [manualRegions, setManualRegions] = useState<RedactionRegion[]>([]);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [pendingRegion, setPendingRegion] = useState<PendingRegion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(
    () => new Set(defaultPresets ?? [])
  );
  const selectedPresetsRef = useRef<Set<string>>(selectedPresets);

  useEffect(() => {
    selectedPresetsRef.current = selectedPresets;
  }, [selectedPresets]);

  const [outputBytes, setOutputBytes] = useState<ArrayBuffer | null>(null);
  const [verified, setVerified] = useState<"idle" | "clean" | "dirty">("idle");
  const [verifyCount, setVerifyCount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const workerPromiseRef = useRef<Promise<Worker> | null>(null);

  useEffect(() => {
    workerPromiseRef.current = createWorker();
    return () => {
      workerPromiseRef.current?.then((w) => w.terminate());
      workerPromiseRef.current = null;
    };
  }, []);

  const ensureWorker = useCallback(async () => {
    if (!workerPromiseRef.current) {
      workerPromiseRef.current = createWorker();
    }
    return workerPromiseRef.current;
  }, []);

  const canvasToPdfPoint = useCallback(
    (cx: number, cy: number) => {
      const canvas = canvasRef.current;
      const page = pages[currentPage];
      if (!canvas || !page) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (cx - rect.left) * scaleX;
      const py = (cy - rect.top) * scaleY;
      return {
        x: px / SCALE,
        y: py / SCALE,
      };
    },
    [pages, currentPage]
  );

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pageBitmapRef.current) {
      ctx.drawImage(pageBitmapRef.current, 0, 0);
    }

    const page = pages[currentPage];
    if (!page) return;

    const allRegions = [
      ...manualRegions.filter((r) => r.page === currentPage),
      ...searchMatches.filter((m) => m.page === currentPage).map((m) => ({
        page: m.page,
        rect: m.rect,
      })),
    ];

    ctx.save();
    ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
    ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
    ctx.lineWidth = 2;
    for (const region of allRegions) {
      const r = region.rect;
      const x = r.x0 * SCALE;
      const y = r.y0 * SCALE;
      const w = (r.x1 - r.x0) * SCALE;
      const h = (r.y1 - r.y0) * SCALE;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }

    if (pendingRegion) {
      const r = pendingRegion;
      const x0 = Math.min(r.startX, r.endX);
      const y0 = Math.min(r.startY, r.endY);
      const x1 = Math.max(r.startX, r.endX);
      const y1 = Math.max(r.startY, r.endY);
      const x = x0 * SCALE;
      const y = y0 * SCALE;
      const w = (x1 - x0) * SCALE;
      const h = (y1 - y0) * SCALE;
      ctx.strokeStyle = "rgba(59, 130, 246, 0.9)";
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
  },
  [manualRegions, searchMatches, pendingRegion, pages, currentPage]
  );

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, manualRegions, searchMatches, pendingRegion]);

  const renderPage = useCallback(
    async (pageIndex: number) => {
      const worker = await ensureWorker();
      setProgress(10);
      const response = await postMessage(worker, {
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
        new Blob([new Uint8Array(png)], { type: "image/png" })
      );

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
      drawCanvas();
      setTimeout(() => setProgress(0), 300);
    },
    [ensureWorker, drawCanvas]
  );

  const loadFile = useCallback(
    async (file: File) => {
      try {
        setLoading(true);
        setError(null);
        setProgress(5);
        setOutputBytes(null);
        setVerified("idle");
        setManualRegions([]);
        setSearchMatches([]);
        setSearchTerm("");
        setSelectedPresets(new Set(defaultPresets ?? []));

        const bytes = await file.arrayBuffer();
        setFileName(file.name);

        const worker = await ensureWorker();
        const response = await postMessage(worker, {
          type: "load",
          payload: { bytes },
        });
        setProgress(60);
        const { pages: pageInfos } = response.data as { pages: PageInfo[] };
        setPages(pageInfos);
        setCurrentPage(0);

        if (pageInfos.length > 0) {
          await renderPage(0);
        }
        setLoading(false);
      } catch (err: unknown) {
        setLoading(false);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [ensureWorker, renderPage, defaultPresets]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file && file.type === "application/pdf") {
        void loadFile(file);
      } else if (file) {
        setError("Please drop a PDF file.");
      }
    },
    [loadFile]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void loadFile(file);
    },
    [loadFile]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (pages.length === 0) return;
      const point = canvasToPdfPoint(event.clientX, event.clientY);
      setPendingRegion({
        page: currentPage,
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      });
    },
    [canvasToPdfPoint, currentPage, pages.length]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!pendingRegion) return;
      const point = canvasToPdfPoint(event.clientX, event.clientY);
      setPendingRegion((prev) =>
        prev
          ? {
              ...prev,
              endX: point.x,
              endY: point.y,
            }
          : null
      );
    },
    [canvasToPdfPoint, pendingRegion]
  );

  const handleMouseUp = useCallback(() => {
    if (!pendingRegion) return;
    const { startX, startY, endX, endY, page } = pendingRegion;
    const x0 = Math.min(startX, endX);
    const y0 = Math.min(startY, endY);
    const x1 = Math.max(startX, endX);
    const y1 = Math.max(startY, endY);
    if (Math.abs(x1 - x0) > 2 && Math.abs(y1 - y0) > 2) {
      setManualRegions((prev) => [...prev, { page, rect: { x0, y0, x1, y1 } }]);
    }
    setPendingRegion(null);
  }, [pendingRegion]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      if (pages.length === 0) return;
      event.preventDefault();
      const touch = event.touches[0];
      const point = canvasToPdfPoint(touch.clientX, touch.clientY);
      setPendingRegion({
        page: currentPage,
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      });
    },
    [canvasToPdfPoint, currentPage, pages.length]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      if (!pendingRegion) return;
      event.preventDefault();
      const touch = event.touches[0];
      const point = canvasToPdfPoint(touch.clientX, touch.clientY);
      setPendingRegion((prev) =>
        prev
          ? {
              ...prev,
              endX: point.x,
              endY: point.y,
            }
          : null
      );
    },
    [canvasToPdfPoint, pendingRegion]
  );

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  const handleSearch = useCallback(async () => {
    const presets = selectedPresetsRef.current;
    if (!searchTerm && presets.size === 0) return;
    try {
      setLoading(true);
      setError(null);
      const worker = await ensureWorker();
      const terms: string[] = [];
      if (searchTerm) terms.push(searchTerm);
      for (const preset of PRESET_PATTERNS) {
        if (presets.has(preset.id)) {
          terms.push(preset.pattern);
        }
      }

      const matches: SearchMatch[] = [];
      if (searchTerm) {
        const response = await postMessage(worker, {
          type: "search",
          payload: { pattern: searchTerm, regex: false },
        });
        const data = response.data as { matches: SearchMatch[] };
        matches.push(...data.matches);
      }
      for (const preset of PRESET_PATTERNS) {
        if (presets.has(preset.id)) {
          const response = await postMessage(worker, {
            type: "search",
            payload: { pattern: preset.pattern, regex: true },
          });
          const data = response.data as { matches: SearchMatch[] };
          matches.push(...data.matches);
        }
      }
      setSearchMatches(matches);
      setLoading(false);
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [ensureWorker, searchTerm]);

  const handleApply = useCallback(async () => {
    setConfirmOpen(false);
    try {
      setLoading(true);
      setError(null);
      setProgress(20);
      const terms = [
        ...(searchTerm ? [searchTerm] : []),
        ...PRESET_PATTERNS
          .filter((p) => selectedPresetsRef.current.has(p.id))
          .map((p) => p.pattern),
      ];
      const worker = await ensureWorker();
      const response = await postMessage(worker, {
        type: "redact",
        payload: {
          regions: manualRegions,
          searchMatches,
        },
      });
      setProgress(80);
      const { bytes } = response.data as { bytes: ArrayBuffer };
      setOutputBytes(bytes);

      const verifyResponse = await postMessage(worker, {
        type: "verify",
        payload: { bytes, terms },
      });
      setProgress(100);
      const { remaining } = verifyResponse.data as { remaining: number };
      setVerifyCount(remaining);
      setVerified(remaining === 0 ? "clean" : "dirty");
      setLoading(false);
      setTimeout(() => setProgress(0), 300);
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [ensureWorker, manualRegions, searchMatches, searchTerm]);

  const handleDownload = useCallback(() => {
    if (!outputBytes || !fileName) return;
    const blob = new Blob([new Uint8Array(outputBytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.pdf$/i, "-redacted.pdf");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [outputBytes, fileName]);

  const totalRegions = manualRegions.length + searchMatches.length;

  const displayTitle = title ?? "Redact PDF — Free, No Upload, No Sign Up";
  const displayDescription = description ?? "Remove text and images permanently — right in your browser.";

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

            <div className="overflow-auto rounded-lg border bg-white p-2 shadow-sm dark:bg-black">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="max-w-full cursor-crosshair touch-none"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Draw rectangles directly on the page to mark areas for redaction. Text that
              intersects a region will be removed entirely.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" />
                <h3 className="font-semibold">Search & redact</h3>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Search term or regex"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_PATTERNS.map((preset) => (
                    <div key={preset.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={preset.id}
                        checked={selectedPresets.has(preset.id)}
                        onCheckedChange={(checked) => {
                          setSelectedPresets((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(preset.id);
                            else next.delete(preset.id);
                            return next;
                          });
                        }}
                      />
                      <Label htmlFor={preset.id} className="text-xs">
                        {preset.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => void handleSearch()}
                  disabled={!searchTerm && selectedPresets.size === 0}
                >
                  Find matches
                </Button>
                {searchMatches.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {searchMatches.length} match(es) marked for redaction.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <MousePointer2 className="h-4 w-4" />
                <h3 className="font-semibold">Manual regions</h3>
              </div>
              {manualRegions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No manual regions yet. Draw on the page to add one.
                </p>
              ) : (
                <ul className="max-h-40 space-y-2 overflow-auto text-sm">
                  {manualRegions.map((region, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-md border px-2 py-1"
                    >
                      <span>
                        Page {region.page + 1}: {Math.round(region.rect.x0)},{" "}
                        {Math.round(region.rect.y0)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setManualRegions((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3">
              <Progress value={progress} className={progress === 0 ? "opacity-0" : ""} />

              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    disabled={totalRegions === 0 || loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply redactions
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Redaction is permanent</DialogTitle>
                    <DialogDescription>
                      This will irreversibly remove content under {totalRegions} marked
                      region(s). The original file cannot be recovered. Continue?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => void handleApply()}>Continue</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {outputBytes && (
                <>
                  <Button variant="outline" className="w-full" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download redacted PDF
                  </Button>
                  {verified === "clean" && (
                    <Badge
                      variant="default"
                      className="w-full justify-center bg-green-600 text-white hover:bg-green-600"
                    >
                      Verified: 0 matches remain
                    </Badge>
                  )}
                  {verified === "dirty" && (
                    <Badge
                      variant="destructive"
                      className="w-full justify-center"
                    >
                      WARNING: {verifyCount} match(es) remain
                    </Badge>
                  )}
                </>
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
