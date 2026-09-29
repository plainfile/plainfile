import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { FormTool } from './FormTool';
import { getFormByPath, type FormStep } from './forms';
import { Loader2, ExternalLink, AlertTriangle } from 'lucide-react';

function parseStepsHtml(stepsHtml: string): FormStep[] {
  if (typeof document === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(stepsHtml, 'text/html');
  const items = Array.from(doc.querySelectorAll('li'));
  return items.map((li, idx) => ({
    title: `Step ${idx + 1}`,
    text: li.textContent?.trim() ?? '',
  }));
}

export default function FormScenario() {
  const location = useLocation();
  const form = getFormByPath(location.pathname);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initialPdf = useMemo(
    () => (pdfBytes && form ? { bytes: pdfBytes, fileName: `${form.id}.pdf` } : undefined),
    [pdfBytes, form],
  );

  useEffect(() => {
    if (!form) return;
    // Intentional one-time loading state; this effect only fetches the public template.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(form.embeddedPdf)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load template (${res.status})`);
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("text/html")) {
          throw new Error("Template not found (server returned HTML)");
        }
        return res.arrayBuffer().then((bytes) => ({ bytes, contentType }));
      })
      .then(({ bytes, contentType }) => {
        const magic = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 5));
        const header = new TextDecoder().decode(magic);
        console.log(
          `[FormScenario] loaded template ${form.embeddedPdf}: contentType=${contentType}, size=${bytes.byteLength}, header=${header}`,
        );
        if (!header.startsWith("%PDF-")) {
          throw new Error("Template is not a valid PDF file");
        }
        setPdfBytes(bytes);
        setLoading(false);
      })
      .catch((err) => {
        setPdfError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [form]);

  if (!form) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <h1 className="text-2xl font-bold">Form not found</h1>
          <Link to="/forms" className="text-[#0066CC] hover:underline">Browse forms</Link>
        </div>
      </Layout>
    );
  }

  const softwareApplicationLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `PlainFile ${form.label} Filler`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (browser)',
    url: `https://plainfile.io${form.path}`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: form.description,
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: form.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const howToSteps = form.steps && form.steps.length > 0 ? form.steps : parseStepsHtml(form.stepsHtml);
  const howToLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to fill ${form.label}`,
    description: form.description,
    step: howToSteps.map((step, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: step.title,
      text: step.text,
    })),
  };

  return (
    <Layout>
      <SEO
        title={form.pageTitle}
        description={form.pageDescription}
        path={form.path}
        ogImage={`/og/${form.id}.png`}
        jsonLd={[softwareApplicationLd, faqLd, howToLd]}
      />

      {/* <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{form.title}</h1>
        <p className="text-muted-foreground">{form.description}</p>
      </section> */}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading form template...
        </div>
      )}

      {pdfError && (
        <div className="mb-6 rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Template not available
          </div>
          <p className="mb-2">
            We do not have an embedded {form.label} template yet. You can still upload your own copy of the form below.
          </p>
          <a
            href={form.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#0066CC] hover:underline"
          >
            Download the official {form.label} from the source <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {(!pdfError || pdfBytes) && (
        <FormTool
          title={form.title}
          description={form.description}
          initialPdf={initialPdf}
          formId={form.id}
        />
      )}

      <section className="mt-12 border-t pt-8">
        <div className="mb-6 rounded-lg border bg-card p-4 text-sm shadow-sm">
          <p className="font-semibold">Official source</p>
          <a
            href={form.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#0066CC] hover:underline"
          >
            {form.officialSourceUrl} <ExternalLink className="h-3 w-3" />
          </a>
          <p className="mt-2 text-muted-foreground">
            Form version: {form.formVersion} · Last checked: {form.lastVerified}
          </p>
          <p className="mt-2 text-muted-foreground">
            This tool is for convenience only and is not legal or tax advice. Review the official instructions before filing.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            <Link to="/pdf/redact" className="text-[#0066CC] hover:underline">
              Need to hide sensitive data before sharing?
            </Link>{" "}
            Redact the filled PDF first — permanently remove text, images and metadata in your browser.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">About this form</h2>
        <div
          className="prose prose-slate max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: form.introHtml }}
        />
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">How to fill</h2>
        <div
          className="prose prose-slate max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: form.stepsHtml }}
        />
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Common mistakes</h2>
        <div
          className="prose prose-slate max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: form.commonMistakesHtml }}
        />
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="space-y-4">
          {form.faq.map((item, idx) => (
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
