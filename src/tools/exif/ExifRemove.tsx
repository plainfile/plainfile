import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router";
import { ExifTool } from "./ExifTool";

export default function ExifRemove() {
  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PlainFile EXIF Remover",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (web browser)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Remove EXIF, GPS and hidden metadata from JPEG, PNG and WebP photos losslessly, in your browser. No uploads.",
  };

  return (
    <Layout>
      <SEO
        title="Remove EXIF Metadata — Free, In Your Browser"
        description="Strip EXIF, GPS coordinates and hidden metadata from your photos — losslessly, without uploading. JPEG, PNG and WebP supported."
        path="/exif/remove"
        jsonLd={softwareApplicationLd}
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Remove EXIF Metadata</h1>
      {/* content: owner */}
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Every photo you take carries hidden metadata: camera model, timestamps, software — and often
        your exact GPS location. Strip it permanently, right here. Your files never leave your device.
      </p>

      <ExifTool accent="remove" />

      <section className="mt-10 space-y-2 text-sm text-muted-foreground">
        <p>
          Just checking what your photo reveals?{" "}
          <Link to="/exif/viewer" className="text-[#0066CC] underline">
            Open the EXIF viewer
          </Link>
          .
        </p>
        <p>
          iPhone (HEIC) photo?{" "}
          <Link to="/heic/to-jpg" className="text-[#0066CC] underline">
            Convert it to JPG
          </Link>{" "}
          — conversion strips all metadata.
        </p>
      </section>
    </Layout>
  );
}
