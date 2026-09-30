import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router";
import { ExifTool } from "./ExifTool";
import type { FAQItem } from "@/lib/faq";

const FAQ: FAQItem[] = [
  {
    question: "Does removing metadata reduce image quality?",
    answer:
      "No. PlainFile rewrites only the metadata blocks inside the file; the compressed image data is copied byte-for-byte. There is no re-compression, so a 12 MP photo stays a 12 MP photo with identical pixels.",
  },
  {
    question: "Can I remove the location but keep my camera settings?",
    answer:
      "Yes. Two of the three modes are selective: \"Remove location only\" clears GPS coordinates and keeps everything else, while \"Remove identity, keep camera settings\" strips GPS, timestamps, software and serial numbers but keeps shutter speed, ISO and focal length — useful for portfolios and photo communities.",
  },
  {
    question: "I removed GPS with another tool and it still shows. Why?",
    answer:
      "Most cameras and phone editors store a small preview image inside the metadata. That embedded thumbnail carries its own copy of the tags, so clearing only the main EXIF block leaves the coordinates readable. PlainFile's \"Remove everything\" mode clears the metadata and the embedded thumbnail together.",
  },
  {
    question: "Does it work with HEIC photos from an iPhone?",
    answer:
      "HEIC can be read here, but it cannot be rewritten losslessly in the browser — the viewer will tell you so. Convert the photos to JPG instead: conversion drops all metadata, location included.",
  },
  {
    question: "Are my photos uploaded anywhere?",
    answer:
      "No. The files are read into browser memory and processed by a Web Worker on your device. There is no server-side component to upload to, and after the first load the tool works offline.",
  },
  {
    question: "Is there a limit, and does it handle batches?",
    answer:
      "Files up to 50 MB each, no account, no daily limit and no watermark. Select several photos at once and the cleaned results come back as a single ZIP download.",
  },
];

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

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <Layout>
      <SEO
        title="Remove EXIF Metadata — Free, In Your Browser"
        description="Strip EXIF, GPS coordinates and hidden metadata from your photos — losslessly, without uploading. JPEG, PNG and WebP supported."
        path="/exif/remove"
        jsonLd={[softwareApplicationLd, faqLd]}
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Remove EXIF Metadata</h1>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Every photo you take carries hidden metadata: camera model, timestamps, software — and often
        your exact GPS location. Strip it permanently, right here. Your files never leave your device.
      </p>

      <ExifTool accent="remove" />

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">What is actually inside a photo file</h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p>
            A JPEG is not just pixels. The format allows "metadata blocks" next to the image data, and
            cameras fill them in automatically:
          </p>
          <ul>
            <li>
              <strong>Camera and lens</strong> — make, model, lens model, and on many bodies a
              <em> serial number</em> that is unique to your device.
            </li>
            <li>
              <strong>Exposure settings</strong> — shutter speed, aperture, ISO, focal length, flash
              fired or not.
            </li>
            <li>
              <strong>Time</strong> — capture timestamp with the UTC offset, plus separate "digitized"
              and "modified" stamps.
            </li>
            <li>
              <strong>Location</strong> — latitude and longitude to roughly a metre, altitude, GPS
              timestamp, sometimes heading and speed.
            </li>
            <li>
              <strong>Software and edit history</strong> — which app saved the file, and in some
              pipelines a record of the editing steps.
            </li>
            <li>
              <strong>An embedded thumbnail</strong> — a small preview image stored inside the
              metadata. It can outlive edits to the main picture and still show the original frame.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Three ways to strip it</h2>
        <div className="overflow-x-auto">
          <table className="w-full max-w-3xl border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 pr-4 font-semibold">Mode</th>
                <th className="py-3 font-semibold">What it does</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">Remove everything</td>
                <td className="py-3">
                  All EXIF metadata, GPS and embedded thumbnails — gone. The right choice before a
                  public post or a listing.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">Remove location only</td>
                <td className="py-3">
                  GPS coordinates removed; camera settings and timestamps stay. For travel and street
                  photography where the settings are part of the work.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-foreground">
                  Remove identity, keep camera settings
                </td>
                <td className="py-3">
                  Strips GPS, timestamps, software and serials; keeps exposure, ISO and focal length.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          What removing metadata does not fix
        </h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p>
            Clean metadata is not the same as a safe photo. Before you publish a picture, look at the
            picture itself:
          </p>
          <ul>
            <li>House numbers, street signs and shop fronts in the background.</li>
            <li>Reflections in windows and glasses; documents or mail on a desk.</li>
            <li>Uniforms, badges, name tags, luggage tags, licence plates.</li>
            <li>
              The photo's own history: the same image published elsewhere can be matched by reverse
              image search regardless of metadata.
            </li>
          </ul>
          <p>
            And remember that a platform you upload to can attach its own metadata afterwards — plain
            metadata is a property of the file you control, not of every copy that exists.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">How to check that it worked</h2>
        <ol className="prose prose-slate max-w-none space-y-2 dark:prose-invert">
          <li>Add your photos and pick a mode; the tool reports how many fields it removed.</li>
          <li>
            Open the downloaded file in the{" "}
            <Link to="/exif/viewer">EXIF viewer</Link> and compare it with the original — the fields
            you removed should be gone, and nothing else should have changed.
          </li>
          <li>
            The file size usually drops by a few kilobytes. That is the metadata leaving; the image
            data is untouched.
          </li>
        </ol>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Formats and honest limits</h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ul>
            <li>
              <strong>JPEG, PNG, WebP</strong> — metadata is rewritten inside the file; image data is
              copied unchanged. Lossless means the pixels are not re-compressed.
            </li>
            <li>
              <strong>HEIC</strong> — can be read, not rewritten losslessly in the browser. Convert
              it to <Link to="/heic/to-jpg">JPG</Link> instead; conversion drops the metadata.
            </li>
            <li>
              <strong>Scope</strong> — this operation edits the EXIF block. If a file also carries
              separate XMP or IPTC blocks, they are outside this step; check the result in the viewer.
            </li>
            <li>
              <strong>Batch</strong> — up to 50 MB per file, many files at once, results delivered as
              one ZIP. No account, no daily quota.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQ.map((item, idx) => (
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

      <section className="mt-10 space-y-2 border-t pt-10 text-sm text-muted-foreground">
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
        <p>
          Selling something online?{" "}
          <Link to="/guides/remove-metadata-before-selling" className="text-[#0066CC] underline">
            Your listing photos know where you live
          </Link>
          . Posting to social media?{" "}
          <Link to="/guides/does-instagram-remove-exif" className="text-[#0066CC] underline">
            Don't rely on Instagram to strip it
          </Link>
          . A photographer keeping camera settings?{" "}
          <Link to="/guides/remove-location-keep-camera-settings" className="text-[#0066CC] underline">
            Remove identity, keep the camera layer
          </Link>
          .
        </p>
      </section>
    </Layout>
  );
}
