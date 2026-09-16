import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { FormTool } from "@/components/FormTool";
import { Link } from "react-router";

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
      "AcroForm field detection, in-browser PDF filling, metadata sanitization, no upload",
  };

  return (
    <Layout>
      <SEO
        title="Fill PDF Forms Online — Free, No Upload, No Sign Up"
        description="Fill PDF forms right in your browser. All data stays on your device; nothing is uploaded."
        path="/pdf/fill"
        jsonLd={[softwareApplicationLd]}
      />

      <FormTool />

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Before you share your filled form
        </h2>
        <Link
          to="/pdf/redact"
          className="group flex items-start gap-4 rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-[#0066CC]/30"
        >
          <div>
            <h3 className="mb-2 text-lg font-semibold group-hover:text-[#0066CC]">
              Need to hide sensitive information before sending the filled form?
            </h3>
            <p className="text-sm text-muted-foreground">
              Redact your PDF first — permanently remove text, images and
              metadata right in your browser.
            </p>
          </div>
        </Link>
      </section>
    </Layout>
  );
}
