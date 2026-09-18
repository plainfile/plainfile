import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eraser, Pencil, Type, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface SignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignature: (pngBytes: Uint8Array) => void;
}

type SignatureMode = "draw" | "type";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;
const STROKE_COLOR = "#000000";
const BACKGROUND_COLOR = "#ffffff";
const STROKE_WIDTH = 2.5;

function getCanvasContext(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  return canvas.getContext("2d", { willReadFrequently: false });
}

function fillBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function configureDrawStyle(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = STROKE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const buffer = reader.result as ArrayBuffer;
            resolve(new Uint8Array(buffer));
          };
          reader.onerror = () => reject(reader.error ?? new Error("Failed to read PNG blob"));
          reader.readAsArrayBuffer(blob);
          return;
        }

        // Fallback when toBlob returns null.
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        if (!base64) {
          reject(new Error("Failed to encode PNG"));
          return;
        }
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        resolve(bytes);
      },
      "image/png",
    );
  });
}

export function SignaturePad({ open, onOpenChange, onSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<SignatureMode>("draw");
  const [typedName, setTypedName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);

  const resetCanvas = useCallback(() => {
    const ctx = getCanvasContext(canvasRef.current);
    if (!ctx) return;
    fillBackground(ctx);
    if (mode === "draw") {
      configureDrawStyle(ctx);
    }
  }, [mode]);

  const renderTypedSignature = useCallback(() => {
    const ctx = getCanvasContext(canvasRef.current);
    if (!ctx) return;
    fillBackground(ctx);
    const text = typedName.trim();
    if (!text) return;
    ctx.font = '48px "Brush Script MT", "Segoe Script", cursive, sans-serif';
    ctx.fillStyle = STROKE_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }, [typedName]);

  useEffect(() => {
    if (!open) return;
    resetCanvas();
    if (mode === "type") {
      renderTypedSignature();
    }
  }, [open, mode, resetCanvas, renderTypedSignature]);

  useEffect(() => {
    if (mode !== "type") return;
    renderTypedSignature();
  }, [mode, renderTypedSignature]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const ctx = getCanvasContext(canvas);
    if (!ctx) return;
    configureDrawStyle(ctx);
    const { x, y } = getLocalCoordinates(canvas, event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw" || !isDrawing) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCanvasContext(canvas);
    if (!ctx) return;
    const { x, y } = getLocalCoordinates(canvas, event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw" || !isDrawing) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may already be released.
      }
    }
    setIsDrawing(false);
  };

  const handleClear = () => {
    resetCanvas();
    if (mode === "type") {
      setTypedName("");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const pngBytes = await canvasToPngBytes(canvas);
      onSignature(pngBytes);
      onOpenChange(false);
    } catch (error) {
      // Surface the error to the console; the dialog stays open so the user can retry.
      console.error("Failed to export signature:", error);
    }
  };

  const handleAfterOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when the dialog is fully closed.
      setTypedName("");
      setIsDrawing(false);
      setMode("draw");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleAfterOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add signature</DialogTitle>
          <DialogDescription>
            Draw your signature or type your name to create a PNG image.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("draw")}
              aria-pressed={mode === "draw"}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Draw
            </Button>
            <Button
              type="button"
              variant={mode === "type" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("type")}
              aria-pressed={mode === "type"}
            >
              <Type className="mr-2 h-4 w-4" />
              Type
            </Button>
          </div>

          {mode === "type" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="signature-name" className="text-sm font-medium">
                Your name
              </label>
              <Input
                id="signature-name"
                value={typedName}
                onChange={(event) => setTypedName(event.target.value)}
                placeholder="Type your name"
                autoComplete="off"
              />
            </div>
          )}

          <div className="relative w-full">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full cursor-crosshair touch-none rounded-md border border-border bg-white"
              aria-label="Signature pad"
              role="img"
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleClear}>
            <Eraser className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            <Check className="mr-2 h-4 w-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getLocalCoordinates(
  canvas: HTMLCanvasElement,
  event: React.PointerEvent<HTMLCanvasElement>,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}
