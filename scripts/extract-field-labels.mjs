import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as mupdf from "mupdf";
import pkg from "pdf-lib";

const { PDFDocument } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseStructuredTextJson(st) {
  const raw = st.asJSON();
  const parsed = JSON.parse(raw);
  const lines = [];
  for (const block of parsed.blocks ?? []) {
    if (block.type !== "text") continue;
    for (const line of block.lines ?? []) {
      if (!line.text) continue;
      lines.push({
        text: line.text.trim(),
        x: line.bbox.x,
        y: line.bbox.y,
        w: line.bbox.w,
        h: line.bbox.h,
      });
    }
  }
  return lines;
}

function getFieldWidgets(field) {
  const widgets = field.acroField.getWidgets();
  return widgets.map((w) => {
    const widget = w;
    return {
      rect: widget.getRectangle(),
      pageRef: typeof widget.P === "function" ? widget.P() : undefined,
    };
  });
}

function pageIndexByRef(doc, ref) {
  if (!ref) return 0;
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].ref.toString() === ref.toString()) {
      return i;
    }
  }
  return 0;
}

function findNearestLabel(lines, rect, pageHeight) {
  const cx = rect.x + rect.width / 2;
  const cy = pageHeight - rect.y - rect.height / 2; // convert PDF bottom-left to top-left

  let best = null;

  for (const line of lines) {
    if (!line.text) continue;
    const lx = line.x + line.w / 2;
    const ly = line.y - line.h / 2; // line.bbox.y is baseline/top in MuPDF JSON
    const dx = lx - cx;
    const dy = ly - cy;

    // Candidate to the left, roughly same vertical band.
    if (dx < -2 && dx > -300 && Math.abs(dy) < Math.max(rect.height, 20) + 8) {
      const score = Math.abs(dx) + Math.abs(dy) * 2;
      if (!best || score < best.score) {
        best = { line, score, direction: "left" };
      }
    }

    // Candidate above, roughly same horizontal band.
    if (dy < -2 && dy > -120 && Math.abs(dx) < Math.max(rect.width, 80) + 20) {
      const score = Math.abs(dy) + Math.abs(dx) * 0.5;
      if (!best || score < best.score) {
        best = { line, score, direction: "above" };
      }
    }
  }

  if (best) return best.line.text;

  // Fallback: any nearby text within a radius.
  let fallback = null;
  let fallbackScore = Infinity;
  for (const line of lines) {
    const lx = line.x + line.w / 2;
    const ly = line.y - line.h / 2;
    const dist = Math.hypot(lx - cx, ly - cy);
    if (dist < 200 && dist < fallbackScore) {
      fallback = line;
      fallbackScore = dist;
    }
  }
  return fallback?.text ?? "";
}

async function extractLabels(pdfPath) {
  const bytes = fs.readFileSync(pdfPath);
  const mupdfDoc = mupdf.Document.openDocument(bytes, "application/pdf");
  const pdfDoc = await PDFDocument.load(bytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const out = [];

  for (const field of fields) {
    const widgets = getFieldWidgets(field);
    if (widgets.length === 0) continue;
    const widget = widgets[0];
    const pageIndex = pageIndexByRef(pdfDoc, widget.pageRef);
    const page = mupdfDoc.loadPage(pageIndex);
    const lines = parseStructuredTextJson(page.toStructuredText());
    const bounds = page.getBounds();
    const pageHeight = bounds[3] - bounds[1];
    const label = findNearestLabel(lines, widget.rect, pageHeight);
    out.push({
      name: field.getName(),
      label,
      page: pageIndex,
      rect: widget.rect,
    });
  }
  return out;
}

const w9 = await extractLabels(
  path.resolve(__dirname, "../public/forms/assets/w-9.pdf"),
);
const w4 = await extractLabels(
  path.resolve(__dirname, "../public/forms/assets/w-4.pdf"),
);

const output = {
  w9: {
    title: "IRS Form W-9",
    fields: w9,
  },
  w4: {
    title: "IRS Form W-4",
    fields: w4,
  },
};

const outPath = path.resolve(__dirname, "../dshdata/field-labels.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Extracted ${w9.length} W-9 fields and ${w4.length} W-4 fields to ${outPath}`);
