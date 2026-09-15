import { Link } from "react-router";
import { Shield, Lock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";

export default function Home() {
  return (
    <Layout>
      <SEO
        title="PlainFile — Free Private Browser Tools"
        description="Free tools that run entirely in your browser. Redact PDFs, convert images, strip metadata — no uploads, no sign-ups, no tracking. Your files never leave your device."
        path="/"
        noSuffix
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
          <Lock className="mb-4 h-8 w-8 text-[#0066CC]" />
          <h3 className="mb-2 text-lg font-semibold">True redaction</h3>
          <p className="text-sm text-muted-foreground">
            Remove text and images from PDFs permanently — not just black boxes on top.
          </p>
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
    </Layout>
  );
}
