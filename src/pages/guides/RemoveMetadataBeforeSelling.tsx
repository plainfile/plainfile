import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

const PUBLISHED = "2026-09-29";

export default function RemoveMetadataBeforeSelling() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Remove Photo Metadata Before Selling Online — Your Listing Photo Knows Where You Live",
    description:
      "Every photo you upload to eBay, Etsy, Vinted or Facebook Marketplace can carry your GPS coordinates, home interior clues and camera serial numbers. How to strip it before you list.",
    author: { "@type": "Organization", name: "PlainFile" },
    publisher: { "@type": "Organization", name: "PlainFile" },
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    mainEntityOfPage: "https://plainfile.io/guides/remove-metadata-before-selling",
  };

  return (
    <Layout>
      <SEO
        title="Remove Photo Metadata Before Selling Online (eBay, Etsy, Marketplace)"
        description="Photos you list on eBay, Etsy, Vinted or Facebook Marketplace can leak your home address via GPS metadata. Strip EXIF before you list — free, in your browser, no upload."
        path="/guides/remove-metadata-before-selling"
        jsonLd={[articleLd]}
      />

      <article className="mx-auto max-w-3xl">
        <header className="mb-10">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Remove Photo Metadata Before Selling Online — Your Listing Photo Knows Where You Live
          </h1>
          <p className="text-sm text-muted-foreground">
            By the PlainFile team · Published September 29, 2026 · 5 min read
          </p>
        </header>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p className="lead">
            You photographed a TV, a pram, an old bike — whatever you're selling — and uploaded the
            pictures to eBay, Etsy, Vinted or Facebook Marketplace. The photo is of a thing, not of
            you. But your phone quietly attached a small dossier to it: the exact GPS coordinates
            where the photo was taken (usually your home), the time, your device model, and sometimes
            its serial number.
          </p>

          <h2>What a listing photo can reveal</h2>
          <p>
            EXIF metadata is invisible in the image itself, but trivially readable by anyone who
            downloads the original file:
          </p>
          <ul>
            <li>
              <strong>GPS coordinates</strong> — precise to a few meters. A photo of your TV was taken
              in your living room. Strangers now know where the TV — and the rest of your belongings —
              are.
            </li>
            <li>
              <strong>Date and time</strong> — reveals when you're home, and how old the photo really is.
            </li>
            <li>
              <strong>Device serial numbers</strong> — in some camera MakerNotes. Useful for warranty fraud.
            </li>
            <li>
              <strong>Camera settings</strong> — harmless on their own, but part of the fingerprint.
            </li>
          </ul>

          <h2>Do marketplaces strip it for you?</h2>
          <p>
            Some platforms re-compress photos, which often drops metadata as a side effect — but this
            is incidental, not guaranteed, and policies change. "Often removed" is not a privacy
            strategy: the only safe assumption is that anything you upload can carry your location
            unless you removed it yourself, from the file, before uploading. And if you ever send an
            original file — a buyer asking for "the unedited photo", a higher-resolution version, an
            email attachment — every tag ships with it.
          </p>

          <h2>How to strip metadata before you list</h2>
          <p>
            Use a tool that <em>removes</em> the metadata rather than re-encoding the image (which
            degrades quality) or drawing over it. With PlainFile's remover:
          </p>
          <ol>
            <li>Open the <Link to="/exif/remove">EXIF remover</Link>.</li>
            <li>Select the photos for your listing — batch mode handles a whole shoot at once and packs the results into a ZIP.</li>
            <li>Choose <strong>Remove everything</strong> — for listing photos there is no reason to keep any of it.</li>
            <li>Download the cleaned files and upload <em>those</em> to the marketplace.</li>
          </ol>
          <p>
            The removal is lossless for JPEG, PNG and WebP: the pixels are untouched, only the
            metadata segments go. The tool re-reads every cleaned file and shows a before/after count
            of what was removed — and your photos never leave your device at any point.
          </p>

          <h2>One habit that closes the loop</h2>
          <p>
            Make it a rule: <strong>no photo leaves your phone to a stranger before passing through
            the remover.</strong> Thirty seconds per listing, and the only thing a buyer learns from
            your photo is what you're selling — not where you live.
          </p>

          <p>
            <Link to="/exif/remove" className="inline-flex items-center gap-1 text-[#0066CC] underline">
              Strip metadata from your listing photos <ArrowRight className="h-4 w-4" />
            </Link>
          </p>
          <p>
            Want to see what your photos currently reveal?{" "}
            <Link to="/exif/viewer" className="text-[#0066CC] underline">
              Inspect them in the EXIF viewer
            </Link>{" "}
            first.
          </p>
        </div>
      </article>
    </Layout>
  );
}
