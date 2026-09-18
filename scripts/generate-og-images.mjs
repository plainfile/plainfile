import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_HTML = path.join(__dirname, "og-template.html");
const OUT_DIR = path.join(__dirname, "../public/og");

// Keep titles/descriptions in sync with the SEO copy in src/lib/forms.ts and
// the form pages so the OG preview matches the page metadata.
const VARIANTS = [
  {
    id: "default",
    title: "PlainFile — Free Browser Tools for Your Files",
    desc: "PDF redaction, form filling, and more. No uploads. No sign-ups. No tracking.",
  },
  {
    id: "fill",
    title: "Fill PDF Form Online Free — No Sign Up, No Upload",
    desc: "Type, fill and download completed PDF forms right in your browser. Your data never leaves your device.",
  },
  {
    id: "forms",
    title: "Fill Government Forms Online — Free, No Upload, No Sign Up",
    desc: "Browse and fill W-9, I-9, DS-11, DS-82, W-4, Schengen visa and more in your browser.",
  },
  {
    id: "w-9",
    title: "Fill W-9 Online Free — No Sign Up, No Upload",
    desc: "Fill IRS Form W-9 online for free. No sign-up, no upload — complete the official template in your browser and download the filled PDF.",
  },
  {
    id: "i-9",
    title: "Fill I-9 Form Online Free — No Sign Up, No Upload",
    desc: "Fill USCIS Form I-9 online for free. No sign-up, no upload — complete the official employment eligibility form in your browser.",
  },
  {
    id: "ds-11",
    title: "Fill DS-11 Passport Application Online Free — No Sign Up",
    desc: "Complete the DS-11 U.S. passport application online for free. No sign-up, no upload — fill the official State Department form in your browser.",
  },
  {
    id: "ds-82",
    title: "Fill DS-82 Passport Renewal Online Free — No Sign Up",
    desc: "Renew your U.S. passport with Form DS-82 online for free. No sign-up, no upload — complete the official renewal form in your browser.",
  },
  {
    id: "w-4",
    title: "Fill W-4 Online 2026 Free — No Sign Up, No Upload",
    desc: "Fill out IRS Form W-4 for 2026 online for free. No sign-up, no upload — adjust your withholding in your browser.",
  },
  {
    id: "schengen",
    title: "Schengen Visa Application Form — Fill Online Free, No Sign Up",
    desc: "Fill the Schengen visa application form online for free. No sign-up, no upload — complete the EU short-stay visa form in your browser.",
  },
];

const VIEWPORT = { width: 1200, height: 630 };

async function screenshotWithPlaywright(page, fileUrl, variant) {
  const url =
    `${fileUrl}?title=${encodeURIComponent(variant.title)}` +
    `&desc=${encodeURIComponent(variant.desc)}`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(100);
  const outPath = path.join(OUT_DIR, `${variant.id}.png`);
  await page.screenshot({
    path: outPath,
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
  });
  console.log(`Generated ${outPath}`);
}

async function generateSvgPlaceholder(variant) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <circle cx="1080" cy="80" r="260" fill="rgba(0,102,204,0.18)"/>
  <text x="80" y="96" fill="#a3a3a3" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="22" font-weight="600" letter-spacing="1">PlainFile</text>
  <text x="80" y="280" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="56" font-weight="800">${escapeXml(variant.title)}</text>
  <text x="80" y="360" fill="#d4d4d4" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28">${escapeXml(variant.desc)}</text>
  <text x="80" y="590" fill="#737373" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="18">Free. No uploads. No sign-ups. No tracking.</text>
</svg>`;
  const svgPath = path.join(OUT_DIR, `${variant.id}.svg`);
  await fs.writeFile(svgPath, svg, "utf8");
  return svgPath;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function convertSvgWithPuppeteer(variant, svgPath) {
  // Dynamic import so the main path never fails when puppeteer is absent.
  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1 });
    await page.goto("file://" + svgPath, { waitUntil: "networkidle0" });
    const outPath = path.join(OUT_DIR, `${variant.id}.png`);
    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
    console.log(`Generated ${outPath} (via SVG fallback)`);
  } finally {
    await browser.close();
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (playwrightErr) {
    console.warn("Playwright chromium launch failed, falling back to SVG + puppeteer:", playwrightErr.message);
    for (const variant of VARIANTS) {
      const svgPath = await generateSvgPlaceholder(variant);
      await convertSvgWithPuppeteer(variant, svgPath);
    }
    return;
  }

  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    const fileUrl = "file://" + TEMPLATE_HTML;
    for (const variant of VARIANTS) {
      await screenshotWithPlaywright(page, fileUrl, variant);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
