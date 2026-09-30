import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router";
import { ExifTool } from "./ExifTool";
import type { FAQItem } from "@/lib/faq";

const FAQ: FAQItem[] = [
  {
    question: "Can I remove the GPS coordinates and keep my camera settings?",
    answer:
      "Yes — use \"Remove location only\". If you also want to hide timestamps and device serial numbers, choose \"Remove identity, keep camera settings\", which keeps shutter speed, ISO and focal length but drops everything that points back at you.",
  },
  {
    question: "Does removing the location reduce image quality?",
    answer:
      "No. Only the metadata block is rewritten; the compressed image data is copied unchanged, so there is no re-compression and no visible difference.",
  },
  {
    question: "I cropped the photo — is the location gone?",
    answer:
      "Usually not. Cropping changes the pixels but leaves the metadata in place, and the embedded thumbnail may still hold the original coordinates. Check the file in the EXIF viewer after editing, then strip the location.",
  },
  {
    question: "Does Instagram or Facebook remove the location when I post?",
    answer:
      "It strips much of the EXIF on many upload paths, but the behaviour depends on the platform, the app version and the file type — and it says nothing about what the recipient of the original file can read. Treat it as a bonus, not as protection.",
  },
  {
    question: "My photos are HEIC from an iPhone. Can I clean them here?",
    answer:
      "HEIC can be inspected but not rewritten losslessly in the browser. Convert to JPG instead — the conversion drops the metadata, location included.",
  },
];

export default function ExifRemoveGps() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to remove GPS location from a photo",
    description:
      "Strip GPS coordinates from a JPEG, PNG or WebP photo in the browser, without uploading it anywhere.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Add the photos",
        text: "Drop the files into the tool, or select them from your device. They are opened locally in the browser.",
      },
      {
        "@type": "HowToStep",
        name: "Choose what to remove",
        text: "Pick \"Remove location only\" to clear GPS, or \"Remove identity, keep camera settings\" to also drop timestamps and serial numbers.",
      },
      {
        "@type": "HowToStep",
        name: "Verify and download",
        text: "Open the result in the EXIF viewer to confirm the GPS block is gone, then save the cleaned file.",
      },
    ],
  };

  return (
    <Layout>
      <SEO
        title="Remove GPS Location From Photo — Free, No Upload"
        description="Remove GPS coordinates and geolocation data from your photos permanently. Lossless, in your browser, with before/after verification."
        path="/exif/remove-gps"
        jsonLd={[howToLd, faqLd]}
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Remove GPS From Photo</h1>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Your phone stamps every photo with exact GPS coordinates. Before sharing a picture publicly —
        a marketplace listing, a rental application, social media — remove the location while keeping
        the rest of your camera settings intact.
      </p>

      <ExifTool accent="gps" />

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">How the coordinates get into the file</h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ul>
            <li>
              <strong>Phones</strong> — the camera app asks for location access once, then attaches
              coordinates, altitude and a GPS timestamp to every shot, usually within a metre.
            </li>
            <li>
              <strong>Compact and system cameras</strong> — only models with a GPS or Bluetooth
              link to a phone write location; most do not.
            </li>
            <li>
              <strong>Scanners and screenshots</strong> — normally carry no GPS at all, even though
              they can carry other metadata.
            </li>
            <li>
              <strong>Editors and export presets</strong> — some copy the original GPS block through,
              and a few add their own software tags along the way.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          What a coordinate pair actually reveals
        </h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p>
            Coordinates are stored in decimal degrees, and the number of digits decides the precision:
            four decimals land within about 11 metres, six decimals within about 10 centimetres — and
            phone photos typically carry six or seven.
          </p>
          <p>On its own, that is already a lot. Together with the rest of the file it becomes more:</p>
          <ul>
            <li>
              <strong>Altitude</strong> narrows a location further — a flat, a specific floor of a
              building, a hilltop.
            </li>
            <li>
              <strong>GPS timestamps</strong> across several photos turn into a movement pattern: home,
              workplace, gym, the days you were away.
            </li>
            <li>
              <strong>Context</strong> finishes the job. A listing photo taken at street level in front
              of your building is an address once the coordinates are attached.
            </li>
          </ul>
          <p>
            And the reverse is true too: removing the coordinates does not make the picture anonymous
            if the photo itself shows a house number or a view people can recognise. Metadata is only
            the easiest layer to leak.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Which fields count as location</h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ul>
            <li>
              <strong>The GPS block</strong> — latitude, longitude, altitude, GPS timestamp, and on
              some devices heading and speed. A pointer in the main directory keeps it attached to the
              image.
            </li>
            <li>
              <strong>Place names in other blocks</strong> — some pipelines write city, province or
              country into separate metadata blocks. This tool edits the EXIF block, so verify the
              result in the viewer if you are working with files from unusual sources.
            </li>
            <li>
              <strong>The embedded thumbnail</strong> — it carries its own tag set and can keep the
              original coordinates even after the main image was cropped. "Remove everything" clears
              it together with the rest.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          Which mode to pick (a trustworthy default)
        </h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p>
            <strong>"Remove location only"</strong> keeps timestamps, software and serial numbers. That
            is fine when you are sending a file to someone you trust and only the place is sensitive.
          </p>
          <p>
            <strong>"Remove identity, keep camera settings"</strong> is the better default for anything
            public — a listing, a forum post, a portfolio. You keep the photographic metadata that
            matters (shutter, ISO, focal length) and lose the fields that link the file to you and to a
            time and place.
          </p>
          <p>
            Once it is cleaned, open the result in the{" "}
            <Link to="/exif/viewer">EXIF viewer</Link> and check the GPS group is actually gone — the
            tool reports how many fields it removed, and the viewer is the independent second look.
          </p>
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
        <p>
          Shooting on iPhone?{" "}
          <Link to="/exif/on-iphone" className="text-[#0066CC] underline">
            The built-in settings are far from obvious
          </Link>
          .
        </p>
      </section>
    </Layout>
  );
}
