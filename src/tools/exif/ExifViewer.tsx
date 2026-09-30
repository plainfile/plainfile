import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Link } from "react-router";
import { ExifTool } from "./ExifTool";
import type { FAQItem } from "@/lib/faq";

const FAQ: FAQItem[] = [
  {
    question: "Does the viewer upload my photos?",
    answer:
      "No. The file is opened in browser memory and parsed by a Web Worker on your device. There is no upload step, and if you disconnect from the internet the viewer keeps working.",
  },
  {
    question: "Can I see where a photo was taken without loading the map?",
    answer:
      "Yes. GPS latitude and longitude are shown as numbers as soon as the file is read. The map is a separate, opt-in view for people who want to see the spot visually.",
  },
  {
    question: "Why is the map opt-in?",
    answer:
      "Because drawing a map means downloading map tiles from openstreetmap.org, and that request tells a third party which area you are looking at. The coordinates stay on your device until you explicitly ask for the map.",
  },
  {
    question: "Does it read HEIC photos from an iPhone?",
    answer:
      "Yes — HEIC and HEIF files can be inspected here. They cannot be rewritten losslessly in the browser, so to actually remove the metadata, convert them to JPG first; conversion drops it.",
  },
  {
    question: "Does it work for PNG and WebP as well as JPEG?",
    answer:
      "Yes. PNG and WebP can carry EXIF too, though there are usually fewer fields than in a JPEG straight from a camera. The viewer lists whatever the file actually contains.",
  },
  {
    question: "How do I know if a file hides an embedded thumbnail?",
    answer:
      "The viewer flags files that carry one. This matters because the thumbnail has its own copy of the tags and can show the original frame even after the main image was cropped.",
  },
];

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
        title="EXIF Viewer — Inspect Photo Metadata In Your Browser"
        description="View EXIF metadata, camera settings and GPS coordinates of JPEG, PNG, WebP and HEIC photos. 100% local — nothing is uploaded."
        path="/exif/viewer"
        jsonLd={[softwareApplicationLd, faqLd]}
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight">EXIF Viewer</h1>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        See exactly what your photos reveal: camera and lens, exposure settings, timestamps, software —
        and GPS coordinates with an optional map. Everything is inspected locally in your browser.
      </p>

      <ExifTool accent="viewer" />

      <section className="mt-16 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">What you can inspect</h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p>
            The viewer reads the metadata blocks inside the file and groups them the way the format
            does, so you can see not only the values but where they came from:
          </p>
          <ul>
            <li>
              <strong>Camera and lens</strong> — make, model, lens, and serial numbers on many bodies.
            </li>
            <li>
              <strong>Exposure</strong> — shutter speed, aperture, ISO, focal length, flash state.
            </li>
            <li>
              <strong>Date and time</strong> — capture timestamp with the UTC offset, plus modified and
              digitized stamps.
            </li>
            <li>
              <strong>GPS</strong> — latitude, longitude, altitude, GPS timestamp — optionally plotted
              on a map.
            </li>
            <li>
              <strong>Software and edit history</strong> — which app produced the file, and in some
              pipelines a trail of editing steps.
            </li>
            <li>
              <strong>Embedded thumbnail</strong> — a hidden preview that can outlive edits to the main
              image.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          The five fields worth checking before you post a photo
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full max-w-3xl border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 pr-4 font-semibold">Field</th>
                <th className="py-3 font-semibold">What it can reveal</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">GPS latitude / longitude</td>
                <td className="py-3">
                  Where you stood, to roughly a metre. With the map loaded, the building.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">Capture timestamp</td>
                <td className="py-3">
                  Your routine: work hours, holidays, which days you were away from home.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">Camera serial or body ID</td>
                <td className="py-3">
                  Ties separate photos to one device — including photos posted under another name.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-4 font-medium text-foreground">Software / edit history</td>
                <td className="py-3">Which app you used, and sometimes what was done to the file.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-foreground">Embedded thumbnail</td>
                <td className="py-3">
                  The original frame, still visible after the main image was cropped.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          Why a photo can look clean and still leak
        </h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ul>
            <li>
              Re-saving a file in an editor does not necessarily strip metadata — plenty of apps copy
              the original blocks through untouched.
            </li>
            <li>
              Cropping changes pixels, not the metadata around them. The coordinates usually survive.
            </li>
            <li>
              Screenshots carry almost no EXIF, but they capture whatever was on screen at the time.
            </li>
            <li>
              "Export for web" is not a promise. Some tools keep GPS, some keep everything but the
              thumbnail.
            </li>
          </ul>
          <p>
            That is why the reliable order is: inspect first, then strip. Once you know what is in the
            file, the{" "}
            <Link to="/exif/remove">EXIF remover</Link> can take out everything, or only the location,
            without touching the image itself.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t pt-10">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">No uploads, and it works offline</h2>
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p>
            The browser is the whole application: there is no file-processing backend to send anything
            to. You can verify it the same way the rest of this site is verified — open the Network tab
            while inspecting a photo and watch that no request carries the file. After the first load,
            the page works with the network disconnected.
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
          Found something you don't want to share?{" "}
          <Link to="/exif/remove" className="text-[#0066CC] underline">
            Remove the metadata
          </Link>{" "}
          — losslessly, with a before/after verification.
        </p>
        <p>
          Only the location?{" "}
          <Link to="/exif/remove-gps" className="text-[#0066CC] underline">
            Remove GPS from a photo
          </Link>{" "}
          and keep the rest of the file intact.
        </p>
        <p>
          Posting a listing?{" "}
          <Link to="/guides/remove-metadata-before-selling" className="text-[#0066CC] underline">
            What marketplace photos give away
          </Link>
          .
        </p>
      </section>
    </Layout>
  );
}
