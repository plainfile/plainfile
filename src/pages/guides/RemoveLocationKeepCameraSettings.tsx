import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

const PUBLISHED = "2026-09-29";

export default function RemoveLocationKeepCameraSettings() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Remove Location From a Photo but Keep Camera Settings",
    description:
      "Photographers and stock contributors need exposure, ISO and lens data — but not their home address. Selective EXIF removal: strip GPS, timestamps and software while keeping the camera settings that matter.",
    author: { "@type": "Organization", name: "PlainFile" },
    publisher: { "@type": "Organization", name: "PlainFile" },
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    mainEntityOfPage: "https://plainfile.io/guides/remove-location-keep-camera-settings",
  };

  return (
    <Layout>
      <SEO
        title="Remove Location From a Photo but Keep Camera Settings"
        description="Selective EXIF removal for photographers: strip GPS coordinates, timestamps and software tags while keeping exposure, ISO, focal length and lens data. Lossless, in your browser."
        path="/guides/remove-location-keep-camera-settings"
        jsonLd={[articleLd]}
      />

      <article className="mx-auto max-w-3xl">
        <header className="mb-10">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Remove Location From a Photo but Keep Camera Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            By the PlainFile team · Published September 29, 2026 · 5 min read
          </p>
        </header>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p className="lead">
            "Just remove all metadata" is the right advice for someone selling a sofa — and the
            wrong advice for a photographer. Your EXIF holds the record of how each shot was made:
            exposure, aperture, ISO, focal length, lens. Strip everything and you lose your own
            shooting notes. What you actually want to remove is the identity layer: GPS coordinates,
            exact timestamps, software trails and serial numbers.
          </p>

          <h2>What to keep and what to delete</h2>
          <p>
            <strong>Keep — the camera layer.</strong> Exposure time, aperture (F-number), ISO,
            focal length, lens model, metering and flash settings. This is your technical record:
            it lets you learn from your own shots, re-create a setup, or prove authorship.
          </p>
          <p>
            <strong>Remove — the identity layer.</strong> GPS coordinates (precise to meters),
            date and time originals, the software that edited the file, camera owner name, body and
            lens serial numbers, image unique IDs, and embedded MakerNotes and thumbnails — both of
            which can smuggle serial numbers and location data back in.
          </p>

          <h2>Why not just re-save or screenshot?</h2>
          <p>
            Re-saving through an editor usually re-encodes the image — quality loss you can measure —
            and many editors keep the very tags you wanted gone. Screenshots destroy resolution and
            color profile. The clean approach is <em>surgical</em>: open the file, delete exactly the
            identity tags from the metadata structure, and write the file back with the pixel data
            untouched. Lossless for the image, complete for the tags you chose.
          </p>

          <h2>Doing it in practice</h2>
          <ol>
            <li>Open the <Link to="/exif/remove">metadata remover</Link>.</li>
            <li>Select your photos — the whole shoot at once if you like; batch mode packs cleaned files into a ZIP.</li>
            <li>Choose <strong>"Remove identity, keep camera settings"</strong>.</li>
            <li>Download and verify: the tool re-reads every result and shows how many tags were removed and how many kept.</li>
          </ol>
          <p>
            If you only need the location gone — for example a set you shot at home that you're about
            to publish — the <Link to="/exif/remove-gps">GPS remover</Link> removes just the
            coordinates and leaves timestamps and everything else in place.
          </p>

          <h2>When this matters most</h2>
          <ul>
            <li>
              <strong>Stock and portfolio sites</strong> — most require location-free submissions, and
              serial numbers are a warranty-fraud vector.
            </li>
            <li>
              <strong>Client delivery</strong> — wedding and event clients need the images, not your
              home studio's coordinates in every frame.
            </li>
            <li>
              <strong>Photo contests and publications</strong> — many ask for EXIF to verify the shot
              is genuine, while location data would be oversharing. Keeping the camera layer and
              dropping the identity layer satisfies both.
            </li>
          </ul>

          <p>
            <Link to="/exif/remove" className="inline-flex items-center gap-1 text-[#0066CC] underline">
              Strip identity, keep your camera settings <ArrowRight className="h-4 w-4" />
            </Link>
          </p>
        </div>
      </article>
    </Layout>
  );
}
