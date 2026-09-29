# HEIC UI/Page Implementation Recommendations (A.3 Study)

This document summarizes the patterns discovered in the existing codebase and gives concrete recommendations for implementing `HeicTool.tsx`, the HEIC scenario registry, the generic `HeicScenario` page, the hub page, and route/SEO integration.

## 1. Existing patterns to follow

### 1.1 Tool components

| File | What to copy | What to skip |
|------|--------------|--------------|
| `src/components/RedactTool.tsx` | Worker lifecycle (`createWorker`/`postMessage`/`ensureWorker`), dropzone markup, progress bar, error banner, "0 bytes uploaded" badge, `title`/`description` props | PDF-specific canvas, page navigation, presets, manual regions |
| `src/components/FormTool.tsx` | Fatal-worker handler, file size / page limits, mobile tap-targets (`min-h-11`), `initialPdf` prop pattern for scenario pages | AcroForm overlays, signature pad, pinch zoom |

Key reusable helpers:

- Worker creation pattern with `type: "module"` and a `ready` handshake.
- `postMessage` wrapper that resolves/rejects on a one-off listener.
- Dropzone: `rounded-2xl border-2 border-dashed bg-muted/30 px-6 py-16` with `FileUp` icon.
- Progress bar hidden when `progress === 0`.
- Error banner with `border-destructive/50 bg-destructive/10`.

### 1.2 Worker

`src/workers/heic.worker.ts` already exists and implements the contract from `src/lib/heic-engine.ts`:

```ts
{ id: number; op: "probe"; bytes: Uint8Array }
{ id: number; op: "convert"; bytes: Uint8Array; format: "jpeg" | "png"; quality: number }
```

The UI must mirror this request/response shape. No changes to the worker are required for the initial UI implementation.

### 1.3 Content registry pattern

Existing registries:

- `src/lib/scenarios.ts` — redaction scenarios with `ScenarioConfig`.
- `src/lib/forms.ts` — form configs with `FormConfig`.

Both contain: `id`, `path`, `label`, `title`, `description`, `pageTitle`, `pageDescription`, `introHtml`, `steps`, `faq`, plus helpers `getByPath`/`getById`.

For HEIC, create a new registry `src/lib/heic-scenarios.ts` following the same shape, using the content from `content/heic-*.md`.

### 1.4 Scenario page pattern

`src/pages/RedactScenario.tsx` is a generic component that accepts a `ScenarioConfig` and renders:

1. SEO with JSON-LD (`SoftwareApplication`, `HowTo`, `FAQPage`).
2. The tool (`RedactTool`) with scenario-specific title/description/presets.
3. Intro / why / steps / checklist / FAQ / related sections.

Create `src/pages/HeicScenario.tsx` with the same structure but rendering `HeicTool`.

### 1.5 Routes + SEO

`src/routes-manifest.ts` is the single source of truth for routes, sitemap, and prerender. Each route item has:

```ts
{ path: string; label: string; priority: number; changefreq: string; element: ComponentType }
```

`src/components/SEO.tsx` expects `title`, `description`, `path`, optional `ogImage`, and `jsonLd?: object | object[]`.

## 2. Recommended file structure

```
app/src/
  components/
    HeicTool.tsx          # new reusable converter UI
  lib/
    heic-engine.ts        # already exists
    heic-scenarios.ts     # new content registry
  pages/
    HeicToJpg.tsx         # hub page (/heic/to-jpg)
    HeicScenario.tsx      # generic scenario wrapper
    scenarios/
      HeicWontOpenOnWindows.tsx
      HeicCantUpload.tsx
      HeicConvertOnIphone.tsx
      HeicNotSupportedInCanva.tsx
  workers/
    heic.worker.ts        # already exists
```

## 3. `HeicTool.tsx` recommendations

### 3.1 Props

```ts
export interface HeicToolProps {
  title?: string;
  description?: string;
}
```

For the first implementation, no `initialFile` prop is needed (unlike `FormTool.initialPdf`) because HEIC scenario pages do not embed starter files.

### 3.2 State shape

```ts
interface QueuedFile {
  id: string;
  file: File;
  name: string;
  status: "queued" | "probing" | "converting" | "done" | "error";
  error?: string;
  probe?: { width: number; height: number; imageCount: number };
  result?: { bytes: Uint8Array; width: number; height: number; format: HeicTargetFormat };
  progress?: number;
}
```

Use a single queue; process up to `BATCH_CONCURRENCY = 2` files in parallel to keep UI responsive while not overwhelming memory.

### 3.3 Worker protocol

