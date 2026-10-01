import { Link } from "react-router";
import { Shield, Lock, FileText, ImageIcon, MapPin, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import type { FAQItem } from "@/lib/faq";

const REPO_URL = "https://github.com/plainfile/plainfile";

const FAQ: FAQItem[] = [
  {
    question: "Are these tools really free?",
    answer:
      "Yes — no account, no watermark, no daily quota and no paid tier waiting behind the download button. The honest limits are stated on each tool: roughly 50 MB and ~200 pages for PDFs, and no OCR, so scanned documents are redacted with manual rectangles.",
  },
  {
    question: "Do my files get uploaded to a server?",
    answer:
      "No. There is no file-processing backend at all: PDFs, photos and forms are opened in browser memory and processed by WebAssembly on your device. Nothing about the file is sent anywhere.",
  },
  {
    question: "How can I verify that instead of taking your word for it?",
    answer:
      "Open the Network tab, process a file, and watch that no request carries its bytes. Or disconnect from the internet after the page loads and keep working — the tools are cached and run offline. The code is public as well.",
  },
  {
    question: "What can I actually do on this site?",
    answer:
      "Permanently remove text, images and metadata from a PDF; fill official forms such as W-9, I-9, DS-11, DS-82, W-4 and the Schengen visa application; convert iPhone HEIC photos to JPG or PNG in batches; and inspect or strip EXIF metadata, including GPS coordinates, from photos.",
  },
  {
    question: "Does it work offline or on a phone?",
    answer:
      "Both. After the first visit the app shell and the processing engine are cached, so the tools keep working with no connection. They run in a normal mobile browser — nothing to install, which matters when the file is on your phone in the first place.",
  },
  {
    question: "Is the source code available?",
    answer:
      "Yes, under AGPL-3.0 on GitHub. That is the point of the promise above: a claim about secret-free processing is only worth something if you can read the code that does the processing.",
  },
];

export default function Home() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <Layout>
      <SEO
        title="PlainFile — Free Private Browser Tools"
        description="Free tools that run entirely in your browser. Redact PDFs, convert images, strip metadata — no uploads, no sign-ups, no tracking. Your files never leave your device."
        path="/"
        noSuffix
        jsonLd={faqLd}
      />
      <section className="flex flex-col items-center justify-center gap-6 py-16 text-center md:py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0066CC]/10">
          <Shield className="h-9 w-9 text-[#0066CC]" />
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Privacy-first tools for your files
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          All processing happens locally in your browser. Your files never leave your device.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/pdf/redact">Redact your PDF</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tools">Browse tools</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Link to="/pdf/redact">
          <Lock className="mb-4 h-8 w-8 text-[#0066CC]" />
          <h3 className="mb-2 text-lg font-semibold">True redaction</h3>
          <p className="text-sm text-muted-foreground">
            Remove text and images from PDFs permanently — not just black boxes on top.
          </p>
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Link to="/forms">
          <Files className="mb-4 h-8 w-8 text-[#0066CC]" />
          <h3 className="mb-2 text-lg font-semibold">Government Forms</h3>
          <p className="text-sm text-muted-foreground">
            Fill W-9, I-9 and other government forms with embedded templates.
          </p>
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Link to="/heic/to-jpg">
          <ImageIcon className="mb-4 h-8 w-8 text-[#0066CC]" />
          <h3 className="mb-2 text-lg font-semibold">HEIC to JPG</h3>
          <p className="text-sm text-muted-foreground">
            Convert iPhone HEIC photos to JPG or PNG locally. Batch, ZIP, metadata stripped.
          </p>
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Link to="/exif/remove">
          <MapPin className="mb-4 h-8 w-8 text-[#0066CC]" />
          <h3 className="mb-2 text-lg font-semibold">EXIF removal</h3>
          <p className="text-sm text-muted-foreground">
            See and strip hidden photo metadata — GPS location, timestamps, camera serials. Lossless.
          </p>
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <FileText className="mb-4 h-8 w-8 text-[#0066CC]" />
          <h3 className="mb-2 text-lg font-semibold">Local only</h3>
          <p className="text-sm text-muted-foreground">
            Everything runs in your browser with WebAssembly. Zero bytes are uploaded.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:col-span-2 lg:col-span-1">
          <Shield className="mb-4 h-8 w-8 text-[#0066CC]" />
          <h3 className="mb-2 text-lg font-semibold">No accounts</h3>
          <p className="text-sm text-muted-foreground">
            No sign-up required. Optional analytics with your explicit consent.
          </p>
        </div>
      </section>

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">What PlainFile is</h2>
        <div className="prose prose-slate max-w-3xl dark:prose-invert">
          <p>
            A small set of browser tools for the files people would rather not hand over: a bank
            statement with an account number, a W-9 with a tax identification number, a passport
            application, or an iPhone photo that quietly records where you were standing.
          </p>
          <p>
            The usual way to handle those files online is to upload them to somebody's server and hope
            for the best. The point of this site is that there is no "somebody's server" involved: the
            tool you are looking at <em>is</em> the software, running in the tab you already have open.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          Why "local" is the whole product, not a feature
        </h2>
        <div className="prose prose-slate max-w-3xl dark:prose-invert">
          <ul>
            <li>
              <strong>There is no upload path to forget about.</strong> No file-processing backend
              exists, so there is no retention policy to read, no "we delete after an hour" promise to
              trust, and no database to leak.
            </li>
            <li>
              <strong>It is checkable in ten seconds.</strong> Open the Network tab while you work and
              watch the requests: no file bytes leave. This is the kind of claim that should be
              verified rather than believed, and the{" "}
              <Link to="/privacy">privacy page</Link> explains exactly how.
            </li>
            <li>
              <strong>It keeps working when the network does not.</strong> After the first load the
              engine is cached, so you can disconnect and keep redacting, converting and stripping
              metadata. Convenient on a plane; useful as proof everywhere else.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">How the tools are checked</h2>
        <div className="prose prose-slate max-w-3xl dark:prose-invert">
          <p>
            A privacy claim is only as good as the engineering behind it. PDF redaction here deletes
            content from the document structure, then re-opens its own output and verifies that the
            removed terms can no longer be extracted — the "Verified: 0 matches" step is a test, not a
            badge. Document metadata, annotations, embedded files and JavaScript are cleared as part of
            the same rebuild.
          </p>
          <p>
            The source is public under AGPL-3.0 at{" "}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              github.com/plainfile/plainfile
            </a>
            . When a limit exists, it is stated on the tool page rather than discovered halfway through
            a file.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQ.map((item, idx) => (
            <details key={idx} className="group rounded-xl border bg-card p-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                {item.question}
                <span className="ml-2 transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </Layout>
  );
}
