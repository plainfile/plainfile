import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { FORMS } from "@/lib/forms";
import { Link } from "react-router";
import { FileText, ArrowRight } from "lucide-react";

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

  return (
    <Layout>
      <SEO
        title="Fill Government Forms Online — Free, No Upload, No Sign Up"
        description="Browse and fill government forms online for free. W-9, I-9, DS-11, DS-82, W-4, Schengen visa and more — no sign-up, no upload."
        path="/forms"
        ogImage="/og/forms.png"
        jsonLd={[softwareApplicationLd]}
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
    </Layout>
  );
}
