import { createServer } from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const PORT = 3456;
// Keep in sync with src/routes-manifest.ts (all 13 routes).
const ROUTES = [
  '/',
  '/tools',
  '/privacy',
  '/pdf/redact',
  '/pdf/redact-bank-statement',
  '/pdf/redact-ssn',
  '/pdf/redact-medical-records',
  '/pdf/redact-emails',
  '/pdf/redact-legal-documents',
  '/pdf/redact-for-foia',
  '/guides/how-to-redact-pdf-properly',
  '/guides/why-black-marker-redaction-fails',
  '/compare/privacyscanpdf-alternative',
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

/**
 * Start a minimal static file server for the dist folder.
 * The SPA shell is read once into memory: route "/" overwrites
 * dist/index.html with its prerendered output, and re-reading the shell
 * from disk for later routes would compound duplicated head tags.
 *
 * The shell's static head tags (title/description/OG/Twitter/canonical)
 * are stripped before serving: under React 19 react-helmet-async renders
 * plain elements without its data-rh marker, so every route re-adds the
 * full set via <SEO> at runtime. Keeping the static copies would produce
 * duplicate titles and conflicting canonicals in the saved HTML.
 */
async function serveStatic(root, port) {
  const rawShell = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  const shellHtml = rawShell
    .replace(/<title>[^<]*<\/title>/g, '')
    .replace(/<meta name="description"[^>]*>/g, '')
    .replace(/<meta property="og:[^"]*"[^>]*>/g, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>/g, '')
    .replace(/<link rel="canonical"[^>]*>/g, '');
  const server = createServer(async (req, res) => {
    const pathname = req.url.split('?')[0];
    const ext = path.extname(pathname);

    // Serve real asset files (JS, CSS, WASM, images, etc.) directly.
    if (ext && ext !== '.html') {
      const assetPath = path.join(root, pathname);
      try {
        const content = await fs.readFile(assetPath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(content);
        return;
      } catch {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    }

    // For HTML pages and SPA routes, always fall back to the in-memory
    // shell so React Router can render the correct route during prerendering.
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(shellHtml);
  });

  await new Promise((resolve) => server.listen(port, resolve));
  return server;
}

/**
 * Remove dynamically injected GA script tags so they are not duplicated
 * when the client re-runs the inline GA loader on hydration.
 */
async function cleanupInjectedGtagScripts(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')
      .forEach((script) => script.remove());
  });
}

/**
 * Remove Vite's runtime <link rel="modulepreload"> tags.
 * They are injected during client hydration and carry the absolute origin
 * of the prerender server (e.g. http://localhost:3456). If left in the saved
 * HTML, they leak the local preview URL into production markup.
 */
async function cleanupModulePreloadLinks(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('link[rel="modulepreload"]')
      .forEach((link) => link.remove());
  });
}

/**
 * Verify that React actually rendered the SEO tags (via <SEO> + helmet)
 * before saving the prerendered HTML. Without this guard a broken page
 * would be saved with no title/canonical at all.
 */
async function assertSeoTagsPresent(page, route) {
  const counts = await page.evaluate(() => ({
    title: document.querySelectorAll('title').length,
    canonical: document.querySelectorAll('link[rel="canonical"]').length,
    description: document.querySelectorAll('meta[name="description"]').length,
  }));
  if (counts.title !== 1 || counts.canonical !== 1 || counts.description !== 1) {
    throw new Error(
      `Prerender of ${route} produced invalid head: ` + JSON.stringify(counts) +
        ' (expected exactly one title, canonical and description).'
    );
  }
}

async function main() {
  // The static server falls back to dist/index.html for every route. If the
  // build hasn't been run, the server will return a plain 404 page and
  // Puppeteer will happily write that 404 into every prerendered file.
  const indexHtmlPath = path.join(DIST_DIR, 'index.html');
  try {
    await fs.access(indexHtmlPath);
  } catch {
    throw new Error(
      `dist/index.html is missing. Run \`npm run build\` before \`npm run prerender\`.`
    );
  }

  const server = await serveStatic(DIST_DIR, PORT);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    for (const route of ROUTES) {
      const url = `http://localhost:${PORT}${route}`;
      const response = await page.goto(url, { waitUntil: 'networkidle2' });
      if (!response || response.status() >= 400) {
        throw new Error(
          `Prerender of ${route} failed with HTTP ${response ? response.status() : 'no response'}.` +
            ' Make sure the build produced a valid dist/index.html.'
        );
      }
      await cleanupInjectedGtagScripts(page);
      await cleanupModulePreloadLinks(page);
      await assertSeoTagsPresent(page, route);

      const html = await page.content();
      const outputPath =
        route === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, route, 'index.html');

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, html);

      console.log(`Prerendered ${route} -> ${outputPath}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
