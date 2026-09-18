import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'pdf-lib';

const { PDFDocument, StandardFonts, rgb } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function drawBasic() {
  const doc = await PDFDocument.create();
  doc.setTitle('HR Confidential');
  doc.setAuthor('HR Department');
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  page.drawText('Employee Record', { x: 50, y: height - 60, size: 18, font });
  page.drawText('Name: John Doe', { x: 50, y: height - 110, size: 12, font });
  page.drawText('SSN: 123-45-6789', { x: 50, y: height - 140, size: 12, font });
  page.drawText('Salary: $75,000', { x: 50, y: height - 170, size: 12, font });
  page.drawText('Department: Engineering', { x: 50, y: height - 200, size: 12, font });
  fs.writeFileSync(path.join(FIXTURES_DIR, 'basic.pdf'), await doc.save());
}

async function drawMultipage() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 3; i++) {
    const page = doc.addPage([612, 792]);
    const { width, height } = page.getSize();
    page.drawText(`Page ${i + 1}`, { x: 50, y: height - 60, size: 18, font });
    page.drawText('Confidential token:', { x: 50, y: height - 120, size: 12, font });
    page.drawText('secret-token-42', { x: 200, y: height - 120, size: 12, font });
  }
  fs.writeFileSync(path.join(FIXTURES_DIR, 'multipage.pdf'), await doc.save());
}

async function drawWithAnnotation() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  page.drawText('Report with annotation', { x: 50, y: height - 60, size: 18, font });
  page.drawText('This document contains classified information.', { x: 50, y: height - 120, size: 12, font });
  page.drawText('Please handle with care.', { x: 50, y: height - 150, size: 12, font });
  page.drawText('Notes: classified review pending.', { x: 50, y: height - 180, size: 12, font });

  // pdf-lib does not have a high-level annotation API, but we can add text-based notes via text only.
  // We include "classified" in the text above so search/redaction removes it.
  fs.writeFileSync(path.join(FIXTURES_DIR, 'with-annotation.pdf'), await doc.save());
}

async function drawRepeated() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  page.drawText('Payment card samples', { x: 50, y: height - 60, size: 18, font });
  const card = '4111-1111-1111-1111';
  for (let i = 0; i < 5; i++) {
    page.drawText(`Card ${i + 1}: ${card}`, { x: 50, y: height - 110 - i * 40, size: 12, font });
  }
  fs.writeFileSync(path.join(FIXTURES_DIR, 'repeated.pdf'), await doc.save());
}

async function drawNoSecret() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  page.drawText('Public document', { x: 50, y: height - 60, size: 18, font });
  page.drawText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.', { x: 50, y: height - 110, size: 12, font });
  page.drawText('This page contains no secrets.', { x: 50, y: height - 140, size: 12, font });
  fs.writeFileSync(path.join(FIXTURES_DIR, 'no-secret.pdf'), await doc.save());
}

async function drawFlat() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const drawLine = (y) => page.drawLine({ start: { x: 150, y }, end: { x: 450, y }, thickness: 1, color: rgb(0, 0, 0) });
  page.drawText('Flat PDF - no form fields', { x: 72, y: 720, size: 18, font });
  page.drawText('Name:', { x: 72, y: 650, size: 12, font });
  drawLine(655);
  page.drawText('Date:', { x: 72, y: 600, size: 12, font });
  drawLine(605);
  page.drawText('Signature:', { x: 72, y: 550, size: 12, font });
  drawLine(555);
  const formsDir = path.join(FIXTURES_DIR, 'forms');
  ensureDir(formsDir);
  fs.writeFileSync(path.join(formsDir, 'flat.pdf'), await doc.save());
}

async function main() {
  ensureDir(FIXTURES_DIR);
  await drawBasic();
  await drawMultipage();
  await drawWithAnnotation();
  await drawRepeated();
  await drawNoSecret();
  await drawFlat();
  console.log('Fixtures written to', FIXTURES_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
