/**
 * D4 e2e smoke test for /forms/w-9.
 * Starts the dev server, opens the W-9 scenario page, waits for the embedded
 * template to load, fills a field, and verifies the Fill button works.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    await page.goto(`${url}/forms/w-9`);

    // Wait for page title / heading.
    await page.waitForSelector('text=Fill W-9', { timeout: 10000 });

    // Wait for the template to load and form fields to appear.
    await page.waitForSelector('text=Form fields', { timeout: 30000 });
    await page.waitForSelector('input[id^="field-"]', { timeout: 30000 });

    // Fill the first text field in the sidebar.
    const firstInput = page.locator('input[id^="field-"]').first();
    await firstInput.fill("E2E W-9 Test");

    // Click Fill and download.
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      page.locator('button:has-text("Fill and download PDF")').click(),
    ]);

    const downloadPath = await download.path();
    if (!downloadPath) {
      throw new Error("Download did not complete");
    }

    await browser.close();

    if (errors.length > 0) {
      console.warn("Console/page errors during test:", errors);
      process.exit(1);
    }

    console.log("E2E W-9 scenario test passed");
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
