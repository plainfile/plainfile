import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";

const REPO_URL = "https://github.com/plainfile/plainfile";

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
        <h2 className="mt-8 text-xl font-semibold">How to verify this yourself</h2>
        <p>
          You do not have to take any of the above on trust — it is a ten-second check:
        </p>
        <ol>
          <li>
            Open your browser's developer tools (F12) and switch to the <strong>Network</strong> tab.
          </li>
          <li>
            Process a file: redact a PDF, convert a HEIC photo, strip metadata from an image.
          </li>
          <li>
            Watch the requests. No request carries the bytes of your file — only the page itself, its
            code and its engine are downloaded.
          </li>
        </ol>
        <p>
          The second check is even simpler: load a tool once, disconnect from the network entirely,
          and keep working. Everything needed to process your file is already in the tab. If a file
          were being sent to a server for processing, neither check would be possible.
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
          confirm that the selected terms are no longer present in the output.
        </p>
        <h2 className="mt-8 text-xl font-semibold">EXIF metadata and the optional map</h2>
        <p>
          The EXIF viewer and remover parse photo metadata locally — the file never leaves your
          device. The only exception is the optional GPS map: it loads only after you explicitly
          click "Show on map", and its tile requests go to openstreetmap.org, revealing the
          approximate region of the coordinates to that third party. No file data is ever included
          in those requests. That is also why the map is not enabled by default.
        </p>
        <h2 className="mt-8 text-xl font-semibold">Open source, so the claim is checkable</h2>
        <p>
          The code that touches your files is public under the AGPL-3.0 licence:{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            github.com/plainfile/plainfile
          </a>
          . This matters more than it sounds. "We do not store your files" is a promise any website can
          make; a repository you can read, build and self-host turns it into something you can verify
          without trusting us at all. There is no server-side component that could log or retain your
          data, and you are welcome to confirm that in the source or by running your own copy.
        </p>
      </article>
    </Layout>
  );
}
