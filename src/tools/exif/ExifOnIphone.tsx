import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router";
import { ExifTool } from "./ExifTool";

export default function ExifOnIphone() {
  return (
    <Layout>
      <SEO
        title="How to Remove Location (GPS) From Photos on iPhone"
        description="iPhone stamps every photo with your location — and iOS makes removing it far from obvious. The settings that stop future geotagging, and how to strip GPS from photos you already took."
        path="/exif/on-iphone"
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Remove EXIF Location on iPhone</h1>
      {/* content: owner */}
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Your iPhone silently attaches GPS coordinates to every photo you take. iOS can stop it for
        future shots — but the setting is buried, and it does nothing for the thousands of photos
        already in your library. Here is both halves of the fix.
      </p>

      <div className="prose prose-slate mb-8 max-w-2xl dark:prose-invert">
        <h2>Part 1 — Stop geotagging future photos</h2>
        <ol>
          <li>Open <strong>Settings → Privacy &amp; Security → Location Services</strong>.</li>
          <li>Find <strong>Camera</strong> and set it to <strong>Never</strong>.</li>
        </ol>
        <p>
          From now on, new photos carry no coordinates. (This is per-device — check it again after
          upgrading or restoring.)
        </p>

        <h2>Part 2 — Clean photos you already took</h2>
        <p>
          iOS can remove location from a single photo (Photos → open the photo → swipe up or tap ⓘ →
          <strong> Adjust → remove location</strong>), but doing that one-by-one across a library is
          not realistic — and it does not touch the other metadata: timestamps, device model,
          serial numbers.
        </p>
        <p>
          For photos you are about to share or publish, the reliable route is to strip the metadata
          from the file itself, in bulk, before it leaves your device:
        </p>
        <ol>
          <li>Transfer the photos to any computer (cable, AirDrop to your own Mac).</li>
          <li>
            Open the <Link to="/exif/remove">EXIF remover</Link> below — it runs entirely in the
            browser, so even on a borrowed computer your photos are never uploaded.
          </li>
          <li>Select all the photos at once; batch mode cleans the whole set and packs the results into a ZIP.</li>
          <li>Choose <strong>Remove location only</strong> to keep your camera settings, or <strong>Remove everything</strong> before posting publicly.</li>
        </ol>
      </div>

      <ExifTool accent="gps" />

      <section className="mt-10 space-y-2 text-sm text-muted-foreground">
        <p>
          On the go without a computer?{" "}
          <Link to="/exif/viewer" className="text-[#0066CC] underline">
            Check what a photo reveals
          </Link>{" "}
          first — any device with a browser works.
        </p>
        <p>
          Shooting in HEIC? The remover reads HEIC but cannot rewrite it losslessly —{" "}
          <Link to="/heic/to-jpg" className="text-[#0066CC] underline">
            convert HEIC to JPG
          </Link>{" "}
          instead, which strips all metadata.
        </p>
        <p>
          Just the location, nothing else?{" "}
          <Link to="/exif/remove-gps" className="text-[#0066CC] underline">
            The GPS-focused remover
          </Link>
          .
        </p>
      </section>
    </Layout>
  );
}
