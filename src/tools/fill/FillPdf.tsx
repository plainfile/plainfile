import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { FormTool } from "./FormTool";
import { Link } from "react-router";
import type { FAQItem } from "@/lib/faq";

const FAQ: FAQItem[] = [
  {
    question: "Is it really free, and is there a sign-up?",
    answer:
      "No account, no email, no watermark and no daily quota. Files up to 50 MB and roughly 200 pages are supported; that limit is stated up front rather than discovered halfway through.",
  },
  {
    question: "Can it fill a scanned or non-fillable PDF?",
    answer:
      "Yes. When a PDF has no form fields — a scan, a print-out, an export from an old system — you place text boxes and a signature anywhere on the page. What it does not do is recognise fields automatically: there is no OCR here, so you position the text yourself.",
  },
  {
    question: "What happens to the fields when I save?",
    answer:
      "The result is flattened: typed values become part of the page content. That means the completed form looks the same in every viewer, on every device, and cannot be casually edited afterwards.",
  },
  {
    question: "Are my filled forms uploaded anywhere?",
    answer:
      "No. The PDF is parsed by WebAssembly inside a Web Worker on your device. There is no file-processing backend, which is the point: a filled W-9 contains a name, an address and a tax identification number.",
  },
  {
    question: "Can I sign the form too?",
    answer:
      "Yes. Draw a signature with a mouse or a finger, or type it, then drag it into place and resize it. It is flattened into the file along with the rest of the content.",
  },
  {
    question: "Does it work on a phone?",
    answer:
      "It runs in a mobile browser and the layout adapts, though filling a long government form is faster on a desktop. Nothing needs to be installed either way.",
  },
];

export default function FillPdf() {
  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PlainFile PDF Form Filler",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (browser)",
    url: "https://plainfile.io/pdf/fill",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Fill PDF forms in your browser. Your data never leaves your device.",
    featureList:
      "AcroForm field detection, text overlays for flat PDFs, signature pad, flattened output, document metadata cleared, no upload",
  };

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
        title="Fill PDF Form Online Free — No Sign Up, No Upload"
        description="Fill any PDF form online for free. No sign-up, no upload — type, fill and download completed forms right in your browser."
        path="/pdf/fill"
        ogImage="/og/fill.png"
        jsonLd={[softwareApplicationLd, faqLd]}
      />

      <FormTool />

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          Fillable or flat? Two kinds of PDF forms
        </h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p>
            A PDF can hold a form in two completely different ways, and most free tools handle only the
            first one:
          </p>
          <ul>
            <li>
              <strong>Fillable forms (AcroForm)</strong> — the file contains named fields. Clicking a
              field lets you type, tick a box or pick from a list, and a viewer can save those values
              back into the document.
            </li>
            <li>
              <strong>Flat forms</strong> — a scan, a print-out, or an export from an old system where
              the lines and boxes are just ink on the page. There are no fields to click, so a filler
              that only knows about AcroForm quietly does nothing.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">What PlainFile does with each</h2>
        <div className="overflow-x-auto">
          <table className="w-full max-w-3xl border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 pr-4 font-semibold">Form type</th>
                <th className="py-3 font-semibold">How you fill it</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">Fillable PDF</td>
                <td className="py-3">
                  Text, checkbox, radio, dropdown and list fields are detected automatically. Type
                  directly on the page or work down the field list in the sidebar — both stay in sync.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-foreground">Flat PDF</td>
                <td className="py-3">
                  Place a text box anywhere on the page, and drag a signature where it belongs. You
                  position it; nothing pretends to detect fields that are not there.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="prose prose-slate mt-6 max-w-none dark:prose-invert">
          <p>
            Either way the output is flattened, and that is deliberate: a flattened form renders
            identically in every viewer and cannot be quietly altered after you send it.
          </p>
          <p>
            Saving also clears the document's own metadata — author, producer, keywords, creation and
            modification dates, and the XMP block. Templates downloaded from an agency site often carry
            editing history you never asked for; the file you send does not.
          </p>
          <p>
            Working with a standard government form? The{" "}
            <Link to="/forms">forms hub</Link> has the current official templates — W-9, I-9, DS-11,
            DS-82, W-4 and the Schengen visa application — each with a line-by-line explanation of what
            goes where.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          Why filling a tax or HR form in the browser matters
        </h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p>
            A W-9 carries a legal name, an address and a tax identification number. An I-9 adds
            passport or licence details. Uploading documents like these to a free online filler means
            trusting a stranger's retention policy — and "we delete your files after an hour" is a
            promise you cannot check.
          </p>
          <p>
            Here the file is opened by WebAssembly inside a Web Worker on your own device. There is no
            backend that could keep a copy, no account that ties the form to an email address, and the
            tool keeps working with the network disconnected. You can confirm it the same way you
            confirm everything else on this site: watch the Network tab while you fill.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Honest limitations</h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ul>
            <li>
              <strong>Dynamic XFA forms</strong> — some agencies ship forms built on the older XFA
              format. The dynamic layer is removed so the document can be filled and flattened; what
              you get back is a static PDF with your answers in place.
            </li>
            <li>
              <strong>No OCR</strong> — a scan is not converted into fields automatically. You place
              text boxes yourself, exactly where you drop them.
            </li>
            <li>
              <strong>Password-protected PDFs</strong> — remove the password first; an encrypted file
              cannot be filled or saved.
            </li>
            <li>
              <strong>Practical limits</strong> — tested up to about 50 MB and roughly 200 pages. Bigger
              files may work, but are not guaranteed.
            </li>
          </ul>
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

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Before you share your filled form
        </h2>
        <Link
          to="/pdf/redact"
          className="group flex items-start gap-4 rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
        >
          <div>
            <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
              Need to hide sensitive data before sharing?
            </h3>
            <p className="text-sm text-muted-foreground">
              Redact your PDF first — permanently remove text, images and
              metadata right in your browser.
            </p>
          </div>
        </Link>
        <p className="mt-6 text-sm text-muted-foreground">
          A completed form often travels further than intended: a landlord, a recruiter, a client
          forwards it. If some of the fields should not travel with it,{" "}
          <Link to="/pdf/redact" className="text-[#0066CC] underline">
            redact them properly
          </Link>{" "}
          — deleting the content rather than covering it up.
        </p>
      </section>
    </Layout>
  );
}
