// e2e-exif.mjs — Playwright smoke test для EXIF-инструмента (план Phase 2, §B.5).
// /exif/remove → загрузка fixture → таблица/GPS показаны → Remove → diff «N removed».
// Dev-сервер стартует автоматически (паттерн: scripts/e2e-smoke.mjs).

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import piexif from "piexifjs";
import jpeg from "jpeg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(APP_ROOT, "fixtures-out", "exif-e2e");
const FIXTURE = path.resolve(OUT_DIR, "e2e-fixture.jpg");

function makeFixture() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const img = jpeg.encode({ data: Buffer.alloc(48 * 48 * 4, 180), width: 48, height: 48 }, 90);
  const dict = {
    "0th": {
      [piexif.ImageIFD.Make]: "E2EMake",
      [piexif.ImageIFD.Model]: "E2EModel",
    },
    Exif: { [piexif.ExifIFD.ISOSpeedRatings]: 400 },
    GPS: {
      [piexif.GPSIFD.GPSLatitudeRef]: "N",
      [piexif.GPSIFD.GPSLatitude]: [[37, 1], [46, 1], [2964, 100]],
      [piexif.GPSIFD.GPSLongitudeRef]: "W",
      [piexif.GPSIFD.GPSLongitude]: [[122, 1], [25, 1], [984, 100]],
    },
    Interop: {},
    "1st": {},
    thumbnail: null,
  };
  const withExif = piexif.insert(piexif.dump(dict), img.data.toString("binary"));
  fs.writeFileSync(FIXTURE, Buffer.from(withExif, "binary"));
}

async function startServer() {
  const proc = spawn("npm", ["run", "dev"], {
    cwd: APP_ROOT,
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
    setTimeout(() => reject(new Error("Server did not start in time: " + output)), 15000);
  });
  return { proc, url };
}

function killServer(proc) {
  try {
    process.kill(-proc.pid, "SIGKILL");
  } catch {
    /* already gone */
  }
}

async function main() {
  makeFixture();
  const { proc, url } = await startServer();
  const errors = [];
  let failed = false;

  const check = (name, cond, extra = "") => {
    if (cond) console.log(`  ok  ${name}`);
    else {
      failed = true;
      console.log(`FAIL  ${name} ${extra}`);
    }
  };

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(`${url}/exif/remove`);
    await page.waitForSelector("text=Remove EXIF Metadata", { timeout: 15000 });
    // First dev start may re-optimize newly added deps (exifr/piexifjs/leaflet)
    // and reload the page — warm up, then load the page for the real test.
    await page.waitForTimeout(1500);
    await page.goto(`${url}/exif/remove`);
    await page.waitForSelector("text=Remove EXIF Metadata", { timeout: 15000 });

    await page.locator('input[type="file"]').setInputFiles(FIXTURE);
    // Группы тегов + GPS-блок появляются после read.
    await page.waitForSelector("text=E2EMake", { timeout: 20000 });
    check("viewer: Make shown in tag table", true);
    await page.waitForSelector("text=37.774900", { timeout: 10000 });
    check("viewer: GPS coordinates shown", true);
    check("viewer: map NOT loaded before opt-in", (await page.locator(".leaflet-container").count()) === 0);

    // strip(all) — режим выбран по умолчанию.
    await page.getByRole("button", { name: "Remove metadata" }).click();
    await page.waitForSelector("text=Verified:", { timeout: 20000 });
    const verifiedText = await page.locator("text=Verified:").innerText();
    check("strip: verified diff shown", /removed/.test(verifiedText), verifiedText);

    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: "Download cleaned file" }).click();
    const download = await downloadPromise;
    check("strip: download offered", /noexif\.jpg$/.test(download.suggestedFilename()), download.suggestedFilename());

    // После очистки теги исходника из result-card не исчезают (это оригинал),
    // но GPS-бейдж в сводке всё ещё об исходном файле — проверяем, что результат
    // реально очищен: скачанный файл читаем прямо здесь.
    const downloadedPath = path.join(OUT_DIR, download.suggestedFilename());
    await download.saveAs(downloadedPath);
    const exifr = (await import("exifr")).default;
    const raw = await exifr.parse(fs.readFileSync(downloadedPath)).catch(() => undefined);
    check("strip: downloaded file has no EXIF", !raw || Object.keys(raw).length === 0, JSON.stringify(raw));

    await browser.close();

    check("no page errors", errors.length === 0, errors.join(" | "));
  } catch (err) {
    failed = true;
    console.error(err);
  } finally {
    killServer(proc);
  }

  if (failed || errors.length > 0) {
    console.log("\nE2E EXIF FAILED");
    process.exit(1);
  }
  console.log("\nE2E EXIF smoke test passed");
  process.exit(0);
}

main();
