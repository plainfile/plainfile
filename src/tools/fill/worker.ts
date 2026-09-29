import type {
  FieldType,
  FillWorkerRequest,
  FillWorkerResponse,
  FormFieldInfo,
  InspectResult,
  PageSize,
} from "./engine";
import type {
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  PDFPage,
  PDFImage,
  PDFFont,
} from "pdf-lib";

function mapFieldType(typeName: string): FieldType | null {
  // pdf-lib class names may be suffixed in different bundles (e.g. PDFTextField2).
  switch (typeName) {
    case "PDFTextField":
    case "PDFTextField2":
      return "text";
    case "PDFCheckBox":
    case "PDFCheckBox2":
      return "checkbox";
    case "PDFRadioGroup":
    case "PDFRadioGroup2":
      return "radio";
    case "PDFDropdown":
    case "PDFDropdown2":
      return "dropdown";
    case "PDFOptionList":
    case "PDFOptionList2":
      return "optionlist";
    default:
      return null;
  }
}

function pdfRectToUi(
  rect: { x: number; y: number; width: number; height: number },
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const yUi = pageHeight - rect.y - rect.height;
  return { x: rect.x, y: yUi, width: rect.width, height: rect.height };
}

function validateWinAnsi(text: string, label: string): string | null {
  for (const char of text) {
    if (char.charCodeAt(0) > 255) {
      return `${label} contains characters that cannot be encoded in this PDF yet.`;
    }
  }
  return null;
}

async function handleInspect(id: number, bytes: Uint8Array): Promise<FillWorkerResponse> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const fields = form.getFields();
  console.log(`[fill.worker] handleInspect: loaded ${bytes.byteLength} bytes, found ${fields.length} fields`);
  const pages = doc.getPages();

  const pageIndexByRef = new Map(pages.map((page, index) => [page.ref.toString(), index]));
  const pageSizes: PageSize[] = pages.map((page) => ({
    width: page.getWidth(),
    height: page.getHeight(),
  }));

  const warnings: string[] = [];
  const resultFields: FormFieldInfo[] = [];

  for (const field of fields) {
    const typeName = field.constructor.name;
    const fieldType = mapFieldType(typeName);
    if (fieldType === null) {
      warnings.push(`unknown-field-type:${typeName}`);
      continue;
    }

    const widgets = (field as unknown as { acroField: { getWidgets(): unknown[] } }).acroField.getWidgets();
    if (widgets.length === 0) {
      warnings.push(`no-widget:${field.getName()}`);
      continue;
    }

    const widget = widgets[0] as {
      getRectangle(): { x: number; y: number; width: number; height: number };
      P?: () => unknown;
    };
    const rect = widget.getRectangle();

    const pRef = typeof widget.P === "function" ? widget.P() : undefined;
    let pageIndex = 0;
    if (pRef != null) {
      const resolved = pageIndexByRef.get(pRef.toString());
      if (resolved !== undefined) {
        pageIndex = resolved;
      } else {
        warnings.push("widget-without-page");
      }
    } else {
      warnings.push("widget-without-page");
    }

    const pageHeight = pages[pageIndex].getHeight();
    const uiRect = pdfRectToUi(rect, pageHeight);

    const info: FormFieldInfo = {
      name: field.getName(),
      type: fieldType,
      page: pageIndex,
      rect: uiRect,
      value: fieldType === "checkbox" ? false : "",
    };

    if (fieldType === "text") {
      const textField = field as PDFTextField;
      const maxLength = textField.getMaxLength();
      if (maxLength !== undefined && Number.isFinite(maxLength)) {
        info.maxLength = maxLength;
      }
    } else if (fieldType === "dropdown" || fieldType === "radio" || fieldType === "optionlist") {
      const choiceField = field as PDFDropdown | PDFRadioGroup | PDFOptionList;
      info.options = choiceField.getOptions();
    }

    resultFields.push(info);
  }

  const result: InspectResult = {
    fields: resultFields,
    pageSizes,
    warnings,
  };

  return { id, op: "inspect", ok: true, result };
}

