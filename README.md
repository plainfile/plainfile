# PlainFile

> Free browser tools for your files. No uploads. No sign-ups.

**PlainFile** is a privacy-first collection of file-processing tools that run entirely in your browser using WebAssembly. Your files never leave your device.

**Live:** [plainfile.io](https://plainfile.io)

## Current tools

| Tool | Status | What it does |
|------|--------|-------------|
| [PDF Redaction](https://plainfile.io/pdf/redact) | ✅ Ready | Permanently remove text, images and metadata from PDFs |
| Redact Bank Statement | ✅ Ready | Remove account numbers, transactions, balances |
| Redact SSN | ✅ Ready | Find and remove Social Security Numbers |
| Redact Medical Records | ✅ Ready | Remove PHI (names, DOB, MRN, diagnoses) |

## Why PlainFile is different

Most "free" PDF tools upload your file to a server, process it, and send it back. PlainFile never does that.

- **Zero uploads** — All processing happens locally in your browser via WebAssembly (WASM)
- **True redaction** — Not black boxes on top. Content is actually deleted from the PDF structure
- **Automatic verification** — After applying redactions, the tool re-opens the result and confirms nothing extractable remains
- **No accounts** — Open the page, drop a PDF, redact, download. That's it.
- **Offline-capable** — After first load, the WASM engine and worker are cached. Disconnect from the internet and keep redacting.

## Tech stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS 3.4** + **shadcn/ui**
- **MuPDF WASM** — PDF parsing, rendering, redaction, text extraction
- **Web Workers** — Heavy processing off the main thread
- **PWA** — Service Worker precaches WASM for offline use

## How true redaction works

1. You mark regions (draw rectangles or search for text)
2. MuPDF creates Redact annotations over those areas
3. `applyRedactions()` actually removes the underlying text, images and vector art
4. Full sanitization: metadata (Info/XMP), annotations, embedded files, JS, outlines — all stripped
5. `saveToBuffer('garbage=4,compress=yes')` rebuilds the PDF from scratch (not incremental)
6. Auto-verify: re-open the result, extract all text, confirm zero matches for redacted terms

## Build & run

```bash
cd app
npm install
npm run dev       # http://localhost:3000
npm run build     # production build → dist/
npm run verify    # golden-fixture gate (MuPDF + raw bytes)
```

## Test

- **Unit-like:** `npm run verify` — 5 fixtures, checks text extraction, raw bytes, metadata, render
- **E2E:** `node scripts/e2e-smoke.mjs` — Playwright: upload → search SSN → Apply → Verified

## License

AGPL-3.0. See [LICENSE](./LICENSE).

## Privacy

See [plainfile.io/privacy](https://plainfile.io/privacy). In short: we don't see your files. Optional Google Analytics only with explicit cookie consent.

---

*Built with quiet confidence.*
