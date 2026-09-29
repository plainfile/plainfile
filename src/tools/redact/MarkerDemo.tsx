import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck } from "lucide-react";

type Mode = "marker" | "redacted";

/**
 * Interactive demo for the redaction guide: shows that a black box drawn
 * "on top" of text leaves the text selectable and copyable, while true
 * redaction removes it. The black overlay has pointer-events disabled so
 * the user can select straight through it.
 */
export function MarkerDemo() {
  const [mode, setMode] = useState<Mode>("marker");
  const [extracted, setExtracted] = useState<string | null>(null);

  const handleSelect = useCallback(() => {
    const sel = window.getSelection()?.toString().trim() ?? "";
    if (sel.length > 0) {
      setExtracted(sel);
    }
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setExtracted(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="not-prose my-8 rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={mode === "marker" ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode("marker")}
          >
            Black-marker "redaction"
          </Button>
          <Button
            variant={mode === "redacted" ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode("redacted")}
          >
            True redaction
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Try it: drag to select the hidden text, then copy it.
        </p>
      </div>

      <div
        className="rounded-lg border bg-white p-6 font-mono text-sm leading-8 text-slate-800 dark:bg-slate-950 dark:text-slate-200"
        onMouseUp={handleSelect}
        onTouchEnd={handleSelect}
      >
        <p>First National Bank — Statement 04/2026</p>
        <p>Account holder: Jane A. Doe</p>
        <p>
          SSN:{" "}
          <span className="relative inline-block">
            {mode === "marker" ? (
              <>
                <span>123-45-6789</span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-black"
                />
              </>
            ) : (
              <span className="bg-black text-black select-none">
                ███████████
              </span>
            )}
          </span>
        </p>
        <p>Opening balance: $8,214.55</p>
      </div>

      <div className="mt-4 min-h-10">
        {extracted ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              You just extracted{" "}
              <code className="rounded bg-muted px-1 font-mono">
                {extracted.length > 60 ? `${extracted.slice(0, 60)}…` : extracted}
              </code>{" "}
              — from <em>under</em> a black box. That is exactly how the
              Manafort and TSA leaks happened.
            </p>
          </div>
        ) : mode === "redacted" ? (
          <div className="flex items-start gap-2 rounded-lg border border-green-600/40 bg-green-600/10 p-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <p>
              Nothing to select — the digits are not under the box, they are
              gone from the document. This is what true redaction means.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            The SSN above looks hidden. Select across the black box with your
            mouse — the text is still there.
          </p>
        )}
      </div>
    </div>
  );
}
