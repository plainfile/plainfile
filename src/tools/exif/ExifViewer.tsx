import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router";
import { ExifTool } from "./ExifTool";

export default function ExifViewer() {
  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PlainFile EXIF Viewer",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (web browser)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Inspect EXIF metadata, camera settings and GPS coordinates of your photos in your browser. Nothing is uploaded.",
  };

  return (
    <Layout>
      <SEO
        title="EXIF Viewer — Inspect Photo Metadata In Your Browser"
        description="View EXIF metadata, camera settings and GPS coordinates of JPEG, PNG, WebP and HEIC photos. 100% local — nothing is uploaded."
        path="/exif/viewer"
        jsonLd={softwareApplicationLd}
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight">EXIF Viewer</h1>
      {/* content: owner */}
      <p className="mb-6 max-w-2xl text-muted-foreground">
        See exactly what your photos reveal: camera and lens, exposure settings, timestamps, software —
        and GPS coordinates with an optional map. Everything is inspected locally in your browser.
      </p>

      <ExifTool accent="viewer" />

      <section className="mt-10 space-y-2 text-sm text-muted-foreground">
        <p>
          Found something you don't want to share?{" "}
          <Link to="/exif/remove" className="text-[#0066CC] underline">
            Remove the metadata
          </Link>{" "}
          — losslessly, with a before/after verification.
        </p>
      </section>
    </Layout>
  );
}
