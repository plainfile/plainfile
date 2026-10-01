/**
 * Builds the redaction-audit fixture: a document whose only purpose is to expose what a
 * redaction tool fails to remove.
 *
 * Produces two files in fixtures/audit/:
 *   audit-fixture.pdf        the source document (nothing removed)
 *   audit-fixture-naive.pdf  the same document with a black rectangle drawn over the SSN,
 *                            i.e. what a "black box" redaction does — the text is still there
 *
 * Usage:
 *   node scripts/make-audit-fixture.mjs
 *
 * All content is synthetic (see scripts/audit-tokens.mjs). No real personal data is used
 * anywhere in this research.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'pdf-lib';
import { TOKENS } from './audit-tokens.mjs';

const { PDFDocument, StandardFonts, rgb } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../fixtures/audit');

const token = (id) => TOKENS.find((t) => t.id === id).value;

/** Page 1 — the visible record. Every token appears in the text layer. */
function drawRecordPage(page, font) {
  const { height } = page.getSize();
  const line = (text, y, size = 12, color = rgb(0, 0, 0)) =>
    page.drawText(text, { x: 50, y: height - y, size, font, color });

  line('CONFIDENTIAL — CLIENT INTAKE RECORD', 60, 16);
  line('Synthetic test document. Not a real person.', 82, 9, rgb(0.4, 0.4, 0.4));
  line(`Name:            ${token('name')}`, 130);
  line(`Date of birth:   ${token('dob')}`, 155);
  line(`SSN:             ${token('ssn')}`, 180);
  line(`Account:         ${token('account')}`, 205);
  line(`IBAN:            ${token('iban')}`, 230);
  line(`Email:           ${token('email')}`, 255);
  line(`Phone:           ${token('phone')}`, 280);
  line(`Case reference:  ${token('case')}`, 305);
}

/** Page 2 — layering test: one token exists only as white text on white paper. */
function drawHiddenLayerPage(page, font) {
  const { height } = page.getSize();
  page.drawText('Page 2 — layering test', { x: 50, y: height - 60, size: 16, font });
  page.drawText('This page looks blank. It is not.', {
    x: 50, y: height - 90, size: 10, font, color: rgb(0.4, 0.4, 0.4),
  });
  // Invisible text: present in the content stream and in any text extraction,
  // invisible to a human selecting regions by eye.
  page.drawText(token('hidden'), { x: 50, y: height - 140, size: 12, font, color: rgb(1, 1, 1) });
  page.drawText(token('case'), { x: 50, y: height - 165, size: 12, font, color: rgb(1, 1, 1) });
}

/** Page 3 — the black-box case, optionally with the naive rectangle already applied. */
function drawBlackBoxPage(page, font, { coverWithRectangle }) {
  const { height } = page.getSize();
  page.drawText('Page 3 — black box test', { x: 50, y: height - 60, size: 16, font });
  page.drawText('Client tax identifier:', { x: 50, y: height - 120, size: 12, font });
  page.drawText(token('ssn'), { x: 200, y: height - 120, size: 12, font });

  if (coverWithRectangle) {
    // Coordinates are in PDF points with the origin at the bottom-left.
    page.drawRectangle({
      x: 196, y: height - 126, width: 90, height: 16, color: rgb(0, 0, 0),
    });
    page.drawText('(redacted)', { x: 300, y: height - 120, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  }
}

async function build({ coverWithRectangle, fileName }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Metadata carries tokens on purpose: a tool that only removes visible marks leaves these behind.
  doc.setTitle(`Client intake — ${token('case')}`);
  doc.setAuthor(token('name'));
  doc.setSubject(`SSN ${token('ssn')}`);
  doc.setKeywords([token('case'), token('account'), 'confidential']);
  doc.setCreator('PlainFile redaction audit fixture');
  doc.setProducer('pdf-lib');

  const page1 = doc.addPage([612, 792]);
  const page2 = doc.addPage([612, 792]);
  const page3 = doc.addPage([612, 792]);
  drawRecordPage(page1, font);
  drawHiddenLayerPage(page2, font);
  drawBlackBoxPage(page3, font, { coverWithRectangle });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(outPath, await doc.save());
  return outPath;
}

async function main() {
  const source = await build({ coverWithRectangle: false, fileName: 'audit-fixture.pdf' });
  const naive = await build({ coverWithRectangle: true, fileName: 'audit-fixture-naive.pdf' });

  console.log('Audit fixtures written:');
  console.log(`  ${source}   (3 pages, 9 tokens, metadata tokens planted)`);
  console.log(`  ${naive}     (same, with a black rectangle over the SSN on page 3)`);
  console.log('\nNext: node scripts/redaction-audit.mjs fixtures/audit/audit-fixture-naive.pdf');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
