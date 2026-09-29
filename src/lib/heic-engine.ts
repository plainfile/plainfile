export type HeicTargetFormat = "jpeg" | "png";

export type HeicWorkerRequest =
  | { id: number; op: "probe"; bytes: Uint8Array }
  | { id: number; op: "convert"; bytes: Uint8Array; format: HeicTargetFormat; quality: number };

export type HeicWorkerResponse =
  | { id: number; op: "probe"; ok: true; imageCount: number; width: number; height: number }
  | { id: number; op: "convert"; ok: true; bytes: Uint8Array; width: number; height: number; durationMs: number }
  | { id: number; ok: false; error: string };
