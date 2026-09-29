import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, "../fixtures/heic/example.heic");

async function startServer() {
  const proc = spawn("npm", ["run", "dev"], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "pipe",
    // Own process group so we can kill npm AND the vite grandchild —
    // otherwise vite survives SIGTERM to npm and holds our stdout pipe
    // open, so this script never exits.
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
    setTimeout(() => reject(new Error("Server did not start in time: " + output)), 15000);
  });

  return { proc, url };
}

function isValidJpeg(bytes) {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

async function main() {
  const { proc, url } = await startServer();
  const errors = [];
  const networkRequests = [];

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    page.on("request", (request) => {
      networkRequests.push(request);
    });

    await page.goto(`${url}/heic/to-jpg`);
    await page.waitForSelector("text=HEIC", { timeout: 10000 });

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // Trigger conversion. Some implementations may convert automatically on drop;
    // clicking Convert is the explicit path recommended in the study.
    const convertButton = page.locator('button:has-text("Convert")');
    if (await convertButton.isVisible().catch(() => false)) {
      await convertButton.click();
    }

    // Wait for the per-file or batch Download button to become visible and enabled.
    const downloadButton = await page.waitForSelector(
      'button:has-text("Download"):enabled',
      { timeout: 60000 },
    );

    // Download the converted file and validate JPEG magic bytes.
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      downloadButton.click(),
    ]);

    const downloadPath = await download.path();
    const bytes = fs.readFileSync(downloadPath);

    if (!isValidJpeg(bytes)) {
      throw new Error(`Downloaded file is not a valid JPEG (missing SOI marker). Size: ${bytes.length}`);
    }

    // Privacy smoke check: no network request should carry the uploaded file bytes.
    // We approximate this by rejecting any POST/PUT request with a large body.
    for (const request of networkRequests) {
      const method = request.method();
      const postData = request.postData();
      if (postData && (method === "POST" || method === "PUT") && postData.length > 10000) {
        throw new Error(
          `Potential upload detected: ${method} ${request.url()} with body ${postData.length} bytes`
        );
      }
    }

    await browser.close();

    if (errors.length > 0) {
      console.warn("Console/page errors during test:", errors);
      process.exit(1);
    }

    console.log(`E2E HEIC test passed (${bytes.length} bytes, valid JPEG)`);
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
