import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, "../fixtures/basic.pdf");

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

    await page.goto(`${url}/pdf/redact`);
    await page.waitForSelector("text=Drop a PDF here", { timeout: 10000 });

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);
    await page.waitForSelector("text=Page 1 of 1", { timeout: 30000 });

    // Search with the SSN regex preset.
    await page.locator('label[for="ssn"]').click();
    await page.locator('button:has-text("Find matches")').click();
    await page.waitForSelector('text=match(es) marked for redaction', { timeout: 30000 });

    // Apply redactions and confirm.
    await page.locator('button:has-text("Apply redactions")').click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Wait for auto-verification.
    await page.waitForSelector('text=Verified: 0 matches remain', { timeout: 30000 });

    await browser.close();

    if (errors.length > 0) {
      console.warn("Console/page errors during test:", errors);
      process.exit(1);
    }

    console.log("E2E smoke test passed");
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
