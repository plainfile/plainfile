/**
 * D3 e2e smoke test for flat PDF text overlay + signature.
 * Starts the dev server, opens /pdf/fill, uploads flat.pdf, places a text
 * overlay, creates a typed signature, fills, and verifies a download occurs.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
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
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      page.locator('button:has-text("Fill and download PDF")').click(),
    ]);

    const downloadPath = await download.path();
    if (!downloadPath) {
      throw new Error("Download did not complete");
    }
    downloaded = true;

    await browser.close();

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
