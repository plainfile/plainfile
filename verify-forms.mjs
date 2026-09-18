import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { PDFDocument, PDFName } from 'pdf-lib';
import * as mupdf from 'mupdf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const FORMS_DIR = path.resolve(FIXTURES_DIR, 'forms');
const OUT_DIR = path.resolve(__dirname, 'fixtures-out');

const FIXTURE = path.join(FORMS_DIR, 'fw9.pdf');

// Minimal 1x1 red PNG (base64-encoded).
const SIGNATURE_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const TEST_VALUES = {
  'topmostSubform[0].Page1[0].f1_01[0]': 'John A. Smith',
  'topmostSubform[0].Page1[0].f1_02[0]': 'Acme Corp',
};

const TEST_CHECKBOX = 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[0]';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hasPdftotext() {
  try {
    execSync('which pdftotext', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function extractTextWithMupdf(bytes) {
  const doc = await mupdf.PDFDocument.openDocument(bytes, 'application/pdf');
  const parts = [];
  const pageCount = doc.countPages();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    parts.push(page.toStructuredText().asText());
  }
  return parts.join('\n');
}

function extractTextExternal(pdfPath) {
  return execSync(`pdftotext "${pdfPath}" -`, { encoding: 'utf8' });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyEditableRoundTrip() {
  console.log('\n--- editable fill + reload ---');
  const bytes = fs.readFileSync(FIXTURE);
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  for (const [name, value] of Object.entries(TEST_VALUES)) {
    form.getTextField(name).setText(value);
  }
  form.getCheckBox(TEST_CHECKBOX).check();

  const editableBytes = await doc.save({ updateFieldAppearances: true });
  const editablePath = path.join(OUT_DIR, 'fw9-editable.pdf');
  fs.writeFileSync(editablePath, editableBytes);
  console.log(`  saved editable PDF (${editableBytes.length} bytes)`);

  const doc2 = await PDFDocument.load(editableBytes);
  const form2 = doc2.getForm();
  for (const [name, expected] of Object.entries(TEST_VALUES)) {
    const actual = form2.getTextField(name).getText();
    assert(actual === expected, `editable round-trip: "${name}" expected "${expected}", got "${actual}"`);
    console.log(`  ✓ text field "${name}" = "${actual}"`);
  }
  assert(form2.getCheckBox(TEST_CHECKBOX).isChecked(), 'editable round-trip: checkbox not checked');
  console.log('  ✓ checkbox is checked');
}

async function verifyFlatten() {
  console.log('\n--- flatten removes AcroForm fields ---');
  const bytes = fs.readFileSync(FIXTURE);
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  for (const [name, value] of Object.entries(TEST_VALUES)) {
    form.getTextField(name).setText(value);
  }
  form.getCheckBox(TEST_CHECKBOX).check();

  form.flatten();
  const flatBytes = await doc.save({ updateFieldAppearances: true });
  const flatPath = path.join(OUT_DIR, 'fw9-flat.pdf');
  fs.writeFileSync(flatPath, flatBytes);
  console.log(`  saved flattened PDF (${flatBytes.length} bytes)`);

  const doc2 = await PDFDocument.load(flatBytes);
  const remaining = doc2.getForm().getFields().length;
  assert(remaining === 0, `expected 0 fields after flatten, got ${remaining}`);
  console.log(`  ✓ flattened PDF has ${remaining} AcroForm fields`);

  return flatPath;
}

async function verifyTextExtraction(pdfPath) {
  console.log('\n--- text extraction ---');
  const expectedTexts = Object.values(TEST_VALUES);

  if (hasPdftotext()) {
    const text = extractTextExternal(pdfPath);
    for (const expected of expectedTexts) {
      assert(text.includes(expected), `pdftotext missing expected text: "${expected}"`);
      console.log(`  ✓ pdftotext contains "${expected}"`);
    }
  } else {
    console.log('  ⚠ pdftotext not installed, using MuPDF fallback');
    const bytes = fs.readFileSync(pdfPath);
    const text = await extractTextWithMupdf(bytes);
    for (const expected of expectedTexts) {
      assert(text.includes(expected), `MuPDF text extraction missing expected text: "${expected}"`);
      console.log(`  ✓ MuPDF text contains "${expected}"`);
    }
  }
}

function sanitizeMupdfDocument(doc) {
  const infoKeys = [
    mupdf.Document.META_INFO_TITLE,
    mupdf.Document.META_INFO_AUTHOR,
    mupdf.Document.META_INFO_SUBJECT,
    mupdf.Document.META_INFO_KEYWORDS,
    mupdf.Document.META_INFO_CREATOR,
    mupdf.Document.META_INFO_PRODUCER,
  ];
  for (const key of infoKeys) {
    try {
      doc.setMetaData(key, '');
    } catch {
      // ignore
    }
  }

  try {
    const trailer = doc.getTrailer();
    const root = trailer.get('Root');
    if (root && !root.isNull()) {
      root.delete('Metadata');
      root.delete('Names');
      root.delete('OpenAction');
      root.delete('AA');
    }
  } catch {
    // ignore
  }

  try {
    const iter = doc.outlineIterator();
    while (iter.item()) {
      iter.delete();
    }
  } catch {
    // ignore
  }

  const pageCount = doc.countPages();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    for (const annot of page.getAnnotations()) {
      try {
        page.deleteAnnotation(annot);
      } catch {
        // ignore
      }
    }
  }

  try {
    doc.subsetFonts();
  } catch {
    // ignore
  }
}

async function verifyMetadataCleared() {
  console.log('\n--- metadata cleared ---');
  const bytes = fs.readFileSync(FIXTURE);
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  for (const [name, value] of Object.entries(TEST_VALUES)) {
    form.getTextField(name).setText(value);
  }
  form.getCheckBox(TEST_CHECKBOX).check();

  // pdf-lib cannot fully clear the Producer entry on save, so pass the result
  // through the same MuPDF sanitizer used by verify.mjs to guarantee a clean file.
  form.flatten();
  const pdfLibBytes = await doc.save({ updateFieldAppearances: true });

  const mupdfDoc = await mupdf.PDFDocument.openDocument(pdfLibBytes, 'application/pdf');
  sanitizeMupdfDocument(mupdfDoc);
  const buf = mupdfDoc.saveToBuffer('garbage=4,compress=yes');
  const outBytes = new Uint8Array(buf.asUint8Array());

  const outPath = path.join(OUT_DIR, 'fw9-metadata.pdf');
  fs.writeFileSync(outPath, outBytes);

  const doc2 = await mupdf.PDFDocument.openDocument(outBytes, 'application/pdf');
  const title = doc2.getMetaData(mupdf.Document.META_INFO_TITLE);
  const author = doc2.getMetaData(mupdf.Document.META_INFO_AUTHOR);
  const producer = doc2.getMetaData(mupdf.Document.META_INFO_PRODUCER);
  assert((title ?? '') === '', `Title not cleared: "${title}"`);
  assert((author ?? '') === '', `Author not cleared: "${author}"`);
  assert((producer ?? '') === '', `Producer not cleared: "${producer}"`);

  let metadataPresent = false;
  try {
    const root = doc2.getTrailer().get('Root');
    const metadata = root?.get('Metadata');
    metadataPresent = metadata != null && !metadata.isNull();
  } catch {
    metadataPresent = false;
  }
  assert(!metadataPresent, 'XMP Metadata stream still present in catalog');

  console.log('  ✓ Info dictionary cleared');
  console.log('  ✓ XMP metadata stream removed');
}

async function verifySignatureEmbedded() {
  console.log('\n--- signature image embedded ---');
  const bytes = fs.readFileSync(FIXTURE);
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  for (const [name, value] of Object.entries(TEST_VALUES)) {
    form.getTextField(name).setText(value);
  }
  form.getCheckBox(TEST_CHECKBOX).check();

  const pngBytes = Buffer.from(SIGNATURE_PNG_B64, 'base64');
  const image = await doc.embedPng(pngBytes);
  const page = doc.getPages()[0];
  const pageHeight = page.getHeight();
  const sigWidth = 150;
  const sigHeight = 40;
  // UI-style top-left coordinates converted to PDF bottom-left origin.
  const sigUiX = 72;
  const sigUiY = 100;
  page.drawImage(image, {
    x: sigUiX,
    y: pageHeight - sigUiY - sigHeight,
    width: sigWidth,
    height: sigHeight,
  });

  form.flatten();
  const signedBytes = await doc.save({ updateFieldAppearances: true });
  const signedPath = path.join(OUT_DIR, 'fw9-signed.pdf');
  fs.writeFileSync(signedPath, signedBytes);
  console.log(`  saved signed PDF (${signedBytes.length} bytes)`);

  const doc2 = await PDFDocument.load(signedBytes);
  const page2 = doc2.getPages()[0];
  const resources = doc2.context.lookup(page2.node.get(PDFName.of('Resources')));
  const xObjects = doc2.context.lookup(resources.get(PDFName.of('XObject')));

  let imageCount = 0;
  for (const [, ref] of xObjects.entries()) {
    const obj = doc2.context.lookup(ref);
    const dict = obj?.dict ?? obj;
    const subtype = dict?.get?.(PDFName.of('Subtype'));
    if (subtype?.toString?.() === '/Image') {
      imageCount++;
    }
  }

  assert(imageCount > 0, `expected at least one image XObject in page resources, found ${imageCount}`);
  console.log(`  ✓ found ${imageCount} image XObject(s) in page resources`);
}

async function main() {
  ensureDir(OUT_DIR);

  let failed = false;

  try {
    await verifyEditableRoundTrip();
    const flatPath = await verifyFlatten();
    await verifyTextExtraction(flatPath);
    await verifyMetadataCleared();
    await verifySignatureEmbedded();
  } catch (err) {
    console.error(`\n  ✗ FAILED:`, err.message);
    failed = true;
  }

  console.log('\n==============================');
  if (failed) {
    console.log('VERIFY FORMS FAILED');
    process.exit(1);
  } else {
    console.log('ALL FORM CHECKS PASSED');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
