import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router";
import { ExifTool } from "./ExifTool";

export default function ExifRemoveGps() {
  return (
    <Layout>
      <SEO
        title="Remove GPS Location From Photo — Free, No Upload"
        description="Remove GPS coordinates and geolocation data from your photos permanently. Lossless, in your browser, with before/after verification."
        path="/exif/remove-gps"
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Remove GPS From Photo</h1>
      {/* content: owner */}
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Your phone stamps every photo with exact GPS coordinates. Before sharing a picture publicly —
        a marketplace listing, a rental application, social media — remove the location while keeping
        the rest of your camera settings intact.
      </p>

      <ExifTool accent="gps" />

      <section className="mt-10 space-y-2 text-sm text-muted-foreground">
        <p>
          Prefer to remove everything?{" "}
          <Link to="/exif/remove" className="text-[#0066CC] underline">
            Strip all metadata
          </Link>{" "}
          instead.
        </p>
        <p>
          Not sure what your photo exposes?{" "}
          <Link to="/exif/viewer" className="text-[#0066CC] underline">
            Inspect it first
          </Link>
          .
        </p>
      </section>
    </Layout>
  );
}