async function handleFill(request: Extract<FillWorkerRequest, { op: "fill" }>): Promise<FillWorkerResponse> {
  const { id, bytes, values, overlays, signature, flatten } = request;
  const { PDFDocument, PDFName, StandardFonts } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  for (const [name, value] of Object.entries(values)) {
    const field = form.getField(name);
    const typeName = field.constructor.name;
    const fieldType = mapFieldType(typeName);

    switch (fieldType) {
      case "text": {
        (field as PDFTextField).setText(value as string);
        break;
      }
      case "checkbox": {
        const checkBox = field as PDFCheckBox;
        if (value) {
          checkBox.check();
        } else {
          checkBox.uncheck();
        }
        break;
      }
      case "radio": {
        (field as PDFRadioGroup).select(value as string);
        break;
      }
      case "dropdown": {
        (field as PDFDropdown).select(value as string);
        break;
      }
      case "optionlist": {
        (field as PDFOptionList).select(value as string);
        break;
      }
      default: {
        throw new Error(`Unsupported field type for "${name}": ${typeName}`);
      }
    }
  }

  // Validate WinAnsi for AcroForm text values.
  for (const [name, value] of Object.entries(values)) {
    if (typeof value !== "string") continue;
    const error = validateWinAnsi(value, `Field "${name}"`);
    if (error) {
      return { id, ok: false, error };
    }
  }

  // Validate WinAnsi for overlay text before drawing.
  for (const overlay of overlays) {
    const error = validateWinAnsi(overlay.text, "Overlay text");
    if (error) {
      return { id, ok: false, error };
    }
  }

  // Draw overlays and signature before flattening.
  try {
    const helvetica: PDFFont = await doc.embedFont(StandardFonts.Helvetica);

    for (const overlay of overlays) {
      const pages = doc.getPages();
      if (overlay.page < 0 || overlay.page >= pages.length) {
        throw new Error(`Overlay page index ${overlay.page} is out of range`);
      }
      const page: PDFPage = pages[overlay.page];
      const pageHeight = page.getHeight();
      const pdfY = pageHeight - overlay.y - overlay.fontSize;
      page.drawText(overlay.text, {
        x: overlay.x,
        y: pdfY,
        size: overlay.fontSize,
        font: helvetica,
      });
    }

    if (signature) {
      const pngImage: PDFImage = await doc.embedPng(signature.pngBytes);
      const pages = doc.getPages();
      if (signature.page < 0 || signature.page >= pages.length) {
        throw new Error(`Signature page index ${signature.page} is out of range`);
      }
      const page: PDFPage = pages[signature.page];
      const pageHeight = page.getHeight();
      const pdfY = pageHeight - signature.y - signature.height;
      page.drawImage(pngImage, {
        x: signature.x,
        y: pdfY,
        width: signature.width,
        height: signature.height,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { id, ok: false, error: message };
  }

  if (flatten) {
    form.flatten();
  }

  // Sanitize metadata.
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setCreator("");
  doc.setProducer("");
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));

  try {
    doc.catalog.delete(PDFName.of("Metadata"));
  } catch {
    // ignore
  }

  const saved = await doc.save({ updateFieldAppearances: true });

  return {
    id,
    op: "fill",
    ok: true,
    bytes: saved,
    stats: {
      filled: Object.keys(values).length,
      overlays: overlays.length,
      flattened: flatten,
    },
  };
}

async function processMessage(request: FillWorkerRequest): Promise<FillWorkerResponse> {
  switch (request.op) {
    case "inspect":
      return handleInspect(request.id, request.bytes);
    case "fill":
      return handleFill(request);
    default:
      throw new Error(`Unknown operation`);
  }
}

self.addEventListener("message", async (event: MessageEvent<FillWorkerRequest>) => {
  const request = event.data;
  try {
    const response = await processMessage(request);
    self.postMessage(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id: request.id, ok: false, error: message });
  }
});

self.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  self.postMessage({ ok: false, error: `Unhandled worker error: ${message}` });
  event.preventDefault();
});

self.postMessage({ type: "ready" });
