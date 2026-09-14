import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { RedactTool } from "@/components/RedactTool";
import { REDACTION_FAQ } from "@/lib/faq";
import { Link } from "react-router";
import {
  Landmark,
  UserRound,
  Stethoscope,
  Mail,
  Scale,
  FileSearch,
  BookOpen,
} from "lucide-react";
import { SCENARIOS } from "@/lib/scenarios";

const scenarioIcons = {
  "bank-statement": Landmark,
  ssn: UserRound,
  "medical-records": Stethoscope,
  emails: Mail,
  "legal-documents": Scale,
  foia: FileSearch,
} as const;

export default function RedactPdf() {
  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "QuietKit PDF Redactor",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (browser)",
    url: "https://quietkit.io/pdf/redact",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Browser-based PDF redaction that permanently deletes text, images and metadata. No upload, no sign-up.",
    featureList:
      "True redaction (content deletion), Search & redact with regex presets, Automatic verification, Maximum-security rasterize mode, Offline-capable",
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: REDACTION_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <Layout>
      <SEO
        title="Redact PDF Online — Free, No Upload, No Sign Up"
        description="True PDF redaction in your browser: deletes text, images and metadata — then verifies nothing is extractable. Free, unlimited, files never leave your device."
        path="/pdf/redact"
        jsonLd={[softwareApplicationLd, faqLd]}
      />

      <RedactTool />

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Popular redaction scenarios
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s) => {
            const Icon = scenarioIcons[s.id as keyof typeof scenarioIcons] ?? FileSearch;
            return (
              <Link
                key={s.id}
                to={s.path}
                className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
              >
                <div className="mb-4 flex items-center justify-between">
                  <Icon className="h-8 w-8 text-[#0066CC]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
                  {s.label}
                </h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Learn
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            to="/guides/how-to-redact-pdf-properly"
            className="group flex items-start gap-4 rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
          >
            <BookOpen className="mt-1 h-8 w-8 shrink-0 text-[#0066CC]" />
            <div>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
                How to redact a PDF properly (and why black boxes fail)
              </h3>
              <p className="text-sm text-muted-foreground">
                Famous redaction leaks, the attacker's checklist for testing any
                redacted file, and the full sanitization checklist — with an
                interactive demo you can try right on the page.
              </p>
            </div>
          </Link>
          <Link
            to="/guides/why-black-marker-redaction-fails"
            className="group flex items-start gap-4 rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
          >
            <BookOpen className="mt-1 h-8 w-8 shrink-0 text-[#0066CC]" />
            <div>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
                Why black marker redaction doesn't work
              </h3>
              <p className="text-sm text-muted-foreground">
                Marker on paper shows through; black boxes in PDFs leave the text
                copyable. Every marker failure explained — and what works instead.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {REDACTION_FAQ.map((item, idx) => (
            <details
              key={idx}
              className="group rounded-xl border bg-card p-4 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                {item.question}
                <span className="ml-2 transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </Layout>
  );
}