Use a request `id` counter and a `Map<number, { resolve, reject }>` in the component (or a simple promise wrapper like `RedactTool`). Example:

```ts
const workerPromiseRef = useRef<Promise<Worker> | null>(null);
let requestId = 0;

function post<T extends HeicWorkerResponse>(req: Omit<HeicWorkerRequest, "id">): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const worker = await ensureWorker();
    const id = ++requestId;
    const handler = (event: MessageEvent<HeicWorkerResponse>) => {
      if (event.data.id !== id) return;
      worker.removeEventListener("message", handler);
      if (event.data.ok) resolve(event.data as T);
      else reject(new Error(event.data.error));
    };
    worker.addEventListener("message", handler);
    worker.postMessage({ ...req, id });
  });
}
```

### 3.4 Conversion settings

```ts
const [format, setFormat] = useState<HeicTargetFormat>("jpeg");
const [quality, setQuality] = useState<number>(0.85);
```

- Slider only visible when `format === "jpeg"`.
- Quality range 0.5–1.0, step 0.05, default 0.85.

### 3.5 Batch flow

1. User drops/selects files.
2. Validate: `accept=".heic,.heif"`, max 50 MB per file, max 200 files.
3. Add to queue with `status: "queued"`.
4. `useEffect` watches queue and starts conversions when slots free.
5. For each file:
   - `probe` to get dimensions/imageCount.
   - `convert` to get `Uint8Array`.
   - Store result; generate object URL for thumbnail preview.
6. "Convert" button is disabled while queue is empty or already processing.
7. "Cancel" clears pending queue and terminates/restarts worker.

### 3.6 Downloads

- Per-file: `<a download>` with `URL.createObjectURL`.
- ZIP: lazy-import `jszip` only when "Download ZIP" is clicked. Build ZIP in the UI thread (files are already in memory). Use `jszip` from `devDependencies` — confirm it is installed or add it.

### 3.7 Privacy badge

Show the same `Badge variant="outline"` with "0 bytes uploaded" near the title, like `RedactTool`.

### 3.8 Mobile UX

- Dropzone must also work as a tap target (`<input type="file" accept=".heic,.heif" multiple>`).
- Buttons `min-h-11` on mobile.
- Thumbnails in a responsive grid.

## 4. `src/lib/heic-scenarios.ts` recommendations

Model the config after `ScenarioConfig`/`FormConfig` but omit PDF-only fields (`defaultPresets`, `checklist`, `commonMistakesHtml`).

```ts
export interface HeicScenarioConfig {
  id: string;
  path: string;
  label: string;
  title: string;
  description: string;
  pageTitle: string;
  pageDescription: string;
  introHtml: string;
  whyHtml: string;
  steps: { title: string; text: string }[];
  faq: { question: string; answer: string }[];
  related?: { label: string; path: string; description: string }[];
}
```

Populate from `content/heic-*.md`:

| Content file | Path | Notes |
|--------------|------|-------|
| `heic-to-jpg.md` | `/heic/to-jpg` | Hub. `related` points to the 4 scenarios + future EXIF viewer. |
| `heic-wont-open-on-windows.md` | `/heic/wont-open-on-windows` | No `whyHtml` special handling needed; render as "Why this happens". |
| `heic-cant-upload.md` | `/heic/cant-upload` | — |
| `heic-convert-on-iphone.md` | `/heic/convert-on-iphone` | — |
| `heic-not-supported-in-canva.md` | `/heic/not-supported-in-canva` | Add a "Other tools" cross-link block. |

Add helpers:

```ts
export const HEIC_SCENARIOS: HeicScenarioConfig[] = [...];
export function getHeicScenarioByPath(path: string): HeicScenarioConfig | undefined;
export function getHeicScenarioById(id: string): HeicScenarioConfig | undefined;
```

## 5. Page components

### 5.1 Generic `src/pages/HeicScenario.tsx`

Mirror `RedactScenario.tsx`:

1. `<SEO title={scenario.pageTitle} description={scenario.pageDescription} path={scenario.path} jsonLd={[softwareApplicationLd, howToLd, faqLd]} />`
2. `<HeicTool title={scenario.title} description={scenario.description} />`
3. `<section>` Why this happens (`whyHtml` via `dangerouslySetInnerHTML`).
4. `<section>` Step by step (render `steps` array as numbered list).
5. `<section>` FAQ (accordion/details).
6. `<section>` Related links (hub + other scenarios + `/exif/viewer` if available).

JSON-LD shapes:

```ts
const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `PlainFile ${scenario.label}`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any (browser)",
  url: `https://plainfile.io${scenario.path}`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: scenario.description,
  featureList: "HEIC to JPG/PNG conversion, batch convert, ZIP download, metadata stripped, offline-capable",
};

const howToLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: `How to ${scenario.label.toLowerCase()}`,
  description: scenario.pageDescription,
  totalTime: "PT2M",
  step: scenario.steps.map((s, idx) => ({
    "@type": "HowToStep",
    position: idx + 1,
    name: s.title,
    text: s.text,
  })),
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: scenario.faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};
```

### 5.2 Scenario wrappers (4 files)

Each file is ~8 lines, identical to `pages/scenarios/RedactBankStatement.tsx`:

```tsx
import HeicScenario from "@/pages/HeicScenario";
import { getHeicScenarioById } from "@/lib/heic-scenarios";

const scenario = getHeicScenarioById("wont-open-on-windows")!;

export default function HeicWontOpenOnWindows() {
  return <HeicScenario scenario={scenario} />;
}
```

### 5.3 Hub `src/pages/HeicToJpg.tsx`

Similar to `pages/RedactPdf.tsx`:

1. SEO with `SoftwareApplication` + `FAQPage` (use the hub's FAQ).
2. `<HeicTool />` (no title override, or use the hub's `title`/`description`).
3. Intro rendered from `introHtml`.
4. Feature list / cross-sell to EXIF viewer.
5. Related scenarios grid.
6. FAQ section.

## 6. Route integration

Add to `src/routes-manifest.ts`:

```ts
const HeicToJpg = lazy(() => import('./pages/HeicToJpg'));
const HeicScenario = lazy(() => import('./pages/HeicScenario')); // if used directly; otherwise only wrappers
const HeicWontOpenOnWindows = lazy(() => import('./pages/scenarios/HeicWontOpenOnWindows'));
const HeicCantUpload = lazy(() => import('./pages/scenarios/HeicCantUpload'));
const HeicConvertOnIphone = lazy(() => import('./pages/scenarios/HeicConvertOnIphone'));
const HeicNotSupportedInCanva = lazy(() => import('./pages/scenarios/HeicNotSupportedInCanva'));
```

Then append:

```ts
{ path: '/heic/to-jpg', label: 'HEIC to JPG', priority: 0.9, changefreq: 'weekly', element: HeicToJpg },
{ path: '/heic/wont-open-on-windows', label: 'HEIC Won\'t Open on Windows', priority: 0.8, changefreq: 'weekly', element: HeicWontOpenOnWindows },
{ path: '/heic/cant-upload', label: 'Can\'t Upload HEIC', priority: 0.8, changefreq: 'weekly', element: HeicCantUpload },
{ path: '/heic/convert-on-iphone', label: 'Convert HEIC on iPhone', priority: 0.8, changefreq: 'weekly', element: HeicConvertOnIphone },
{ path: '/heic/not-supported-in-canva', label: 'HEIC Not Supported in Canva', priority: 0.8, changefreq: 'weekly', element: HeicNotSupportedInCanva },
```

## 7. SEO / OG images

- Use `ogImage="/og/heic.png"` for hub and scenario pages.
- Generate or request an OG image at `app/public/og/heic.png`.
- If not available, fall back to `/og/default.png`.

## 8. Verification and e2e

- `verify-heic.mjs` already exists and validates the worker pipeline.
- Create `app/scripts/e2e-heic.mjs` mirroring `scripts/e2e-smoke.mjs`:
  1. Start dev server.
  2. Navigate to `/heic/to-jpg`.
  3. Upload `app/fixtures/heic/example.heic`.
  4. Wait for conversion complete state / download button enabled.
  5. Download and validate JPEG magic bytes (`0xFF 0xD8`).
  6. Assert no network requests carried file bytes.

## 9. Implementation order

1. `src/lib/heic-scenarios.ts` (content registry).
2. `src/components/HeicTool.tsx` (single-file conversion first, then batch/ZIP).
3. `src/pages/HeicScenario.tsx` + 4 scenario wrappers.
4. `src/pages/HeicToJpg.tsx` hub.
5. `src/routes-manifest.ts` updates.
6. `app/scripts/e2e-heic.mjs`.
7. Run `npm run lint && npm run build && npm run prerender && npm run verify:heic && node scripts/e2e-heic.mjs`.

## 10. Open questions for the captain / next task

- Should `HeicTool` support drag-and-drop of a whole folder, or only multi-file select for the first iteration?
- Is `jszip` already a dependency? If not, add it to `dependencies`.
- Should the hub page show a "metadata removed on convert" callout as a feature, or keep it as a small badge?
- Do we need OG images generated before launch, or use `/og/default.png` temporarily?
