/**
 * D2 e2e smoke test for /pdf/fill.
 * Starts the dev server, opens /pdf/fill, uploads fw9.pdf, fills a field,
 * clicks Fill, and verifies no errors appear.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, "../fixtures/forms/fw9.pdf");

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

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(`${url}/pdf/fill`);
    await page.waitForSelector("text=Drop a PDF here", { timeout: 10000 });

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // Wait for the sidebar field list to appear.
    await page.waitForSelector("text=Form fields", { timeout: 30000 });
    // Wait until at least one field input is rendered in the sidebar.
    await page.waitForSelector('input[id^="field-"]', { timeout: 30000 });

    // Fill the first text input in the sidebar.
    const firstInput = page.locator('input[id^="field-"]').first();
    await firstInput.fill("E2E Test");

    // Click Fill and download.
    await page.locator('button:has-text("Fill and download PDF")').click();

    // Wait for the download/repeat button to appear (indicates fill completed).
    await page.waitForSelector('button:has-text("Download filled PDF")', { timeout: 30000 });

    await browser.close();

    if (errors.length > 0) {
      console.warn("Console/page errors during test:", errors);
      process.exit(1);
    }

    console.log("E2E forms smoke test passed");
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
