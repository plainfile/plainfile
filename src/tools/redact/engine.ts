export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface RedactionRegion {
  page: number;
  rect: Rect;
}

export interface SearchTerm {
  id: string;
  label: string;
  pattern: string;
}

export const PRESET_PATTERNS: SearchTerm[] = [
  { id: "ssn", label: "SSN", pattern: "\\d{3}-\\d{2}-\\d{4}" },
  { id: "email", label: "Email", pattern: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}" },
  { id: "card", label: "Credit card", pattern: "\\d{4}[- ]\\d{4}[- ]\\d{4}[- ]\\d{4}" },
  { id: "phone", label: "Phone", pattern: "\\+?\\d?[\\s.-]?(?:\\(\\d{3}\\)|\\d{3})[\\s.-]?\\d{3}[\\s.-]?\\d{4}" },
];

export interface WorkerRequest {
  type: "load" | "render" | "search" | "redact" | "verify";
  payload: unknown;
}

export interface LoadPayload {
  bytes: ArrayBuffer;
}

export interface RenderPayload {
  page: number;
  dpi: number;
}

export interface SearchPayload {
  pattern: string;
  regex?: boolean;
}

export interface RedactPayload {
  regions: RedactionRegion[];
  searchMatches: SearchMatch[];
}

export interface VerifyPayload {
  bytes: ArrayBuffer;
  terms: string[];
}

export interface WorkerResponse {
  type: WorkerRequest["type"];
  ok: boolean;
  error?: string;
  data?: unknown;
}

export interface PageInfo {
  page: number;
  width: number;
  height: number;
}

export interface SearchMatch {
  page: number;
  rect: Rect;
}
