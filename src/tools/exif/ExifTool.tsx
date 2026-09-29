// EXIF Tool: режимы Viewer / Remove / GPS-accent в одном компоненте (план §B.4).
// Вся обработка — в worker.ts (read/strip). ZIP-сборка батча — lazy jszip в UI-потоке.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Download, FileUp, FolderArchive, Loader2, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { countRawTags, type ExifData, type ExifStripMode, type ExifWorkerResponse } from "./engine";
import { ExifMap } from "./ExifMap";

export type ExifToolAccent = "viewer" | "remove" | "gps";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,.heic,.heif,.jpg,.jpeg,.png,.webp";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const MODE_OPTIONS: { value: ExifStripMode; title: string; hint: string }[] = [
  { value: "all", title: "Remove everything", hint: "All EXIF metadata, GPS and embedded thumbnails — gone." },
  { value: "gps-only", title: "Remove location only", hint: "GPS coordinates removed; camera settings and timestamps stay." },
  { value: "keep-camera", title: "Remove identity, keep camera settings", hint: "Strips GPS, timestamps, software and serials; keeps exposure, ISO, focal length." },
];

interface LoadedFile {
  id: number;
  name: string;
  bytes: Uint8Array;
  data: ExifData;
}

interface StripOutcome {
  bytes: Uint8Array;
  removedCount: number;
  keptCount: number;
  mode: ExifStripMode;
}

interface BatchItem extends LoadedFile {
  status: "ready" | "stripping" | "done" | "error";
  outcome?: StripOutcome;
  error?: string;
}

function mimeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

function strippedName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? `${name.slice(0, dot)}-noexif${name.slice(dot)}` : `${name}-noexif`;
}

function createWorker(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    const readyHandler = (event: MessageEvent) => {
      if (event.data?.type === "ready") {
        worker.removeEventListener("message", readyHandler);
        resolve(worker);
      }
    };
    worker.addEventListener("message", readyHandler);
    worker.addEventListener("error", (event) => reject(event.error ?? new Error("Worker failed to start")));
  });
}

