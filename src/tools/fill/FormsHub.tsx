import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { FORMS } from "./forms";
import { Link } from "react-router";
import { FileText, ArrowRight } from "lucide-react";
import type { FAQItem } from "@/lib/faq";

const FAQ: FAQItem[] = [
  {
    question: "Does filling a form here file it with the agency?",
    answer:
      "No. Nothing is transmitted anywhere. You complete the PDF and download it, then send it the way that form requires — a W-9 goes back to the business paying you, an I-9 and a W-4 go to your employer, passport forms and the Schengen application go to the agency or consulate.",
  },
  {
    question: "Are these the official forms, and which version?",
    answer:
      "Each form page carries an “Official source” block with the version we host — for example the IRS revision of March 2024 for the W-9 — the date we last verified it, and a link to the agency's own copy. Tax and immigration forms get revised, so if the official source shows a newer revision, use that one.",
  },
  {
    question: "Why fill them in the browser instead of the agency's website?",
    answer:
      "Plenty of official PDFs are not fillable in a browser, or are built for printing and handwriting. And third-party “fill online” sites are the worst option for exactly these documents: a W-9 contains a name, an address and a tax identification number, and an I-9 adds passport or licence data.",
  },
  {
    question: "Does my filled form get uploaded?",
    answer:
      "No. The PDF is parsed and rewritten by WebAssembly inside a Web Worker on your own device. There is no file-processing backend, no account, and the tool keeps working with the network disconnected.",
  },
  {
    question: "Can I fill a form that is not in this catalog?",
    answer:
      "Yes — open the PDF form filler and drop in any PDF. It detects AcroForm fields automatically, and for flat or scanned documents you can place text boxes and a signature anywhere on the page.",
  },
  {
    question: "What if the form is a scan or has no fields?",
    answer:
      "You fill it by placing text boxes over the printed lines. There is no OCR here, so nothing is detected automatically — you position each entry, which is slower but predictable, and the result is flattened into the page.",
  },
];

export default function FormsHub() {
  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PlainFile PDF Form Filler",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (browser)",
    url: "https://plainfile.io/forms",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Fill government and PDF forms in your browser. Your data never leaves your device.",
    featureList:
      "Government form catalog, AcroForm field detection, in-browser PDF filling, metadata sanitization, no upload",
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

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Fillable government forms",
    itemListElement: FORMS.map((form, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: form.label,
      url: `https://plainfile.io${form.path}`,
    })),
  };

  return (
    <Layout>
      <SEO
        title="Fill Government Forms Online — Free, No Upload, No Sign Up"
        description="Browse and fill government forms online for free. W-9, I-9, DS-11, DS-82, W-4, Schengen visa and more — no sign-up, no upload."
        path="/forms"
        ogImage="/og/forms.png"
        jsonLd={[softwareApplicationLd, faqLd, itemListLd]}
      />

      <h1 className="mb-4 text-3xl font-bold tracking-tight">
        Fill government forms online
      </h1>
      <p className="mb-8 text-muted-foreground">
        Pick a form from the catalog and fill it in your browser. Your data never leaves your device.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FORMS.map((form) => (
          <Link
            key={form.id}
            to={form.path}
            className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <FileText className="h-8 w-8 text-[#0066CC]" />
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
              {form.label}
            </h3>
            <p className="text-sm text-muted-foreground">{form.description}</p>
          </Link>
        ))}
      </div>

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Which form do you actually need?
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full max-w-4xl border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 pr-4 font-semibold">Form</th>
                <th className="py-3 pr-4 font-semibold">What it is</th>
                <th className="py-3 font-semibold">Where it goes</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">W-9</td>
                <td className="py-3">
                  Your legal name and tax identification number, so a payer can report what they paid
                  you.
                </td>
                <td className="py-3">Back to the business paying you — not to the IRS.</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">I-9</td>
                <td className="py-3">
                  Employment eligibility verification: your identity and work authorisation.
                </td>
                <td className="py-3">
                  Your employer. Section 1 is yours, Section 2 is theirs, within three business days of
                  your first day.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">W-4</td>
                <td className="py-3">How much federal income tax your employer withholds.</td>
                <td className="py-3">Your employer's payroll.</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">DS-11</td>
                <td className="py-3">
                  A new passport: first application, a minor's, or a replacement.
                </td>
                <td className="py-3">
                  Submitted in person at an acceptance facility — this one cannot be mailed.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">DS-82</td>
                <td className="py-3">
                  Renewal by mail, when you meet the eligibility rules (age, issue date, condition).
                </td>
                <td className="py-3">Mailed to the address on the form.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-foreground">Schengen visa</td>
                <td className="py-3">
                  The harmonised short-stay visa application used across the Schengen states.
                </td>
                <td className="py-3">
                  The consulate of the country where you will spend the most days — or of first entry if
                  they are equal.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          The awkward part is not the form — it is the file
        </h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p>
            Filling a form is mechanical. What makes these documents different is what they carry: a tax
            identification number, a passport number, a date of birth, a home address. Then the file
            travels — to a landlord, a recruiter, an accountant, a consulate — and often further than
            you expected.
          </p>
          <p>
            That is the whole reason this catalog exists in a browser tab rather than on a server.
            Filling happens locally, the completed PDF is flattened so it renders the same everywhere,
            and the document's own metadata is cleared before you save it.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">What we do and do not do</h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ul>
            <li>
              <strong>We do</strong> host the official template, detect its fillable fields, let you
              type and sign, flatten the result, clear the document metadata, and hand you the file.
            </li>
            <li>
              <strong>We do not</strong> file, submit, transmit or store anything, and we never ask for
              an account or an email address. There is no file-processing backend that could keep a
              copy even if we wanted to.
            </li>
          </ul>
          <p>
            Each form page also states the revision we host and the date we last checked it against the
            agency's copy. If the agency has published a newer revision, use theirs — we would rather
            you leave than file last year's form.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          Three mistakes worth avoiding
        </h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ol>
            <li>
              <strong>Filling an outdated revision.</strong> Tax forms change: the current W-9 added
              line 3b for flow-through entities. Check the revision before you send it, especially if
              you saved a copy last year.
            </li>
            <li>
              <strong>Using the wrong form.</strong> A W-9 tells a payer who you are; it is not a tax
              return, and it never goes to the IRS. Mailing it to the wrong place is the fastest way to
              delay a payment.
            </li>
            <li>
              <strong>Uploading the blank form to a random website.</strong> If the service wants an
              account to "save your progress", the document with your identification number is now on
              someone else's disk. Fill it where the file stays with you.
            </li>
          </ol>
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

      <section className="mt-10 space-y-2 border-t pt-10 text-sm text-muted-foreground">
        <p>
          Different PDF, not in the catalog?{" "}
          <Link to="/pdf/fill" className="text-[#0066CC] underline">
            Fill any PDF form
          </Link>{" "}
          — the same local processing, your own file.
        </p>
        <p>
          Sending a completed form onwards and some fields should not travel with it?{" "}
          <Link to="/pdf/redact" className="text-[#0066CC] underline">
            Redact the PDF first
          </Link>{" "}
          — deleting the content rather than covering it up.
        </p>
        <p>
          Filled a W-9 and wondering who can read it later?{" "}
          <Link to="/guides/why-black-marker-redaction-fails" className="text-[#0066CC] underline">
            Black boxes do not remove anything
          </Link>
          .
        </p>
      </section>
    </Layout>
  );
}
