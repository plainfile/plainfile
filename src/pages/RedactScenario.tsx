import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { RedactTool } from "@/components/RedactTool";
import type { ScenarioConfig } from "@/lib/scenarios";
import { SCENARIOS } from "@/lib/scenarios";
import { Link } from "react-router";
import { ShieldCheck, CircleCheck, CircleX, ArrowRight, BookOpen } from "lucide-react";

interface RedactScenarioProps {
  scenario: ScenarioConfig;
}

export default function RedactScenario({ scenario }: RedactScenarioProps) {
  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `QuietKit ${scenario.label}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (browser)",
    url: `https://quietkit.io${scenario.path}`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: scenario.description,
    featureList:
      "True redaction (content deletion), Search & redact with regex presets, Automatic verification, Maximum-security rasterize mode, Offline-capable",
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to ${scenario.label.toLowerCase()} in a PDF`,
    description: scenario.pageDescription,
    totalTime: "PT2M",
    tool: {
      "@type": "HowToTool",
      name: "QuietKit PDF Redactor",
    },
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
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const related = SCENARIOS.filter((s) => s.id !== scenario.id);

  return (
    <Layout>
      <SEO
        title={scenario.pageTitle}
        description={scenario.pageDescription}
        path={scenario.path}
        jsonLd={[softwareApplicationLd, howToLd, faqLd]}
      />

      <RedactTool
        title={scenario.title}
        description={scenario.description}
        defaultPresets={scenario.defaultPresets}
      />

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Why this needs true redaction
        </h2>
        <div
          className="prose prose-slate max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: scenario.whyHtml }}
        />
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Step by step
        </h2>
        <ol className="space-y-4">
          {scenario.steps.map((step, idx) => (
            <li key={idx} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0066CC]/10 text-sm font-semibold text-[#0066CC]">
                {idx + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Checklist: what to redact, what to keep
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CircleX className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Redact this</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {scenario.checklist.redact.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CircleCheck className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold">Keep this visible</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {scenario.checklist.keep.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {scenario.faq.map((item, idx) => (
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

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Related
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/pdf/redact"
            className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <ShieldCheck className="h-8 w-8 text-[#0066CC]" />
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
              Redact PDF
            </h3>
            <p className="text-sm text-muted-foreground">
              The main redaction tool: search, regex presets, manual regions and
              automatic verification for any PDF.
            </p>
          </Link>
          {related.map((s) => (
            <Link
              key={s.id}
              to={s.path}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
            >
              <div className="mb-4 flex items-center justify-between">
                <ShieldCheck className="h-8 w-8 text-[#0066CC]" />
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
                {s.label}
              </h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </Link>
          ))}
          <Link
            to="/guides/how-to-redact-pdf-properly"
            className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
          >
            <div className="mb-4 flex items-center justify-between">
              <BookOpen className="h-8 w-8 text-[#0066CC]" />
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
              Guide: how to redact a PDF properly
            </h3>
            <p className="text-sm text-muted-foreground">
              Why black boxes fail, the attacker's checklist and the full
              sanitization checklist — with an interactive demo.
            </p>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