export function ExifTool({ accent = "remove" }: { accent?: ExifToolAccent }) {
  const [files, setFiles] = useState<BatchItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ExifStripMode>(accent === "gps" ? "gps-only" : "all");
  const [showMap, setShowMap] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, { resolve: (r: ExifWorkerResponse) => void; reject: (e: Error) => void }>());
  const idRef = useRef(0);

  const onWorkerMessage = useCallback((event: MessageEvent<ExifWorkerResponse>) => {
    const data = event.data;
    if ((data as { type?: string }).type === "ready") return;
    const pending = pendingRef.current.get(data.id);
    if (!pending) return;
    pendingRef.current.delete(data.id);
    if (data.ok) pending.resolve(data);
    else pending.reject(new Error(data.error));
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const request = useCallback(
    async (
      req:
        | { op: "read"; bytes: Uint8Array; fileName: string }
        | { op: "strip"; bytes: Uint8Array; fileName: string; mode: ExifStripMode },
    ): Promise<ExifWorkerResponse> => {
      if (!workerRef.current) {
        const worker = await createWorker();
        worker.addEventListener("message", onWorkerMessage);
        workerRef.current = worker;
      }
      const id = ++idRef.current;
      return new Promise<ExifWorkerResponse>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        workerRef.current!.postMessage({ ...req, id });
      });
    },
    [onWorkerMessage],
  );

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      setError(null);
      setShowMap(false);
      const incoming = Array.from(list).slice(0, 200);
      setBusy(true);
      try {
        const loaded: BatchItem[] = [];
        for (const file of incoming) {
          if (file.size > MAX_FILE_SIZE) {
            setError(`"${file.name}" exceeds the 50 MB limit and was skipped.`);
            continue;
          }
          const bytes = new Uint8Array(await file.arrayBuffer());
          const response = await request({ op: "read", bytes, fileName: file.name });
          if (!response.ok) throw new Error(response.error);
          if (response.op !== "read") throw new Error("Unexpected worker response");
          loaded.push({ id: ++idRef.current, name: file.name, bytes, data: response.data, status: "ready" });
        }
        if (loaded.length > 0) {
          setFiles(loaded);
          setShowMap(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [request],
  );

  const stripOne = useCallback(
    async (item: BatchItem, stripMode: ExifStripMode): Promise<StripOutcome> => {
      const response = await request({ op: "strip", bytes: item.bytes, fileName: item.name, mode: stripMode });
      if (!response.ok) throw new Error(response.error);
      if (response.op !== "strip") throw new Error("Unexpected worker response");
      return { bytes: response.bytes, removedCount: response.removedCount, keptCount: response.keptCount, mode: stripMode };
    },
    [request],
  );

  const stripActive = useCallback(
    async (item: BatchItem) => {
      setError(null);
      setBusy(true);
      try {
        const outcome = await stripOne(item, mode);
        setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "done" as const, outcome } : f)));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [stripOne, mode],
  );

  const stripAllBatch = useCallback(async () => {
    setError(null);
    setBusy(true);
    const done: { name: string; bytes: Uint8Array }[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setBatchProgress(`Stripping ${i + 1}/${files.length}: ${item.name}`);
        setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "stripping" as const } : f)));
        try {
          const outcome = await stripOne(item, mode);
          done.push({ name: strippedName(item.name), bytes: outcome.bytes });
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: "done" as const, outcome } : f)),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "error" as const, error: message } : f)));
        }
      }
      if (done.length > 0) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const f of done) zip.file(f.name, f.bytes);
        const zipped = await zip.generateAsync({ type: "uint8array" });
        downloadBytes(zipped, "plainfile-noexif.zip", "application/zip");
      }
    } finally {
      setBusy(false);
      setBatchProgress(null);
    }
  }, [files, stripOne, mode]);

  const active = files[0];
  const isHeic = active && /\.(heic|heif)$/i.test(active.name);

  return (
    <div className="space-y-6">
      {/* dropzone */}
      <label
        className={cn(
          "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          "hover:border-[#0066CC]/40",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <FileUp className="h-8 w-8 text-[#0066CC]" />
        <span className="text-sm font-medium">
          {busy ? "Reading metadata…" : "Click to choose photos (JPEG, PNG, WebP, HEIC)"}
        </span>
        <span className="text-xs text-muted-foreground">
          Up to 200 files, 50 MB each. Files never leave your device.
        </span>
        <input
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</div>
      )}

      {batchProgress && <p className="text-xs text-muted-foreground">{batchProgress}</p>}

      {active && files.length === 1 && (
        <SingleFileView
          item={active}
          accent={accent}
          mode={mode}
          setMode={setMode}
          showMap={showMap}
          setShowMap={setShowMap}
          busy={busy}
          onStrip={() => void stripActive(active)}
        />
      )}

      {files.length > 1 && (
        <div className="space-y-4">
          <ModePicker mode={mode} setMode={setMode} disabled={busy} />
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">File</th>
                  <th className="p-3">Tags</th>
                  <th className="p-3">GPS</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="max-w-48 truncate p-3 font-medium">{f.name}</td>
                    <td className="p-3">{countRawTags(f.data)}</td>
                    <td className="p-3">{f.data.gps ? <Badge variant="secondary">present</Badge> : "—"}</td>
                    <td className="p-3">
                      {f.status === "stripping" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {f.status === "error" && <span className="text-destructive">{f.error}</span>}
                      {f.status === "done" && f.outcome && (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <ShieldCheck className="h-4 w-4" />
                          {f.outcome.removedCount} removed
                        </span>
                      )}
                      {f.status === "ready" && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={() => void stripAllBatch()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderArchive className="mr-2 h-4 w-4" />}
            Strip {files.length} files & download ZIP
          </Button>
          {isHeic && <HeicHint />}
        </div>
      )}
    </div>
  );
}

function downloadBytes(bytes: Uint8Array, name: string, mime: string): void {
  const blob = new Blob([bytes.slice()], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function ModePicker({
  mode,
  setMode,
  disabled,
}: {
  mode: ExifStripMode;
  setMode: (m: ExifStripMode) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">What to remove</legend>
      {MODE_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
            mode === opt.value ? "border-[#0066CC]/50 bg-[#0066CC]/5" : "hover:border-[#0066CC]/30",
          )}
        >
          <input
            type="radio"
            name="strip-mode"
            value={opt.value}
            checked={mode === opt.value}
            onChange={() => setMode(opt.value)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium">{opt.title}</span>
            <span className="block text-xs text-muted-foreground">{opt.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function HeicHint() {
  return (
    <p className="text-sm text-muted-foreground">
      HEIC files are read-only here — metadata can be removed by{" "}
      <Link to="/heic/to-jpg" className="text-[#0066CC] underline">
        converting HEIC to JPG
      </Link>
      , which strips all metadata.
    </p>
  );
}

function SingleFileView({
  item,
  accent,
  mode,
  setMode,
  showMap,
  setShowMap,
  busy,
  onStrip,
}: {
  item: BatchItem;
  accent: ExifToolAccent;
  mode: ExifStripMode;
  setMode: (m: ExifStripMode) => void;
  showMap: boolean;
  setShowMap: (v: boolean) => void;
  busy: boolean;
  onStrip: () => void;
}) {
  const { data } = item;
  const outcome = item.outcome;
  const tagCount = countRawTags(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{item.name}</h2>
          <p className="text-sm text-muted-foreground">
            {tagCount} metadata tags{data.gps ? " · GPS location present" : ""}
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          0 bytes uploaded
        </Badge>
      </div>

      {data.warnings.map((w) => (
        <div key={w} className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {w}
        </div>
      ))}

      {data.gps && (
        <div className={cn("rounded-lg border p-4", accent === "gps" && "border-[#0066CC]/40 bg-[#0066CC]/5")}>
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="h-4 w-4 text-[#0066CC]" />
            <span className="text-sm font-medium">Location</span>
            <code className="text-xs text-muted-foreground">
              {data.gps.lat.toFixed(6)}, {data.gps.lon.toFixed(6)}
            </code>
          </div>
          {accent === "gps" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Anyone you share this photo with can see exactly where it was taken.
            </p>
          )}
          {showMap ? (
            <div className="mt-3">
              <ExifMap lat={data.gps.lat} lon={data.gps.lon} />
            </div>
          ) : (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowMap(true)}>
              Show on map (loads map tiles from openstreetmap.org)
            </Button>
          )}
        </div>
      )}

      {data.groups.length > 0 ? (
        <div className="space-y-3">
          {data.groups.map((group) => (
            <details key={group.name} className="rounded-lg border" open={group.name === "Camera" || group.name === "Location"}>
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                {group.name} <span className="text-muted-foreground">({group.tags.length})</span>
              </summary>
              <table className="w-full border-t text-sm">
                <tbody>
                  {group.tags.map((tag) => (
                    <tr key={tag.key} className="border-b last:border-0">
                      <td className="w-1/3 px-4 py-2 font-mono text-xs text-muted-foreground">{tag.key}</td>
                      <td className="px-4 py-2">{tag.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          No EXIF metadata found in this file.
        </p>
      )}

      {accent === "viewer" ? (
        <p className="text-sm text-muted-foreground">
          Want to clean this file?{" "}
          <Link to="/exif/remove" className="text-[#0066CC] underline">
            Open the metadata remover
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-4">
          <ModePicker mode={mode} setMode={setMode} disabled={busy} />
          {/\.(heic|heif)$/i.test(item.name) ? (
            <HeicHint />
          ) : (
            <Button onClick={onStrip} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remove metadata
            </Button>
          )}
        </div>
      )}

      {outcome && (
        <div className="space-y-3 rounded-lg border border-green-600/30 bg-green-600/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800">
            <ShieldCheck className="h-4 w-4" />
            Verified: {outcome.removedCount} tags removed, {outcome.keptCount} kept — re-read after stripping
            confirms the result.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => downloadBytes(outcome.bytes, strippedName(item.name), mimeFor(item.name))}>
              <Download className="mr-2 h-4 w-4" />
              Download cleaned file
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
