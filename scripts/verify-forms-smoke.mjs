/**
 * D2 smoke verification for PDF form filling.
 * Tests pdf-lib form logic on the W-9 fixture without a browser.
 */
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, '../fixtures/forms/fw9.pdf');

function fieldType(f) {
  return f.constructor.name;
}

async function main() {
  const bytes = await readFile(FIXTURE);
  console.log(`Loaded ${FIXTURE} (${bytes.length} bytes)`);

  // --- inspect: count fields, identify types ---
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const fields = form.getFields();
  console.log(`Found ${fields.length} AcroForm fields`);

  if (fields.length === 0) {
    throw new Error('forms-smoke: FAIL: no fields found');
  }

  // --- fill first 3 text fields, respecting maxLength ---
  const textFields = fields.filter((f) => fieldType(f) === 'PDFTextField');
  const toFill = textFields.slice(0, 3);
  if (toFill.length < 3) {
    throw new Error(`forms-smoke: FAIL: expected at least 3 text fields, got ${toFill.length}`);
  }

  const testValues = ['John', 'A', 'Smith'];
  const filled = [];
  for (let i = 0; i < toFill.length; i++) {
    const tf = toFill[i];
    const name = tf.getName();
    const maxLength = tf.getMaxLength();
    let value = testValues[i];
    if (maxLength !== undefined && value.length > maxLength) {
      value = value.slice(0, maxLength);
    }
    tf.setText(value);
    filled.push({ name, value, maxLength });
    console.log(`  Filled "${name}" with "${value}" (maxLength=${maxLength ?? 'none'})`);
  }

  const editableBytes = await doc.save({ updateFieldAppearances: true });
  console.log(`Saved editable PDF (${editableBytes.length} bytes)`);

  // --- reload and assert persistence ---
  const doc2 = await PDFDocument.load(editableBytes);
  const form2 = doc2.getForm();
  for (const { name, value } of filled) {
    const f2 = form2.getTextField(name);
    const actual = f2.getText();
    if (actual !== value) {
      throw new Error(`forms-smoke: FAIL: value lost for "${name}": expected "${value}", got "${actual}"`);
    }
    console.log(`  Persisted "${name}" = "${actual}"`);
  }

  // --- flatten and assert 0 fields ---
  const doc3 = await PDFDocument.load(bytes);
  const form3 = doc3.getForm();
  for (let i = 0; i < toFill.length; i++) {
    const tf = form3.getTextField(toFill[i].getName());
    const maxLength = tf.getMaxLength();
    let value = testValues[i];
    if (maxLength !== undefined && value.length > maxLength) {
      value = value.slice(0, maxLength);
    }
    tf.setText(value);
  }
  form3.flatten();
  const flatBytes = await doc3.save({ updateFieldAppearances: true });
  const doc4 = await PDFDocument.load(flatBytes);
  const remaining = doc4.getForm().getFields().length;
  if (remaining !== 0) {
    throw new Error(`forms-smoke: FAIL: expected 0 fields after flatten, got ${remaining}`);
  }
  console.log(`Flattened PDF has ${remaining} fields`);

  console.log('forms-smoke: PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
