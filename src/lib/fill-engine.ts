export type FieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'optionlist';

export interface FieldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
// All rects are in UI coordinates: origin top-left, units = PDF points (not preview px).

export interface FormFieldInfo {
  name: string;
  type: FieldType;
  page: number; // 0-based
  rect: FieldRect;
  maxLength?: number;
  options?: string[]; // dropdown / radio / optionlist
  value: string | boolean;
}

export interface PageSize {
  width: number;
  height: number;
}

export interface InspectResult {
  fields: FormFieldInfo[];
  pageSizes: PageSize[];
  warnings: string[]; // e.g. 'xfa-removed', 'widget-without-page'
}

export interface TextOverlay {
  page: number;
  x: number; y: number; // UI coordinates (top-left), points
  text: string;
  fontSize: number;
}

export interface SignaturePlacement {
  page: number;
  x: number; y: number; width: number; height: number; // UI coordinates, points
  pngBytes: Uint8Array;
}

export type FillWorkerRequest =
  | { id: number; op: 'inspect'; bytes: Uint8Array }
  | {
      id: number;
      op: 'fill';
      bytes: Uint8Array;
      values: Record<string, string | boolean>;
      overlays: TextOverlay[];
      signature?: SignaturePlacement;
      flatten: boolean;
    };

export type FillWorkerResponse =
  | { id: number; op: 'inspect'; ok: true; result: InspectResult }
  | {
      id: number;
      op: 'fill';
      ok: true;
      bytes: Uint8Array;
      stats: { filled: number; overlays: number; flattened: boolean };
    }
  | { id: number; ok: false; error: string };

export function pdfRectToUi(
  rect: { x: number; y: number; width: number; height: number },
  pageHeight: number,
): FieldRect {
  const yUi = pageHeight - rect.y - rect.height;
  return { x: rect.x, y: yUi, width: rect.width, height: rect.height };
}
