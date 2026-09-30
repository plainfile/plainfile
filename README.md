# PlainFile

> Free browser tools for your files. No uploads. No sign-ups.

**PlainFile** is a privacy-first collection of file-processing tools that run entirely in your browser using WebAssembly. Your files never leave your device.

**Live:** [plainfile.io](https://plainfile.io)

## Current tools

| Tool | Path | What it does |
|------|------|-------------|
| PDF Redaction | `/pdf/redact` | Permanently remove text, images and metadata from PDFs — not black boxes on top |
| Fill PDF Forms | `/pdf/fill` | Fill AcroForm PDFs, add text, checkboxes and signatures |
| Government Forms | `/forms` | W-9, I-9, DS-11, DS-82, W-4, Schengen — with embedded templates |
| HEIC to JPG/PNG | `/heic/to-jpg` | Convert iPhone HEIC photos locally. Batch, ZIP, metadata stripped |
| EXIF Remover | `/exif/remove` | Strip EXIF/GPS/metadata from JPEG, PNG, WebP — lossless, with before/after verification |
| EXIF Viewer | `/exif/viewer` | Inspect grouped EXIF tags and GPS coordinates (opt-in map) |

Each tool cluster also ships scenario pages (e.g. `/pdf/redact-bank-statement`, `/exif/remove-gps`, `/heic/wont-open-on-windows`) and guides under `/guides/`.

## Why PlainFile is different

Most "free" file tools upload your file to a server, process it, and send it back. PlainFile never does that.

- **Zero uploads** — All processing happens locally in your browser via WebAssembly (WASM); heavy work runs in Web Workers
- **True redaction** — Not black boxes on top. Content is actually deleted from the file structure, then re-verified
- **Automatic verification** — After redaction/stripping, the tool re-opens the result and confirms the sensitive data is gone
- **No accounts** — Open the page, drop a file, process, download. That's it.
- **Offline-capable** — After first load, engines and workers are cached. Disconnect from the internet and keep working.

## Architecture

Each tool is a self-contained feature folder; shared UI/routing/catalog/sitemap are generated from a single route manifest.

```
src/
├── components/   # platform (Layout, SEO, CookieConsent, ui/) — frozen
├── pages/        # Home, Tools (generated from manifest), Privacy, guides/
├── lib/          # platform utilities
└── tools/        # one folder per tool: page, UI, engine.ts, worker.ts, scenarios
    ├── redact/   # MuPDF-based PDF redaction
    ├── fill/     # PDF form filling (depends on redact engine/worker)
    ├── heic/     # libheif-js conversion
    └── exif/     # exifr + piexifjs lossless metadata removal
```

See [`CONTRACT.md`](./CONTRACT.md) before adding a new tool: your folder + one manifest entry + manual backlinks. Everything else (routing, catalog, nav, sitemap, prerender) is derived.

## Tech stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS 3.4** + **shadcn/ui**
- **MuPDF WASM** — PDF parsing, rendering, redaction, text extraction
- **libheif-js** — HEIC decode (lazy); **exifr** + **piexifjs** — EXIF read/strip (lazy)
- **Web Workers** — Heavy processing off the main thread
- **PWA** — Service Worker precaches WASM for offline use

## How true redaction works

1. You mark regions (draw rectangles or search for text)
2. MuPDF creates Redact annotations over those areas
3. `applyRedactions()` actually removes the underlying text, images and vector art
4. Full sanitization: metadata (Info/XMP), annotations, embedded files, JS, outlines — all stripped
5. `saveToBuffer('garbage=4,compress=yes')` rebuilds the PDF from scratch (not incremental)
6. Auto-verify: re-open the result, extract all text, confirm zero matches for redacted terms

EXIF removal follows the same principle: JPEG is rewritten without its APP1/APP13 segments and thumbnails (pixels untouched), PNG/WebP get their `eXIf`/`EXIF` chunks stripped or surgically rebuilt — then every result is re-read to count removed vs kept tags.

## Build & run

```bash
cd app
npm install
npm run dev       # http://localhost:3000
npm run build     # production build → dist/ (+ sitemap)
npm run prerender # static HTML for all routes
```

## Test

Per-tool golden-fixture gates and Playwright e2e smokes:

```bash
npm run verify          # PDF redaction (MuPDF + raw bytes)
npm run verify:forms    # PDF form filling
npm run verify:heic     # HEIC conversion
npm run verify:exif     # EXIF read/strip (lossless pixel checks)

node scripts/e2e-smoke.mjs  # redaction: upload → search → apply → verified
node scripts/e2e-exif.mjs   # EXIF: upload → GPS shown → strip → verified → download
```

## License

AGPL-3.0. See [LICENSE](./LICENSE).

## Privacy

See [plainfile.io/privacy](https://plainfile.io/privacy). In short: we don't see your files. Optional Google Analytics only with explicit cookie consent. The EXIF map loads OpenStreetMap tiles only after an explicit click.

---

*Built with quiet confidence.*
