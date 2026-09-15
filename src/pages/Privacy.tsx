import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";

export default function Privacy() {
  return (
    <Layout>
      <SEO
        title="Privacy, in Plain Terms"
        description="PlainFile has no file-processing backend. Files are parsed by WebAssembly inside your browser tab. Verify it yourself in the Network tab — or go offline and keep working."
        path="/privacy"
      />
      <article className="prose prose-slate mx-auto max-w-3xl dark:prose-invert">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Privacy</h1>
        <p className="lead">
          PlainFile is built on a simple promise: your files stay on your device.
        </p>
        <h2 className="mt-8 text-xl font-semibold">No uploads</h2>
        <p>
          All processing happens locally in your browser using WebAssembly (WASM). We never
          receive the contents of your PDFs, images, or other files. The "0 bytes uploaded" badge
          in the header is a statement of fact, not marketing.
        </p>
        <h2 className="mt-8 text-xl font-semibold">Optional analytics</h2>
        <p>
          We do not use cookies, analytics pixels, fingerprinting, or any other form of tracking
          unless you explicitly consent. If you accept cookies, we load Google Analytics to
          understand how the site is used, improve your experience, develop new features, and
          support localization. Google processes this data and may use cookies. You can decline or
          withdraw consent at any time by clearing site data for plainfile.io.
        </p>
        <h2 className="mt-8 text-xl font-semibold">True redaction</h2>
        <p>
          Our PDF redaction tool removes content from the file itself, not just draws black boxes
          over it. After applying redactions, the tool runs an automatic verification step to
          confirm that the selected terms are no longer present.
        </p>
        <h2 className="mt-8 text-xl font-semibold">Open-source philosophy</h2>
        <p>
          The tool runs entirely in your browser and the code that handles your files is available
          for inspection. There is no server-side component that could log or retain your data.
        </p>
      </article>
    </Layout>
  );
}
