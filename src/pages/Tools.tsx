import { Link } from "react-router";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { TOOL_ROUTES } from "@/routes-manifest";
import type { FAQItem } from "@/lib/faq";

// Каталог инструментов генерируется из routes-manifest.
// Не добавляйте инструменты вручную — добавьте запись kind: 'tool' в манифест.

const REPO_URL = "https://github.com/plainfile/plainfile";

const FAQ: FAQItem[] = [
  {
    question: "Which tool do I need?",
    answer:
      "If the document must no longer contain the information, that is PDF redaction. If you need to type into an official form, start from the forms catalog — W-9, I-9, DS-11, DS-82, W-4 and the Schengen application have their templates built in. If a website rejected your iPhone photo, use the HEIC converter. If you want to know what a photo reveals, or remove it, use the EXIF tools.",
  },
  {
    question: "Are there file size or page limits?",
    answer:
      "PDF tools are tested up to roughly 50 MB and ~200 pages; photo tools accept files up to 50 MB each. Larger files may still work but are not guaranteed, and the limit is stated before you start rather than after.",
  },
  {
    question: "Do the tools work offline?",
    answer:
      "Yes. After the first visit the app shell and the processing engine are cached, so you can disconnect from the network and keep working. Nothing in the tool chain needs a server.",
  },
  {
    question: "Can I process several files at once?",
    answer:
      "The HEIC converter and the EXIF tools handle batches and return a single ZIP. PDF redaction and form filling work on one document at a time, because both are interactive — you mark or fill a specific document.",
  },
];

export default function Tools() {
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
        title="All Tools"
        description="Every PlainFile tool runs 100% in your browser: PDF redaction, HEIC conversion, form filling. Free, no account, private by design."
        path="/tools"
        jsonLd={faqLd}
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Tools</h1>
      <p className="mb-8 max-w-2xl text-muted-foreground">
        Every tool here runs inside your browser tab. Pick one — there is nothing to install and
        nothing to sign up for.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOL_ROUTES.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.path}
              to={tool.path}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
            >
              <div className="mb-4 flex items-center justify-between">
                {Icon && <Icon className="h-8 w-8 text-[#0066CC]" />}
                {tool.status && <Badge variant="secondary">{tool.status}</Badge>}
              </div>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">{tool.label}</h3>
              {tool.description && (
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              )}
            </Link>
          );
        })}
      </div>

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">How these tools work</h2>
        <div className="prose prose-slate max-w-3xl dark:prose-invert">
          <p>
            Each tool loads its engine — MuPDF, libheif, an EXIF parser, a PDF form engine, all compiled
            to WebAssembly — into your browser, and does the work in a Web Worker so the page stays
            responsive. Your file is read from memory, transformed, and handed back as a download.
          </p>
          <p>
            There is no file-processing backend, which is the design decision everything else follows
            from: no account, no upload queue, no retention policy. The{" "}
            <Link to="/privacy">privacy page</Link> explains how to verify it yourself in the Network
            tab, and the source is public under AGPL-3.0 at{" "}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              github.com/plainfile/plainfile
            </a>
            .
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Honest limits</h2>
        <div className="prose prose-slate max-w-3xl dark:prose-invert">
          <ul>
            <li>
              <strong>No OCR.</strong> A scanned page has no text layer and no form fields, so nothing
              can be detected automatically — you mark or place entries yourself, exactly where they
              belong.
            </li>
            <li>
              <strong>HEIC metadata is read-only.</strong> HEIC files can be inspected here, but not
              rewritten losslessly in the browser. Converting to JPG drops the metadata, which is
              usually what you wanted anyway.
            </li>
            <li>
              <strong>Dynamic XFA forms are flattened.</strong> When a form is built on the older XFA
              format, the dynamic layer is removed so the document can be filled and saved as a static
              PDF.
            </li>
            <li>
              <strong>Encrypted PDFs must be unlocked first.</strong> A password-protected file cannot
              be filled, redacted or inspected.
            </li>
          </ul>
          <p>
            Working on something sensitive? The guides walk through the cases people actually run into
            —{" "}
            <Link to="/guides/how-to-redact-pdf-properly">redacting a PDF properly</Link>,{" "}
            <Link to="/guides/remove-metadata-before-selling">photo metadata before selling online</Link>
            , or <Link to="/guides/does-instagram-remove-exif">what social platforms really strip</Link>
            .
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
