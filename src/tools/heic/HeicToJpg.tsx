import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { HeicTool } from "./HeicTool";
import { HEIC_SCENARIOS, getHeicScenarioById } from "./scenarios";
import { Link } from "react-router";
import { ArrowRight, ImageIcon } from "lucide-react";

export default function HeicToJpg() {
  const hub = getHeicScenarioById("to-jpg")!;

  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PlainFile HEIC Converter",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (browser)",
    url: "https://plainfile.io/heic/to-jpg",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: hub.description,
    featureList:
      "HEIC to JPG/PNG conversion, batch convert, ZIP download, metadata stripped, offline-capable",
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: hub.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const scenarios = HEIC_SCENARIOS.filter((s) => s.id !== "to-jpg");

  return (
    <Layout>
      <SEO
        title={hub.pageTitle}
        description={hub.pageDescription}
        path="/heic/to-jpg"
        ogImage="/og/heic.png"
        jsonLd={[softwareApplicationLd, faqLd]}
      />

      <HeicTool title={hub.title} description={hub.description} />

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          How it works
        </h2>
        <div
          className="prose prose-slate max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: hub.introHtml }}
        />
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Step by step
        </h2>
        <ol className="space-y-4">
          {hub.steps.map((step, idx) => (
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
          Popular HEIC scenarios
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((s) => (
            <Link
              key={s.id}
              to={s.path}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
            >
              <div className="mb-4 flex items-center justify-between">
                <ImageIcon className="h-8 w-8 text-[#0066CC]" />
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
                {s.label}
              </h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {hub.faq.map((item, idx) => (
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
