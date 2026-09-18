/**
 * D7 Phase 2 e2e test for /pdf/fill with a flat PDF.
 * Starts the dev server, opens /pdf/fill, uploads flat.pdf, places a text
 * overlay, creates a typed signature, fills, downloads the resulting PDF,
 * and verifies it is a non-empty valid PDF using pdf-lib.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, "../fixtures/forms/flat.pdf");

async function startServer() {
  const proc = spawn("npm", ["run", "dev"], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "pipe",
    detached: true,
  });

  const url = await new Promise((resolve, reject) => {
    let output = "";
    const handler = (chunk) => {
      output += chunk.toString();
      const match = output.match(/Local:\s+(http:\/\/localhost:\d+)\//);
      if (match) {
        proc.stdout.off("data", handler);
        proc.stderr.off("data", handler);
        resolve(match[1]);
      }
    };
    proc.stdout.on("data", handler);
    proc.stderr.on("data", handler);
    setTimeout(() => reject(new Error("Server did not start in time: " + output)), 30000);
  });

  return { proc, url };
}

async function main() {
  const { proc, url } = await startServer();
  const errors = [];
  let downloaded = false;

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    context.on("page", (newPage) => {
      // Download started in a new page/context indicates success.
      downloaded = true;
    });

    await page.goto(`${url}/pdf/fill`);
    await page.waitForSelector("text=Drop a PDF here", { timeout: 10000 });

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // Wait for the page to render.
    await page.waitForSelector("text=Tools", { timeout: 30000 });

    // Switch to Text tool.
    await page.locator('button:has-text("Text")').click();

    // Click on the canvas to place a text overlay.
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    await canvas.click({ position: { x: box.width * 0.3, y: box.height * 0.4 } });

    // Type into the overlay input.
    const overlayInput = page.locator('input[class*="border-[#0066CC]"]').first();
    await overlayInput.fill("E2E Overlay");
    await overlayInput.press("Enter");

    // Open signature dialog.
    await page.locator('button:has-text("Sign")').click();
    await page.waitForSelector('text=Add signature', { timeout: 10000 });

    // Switch to Type mode.
    await page.locator('button:has-text("Type")').click();
    await page.locator('input#signature-name').fill("E2E Signer");

    // Save signature.
    await page.locator('button:has-text("Save")').click();

    // Wait for signature stamp to appear.
    await page.waitForSelector('img[alt="Signature"]', { timeout: 10000 });

    // Fill and download.
    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), "flat-e2e-"));
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      page.locator('button:has-text("Fill and download PDF")').click(),
    ]);

    const suggestedName = download.suggestedFilename();
    const downloadPath = path.join(downloadDir, suggestedName || "flat-filled.pdf");
    await download.saveAs(downloadPath);

    if (!fs.existsSync(downloadPath)) {
      throw new Error("Downloaded file was not saved");
    }

    const stats = fs.statSync(downloadPath);
    if (stats.size === 0) {
      throw new Error("Downloaded file is empty");
    }
    downloaded = true;
    console.log(`Downloaded ${path.basename(downloadPath)} (${stats.size} bytes)`);

    // Verify the downloaded file is a valid PDF using pdf-lib.
    const { PDFDocument } = await import("pdf-lib");
    const pdfBytes = fs.readFileSync(downloadPath);
    const doc = await PDFDocument.load(pdfBytes);
    const pageCount = doc.getPageCount();
    if (pageCount === 0) {
      throw new Error("Downloaded PDF has no pages");
    }
    console.log(`Verified valid PDF with ${pageCount} page(s)`);

    await browser.close();

    // Clean up the temporary download directory.
    try {
      fs.rmSync(downloadDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }

    if (errors.length > 0) {
      console.warn("Console/page errors during test:", errors);
      process.exit(1);
    }

    console.log("E2E flat PDF smoke test passed");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {
      proc.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
