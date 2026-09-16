/**
 * D1 spike: pdf-lib on real IRS forms (W-9, W-4).
 * Verifies: field enumeration, widget rectangles (coordinate mapping),
 * fill + reload persistence, flatten, non-ASCII behavior (WinAnsi).
 *
 * Run from app/:  node scripts/spike-forms-fill.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const FORMS = [
  { id: 'w-9', file: 'fixtures/forms/fw9.pdf' },
  { id: 'w-4', file: 'fixtures/forms/fw4.pdf' },
];

const fieldType = (f) => f.constructor.name;

async function inspectForm(id, bytes) {
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const fields = form.getFields();
  const pages = doc.getPages();
  // ref -> index map (widget.P() returns a PDFRef, not an index; may be undefined)
  const pageIndexByRef = new Map(pages.map((p, i) => [p.ref.toString(), i]));
  const report = [];

  report.push(`pages=${pages.length} fields=${fields.length}`);
  for (const f of fields) {
    const type = fieldType(f);
    const widgets = f.acroField.getWidgets();
    const w = widgets[0];
    let rectInfo = 'no-widget';
    if (w) {
      const r = w.getRectangle();
      const pRef = typeof w.P === 'function' ? w.P() : undefined;
      const pIdx = pRef ? pageIndexByRef.get(pRef.toString()) : undefined;
      const ph = pIdx !== undefined ? pages[pIdx].getHeight() : undefined;
      // pdf-lib: origin bottom-left. UI preview (MuPDF render): origin top-left.
      const yUi = ph !== undefined ? (ph - r.y - r.height).toFixed(1) : '?';
      rectInfo = `page=${pIdx ?? '?'} rect=[x=${r.x.toFixed(1)} y=${r.y.toFixed(1)} w=${r.width.toFixed(1)} h=${r.height.toFixed(1)}] y_ui=${yUi} (pageH=${ph?.toFixed(1) ?? '?'})`;
    }
    report.push(`  [${type}] "${f.getName()}" ${rectInfo}`);
  }
  return { doc, form, fields, report };
}

async function fillAndVerify(id, bytes) {
  // --- fill round 1: keep editable ---
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const filled = [];

  for (const f of form.getFields()) {
    const type = fieldType(f);
    try {
      if (type === 'PDFTextField' && filled.length < 3) {
        const tf = form.getTextField(f.getName());
        const raw = id === 'w-9' ? 'John A. Smith' : 'Müller-Schmidt'; // non-ASCII WinAnsi test on w-4
        const max = tf.getMaxLength(); // real forms have maxLength constraints (e.g. 1-char cells)
        const val = max !== undefined && max < raw.length ? raw.slice(0, max) : raw;
        if (val.length === 0) continue;
        tf.setText(val);
        filled.push(`${f.getName()}=${val}`);
      } else if (type === 'PDFCheckBox' && !filled.some((n) => n.startsWith(f.getName()))) {
        form.getCheckBox(f.getName()).check();
        filled.push(f.getName());
      }
      if (filled.length >= 4) break;
    } catch (e) {
      return { ok: false, error: `fill failed on "${f.getName()}" (${type}): ${e.message}` };
    }
  }

  const editableBytes = await doc.save();
  // reload and assert persistence
  const doc2 = await PDFDocument.load(editableBytes);
  const form2 = doc2.getForm();
  for (const entry of filled) {
    const name = entry.split('=')[0];
    const f2 = form2.getField(name);
    const type = fieldType(f2);
    const val = type === 'PDFCheckBox' ? f2.isChecked() : f2.getText();
    if (val === undefined || val === false || val === '') {
      return { ok: false, error: `value lost after reload: "${name}"` };
    }
  }

  // --- fill round 2: flatten ---
  const doc3 = await PDFDocument.load(bytes);
  const form3 = doc3.getForm();
  let fl = 0;
  for (const f of form3.getFields()) {
    if (fieldType(f) === 'PDFTextField' && fl < 3) {
      const max = f.getMaxLength();
      const raw = 'Flatten Test 123';
      f.setText(max !== undefined && max < raw.length ? raw.slice(0, max) : raw);
      fl++;
    }
  }
  // embed a drawn-signature stand-in: text via embedFont on page 0 (SignaturePad will embed PNG the same way)
  const helv = await doc3.embedFont(StandardFonts.Helvetica);
  const p0 = doc3.getPages()[0];
  p0.drawText('/s/ John A. Smith', { x: 72, y: 60, size: 14, font: helv });
  form3.flatten();
  const flatBytes = await doc3.save();
  const doc4 = await PDFDocument.load(flatBytes);
  const remaining = doc4.getForm().getFields().length;

  return {
    ok: true,
    filledFields: filled,
    editableSize: editableBytes.length,
    flatSize: flatBytes.length,
    fieldsAfterFlatten: remaining,
  };
}

// --- Cyrillic (non-WinAnsi) behavior check ---
async function cyrillicTest(bytes) {
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const tf = form.getFields().find((f) => fieldType(f) === 'PDFTextField');
  if (!tf) return 'no text field';
  try {
    tf.setText('Иванов');
    await doc.save();
    return 'NO ERROR (unexpected — check output visually)';
  } catch (e) {
    return `throws as expected: ${e.message.split('\n')[0]}`;
  }
}

console.log('=== pdf-lib form spike ===\n');
for (const { id, file } of FORMS) {
  const bytes = await readFile(file);
  console.log(`--- ${id} (${file}, ${bytes.length} B) ---`);
  const { report } = await inspectForm(id, bytes);
  console.log(report.slice(0, 1).join(''));
  console.log(report.slice(1, 12).join('\n'));
  if (report.length > 12) console.log(`  ... (${report.length - 12} more fields)`);

  const res = await fillAndVerify(id, bytes);
  if (!res.ok) {
    console.log(`FILL: FAILED — ${res.error}`);
  } else {
    console.log(`FILL: ok, filled=${res.filledFields.join(', ')}`);
    console.log(`  editable=${res.editableSize}B flattened=${res.flatSize}B fieldsAfterFlatten=${res.fieldsAfterFlatten}`);
  }
  console.log(`CYRILLIC: ${await cyrillicTest(bytes)}`);
  console.log('');
}

await writeFile('fixtures/forms/.spike-ran', new Date().toISOString());
console.log('spike done');
