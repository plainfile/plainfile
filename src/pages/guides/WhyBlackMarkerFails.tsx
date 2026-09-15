import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { MarkerDemo } from "@/components/MarkerDemo";
import { Link } from "react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

const PUBLISHED = "2026-09-14";

export default function WhyBlackMarkerFails() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Why Black Marker Redaction Doesn't Work — on Paper or in PDFs",
    description:
      "Black markers show through on scans, and black rectangles in PDF editors sit on top of live text. A breakdown of every marker-based redaction failure — and what actually works.",
    author: { "@type": "Organization", name: "PlainFile" },
    publisher: { "@type": "Organization", name: "PlainFile" },
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    mainEntityOfPage: "https://plainfile.io/guides/why-black-marker-redaction-fails",
  };

  return (
    <Layout>
      <SEO
        title="Why Black Marker Redaction Doesn't Work — Paper and PDF"
        description="Black marker on paper shows through under a scanner; black boxes in PDFs leave the text underneath fully copyable. Every marker redaction failure explained — and what to do instead."
        path="/guides/why-black-marker-redaction-fails"
        jsonLd={[articleLd]}
      />

      <article className="mx-auto max-w-3xl">
        <header className="mb-10">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Why Black Marker Redaction Doesn't Work — on Paper or in PDFs
          </h1>
          <p className="text-sm text-muted-foreground">
            By the PlainFile team · Published September 14, 2026 · 6 min read
          </p>
        </header>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p className="lead">
            The black marker is the universal symbol of redaction — and almost
            always the wrong tool for the job. On paper it fails physically; in a
            PDF it fails digitally. Here is exactly how each failure happens, why
            the "obvious fixes" don't fix anything, and what real redaction looks
            like.
          </p>

          <h2>Failure 1: marker on paper, then scan</h2>
          <p>
            The physical approach feels safe: print the document, scribble over the
            secrets with a thick black marker, scan it back. It fails in two ways.
          </p>
          <p>
            <strong>Show-through.</strong> Most markers don't fully block light.
            Flatbed scanners and phone cameras push a bright light or a long
            exposure at the page, and the text under a single marker layer can be
            recovered by boosting contrast and levels in any image editor. One
            pass of a Sharpie is rarely opaque enough; even three passes can fail
            against a determined scan.
          </p>
          <p>
            <strong>Bleed and edge gaps.</strong> People underline-sized redact:
            the marker covers the middle of the word but leaves ascenders,
            descenders or the first and last letters peeking out. Combined with
            context, partial words are often fully recoverable — and even the
            <em>length</em> of a redacted word is information.
          </p>

          <h2>Failure 2: the digital black box</h2>
          <p>
            The digital version is worse, because it fails silently and at scale.
            In most PDF editors, drawing a black rectangle adds an
            <em>annotation</em> — a separate object layered on top of the page. The
            text underneath is untouched. Anyone who receives the file can:
          </p>
          <ul>
            <li>select across the box and copy the text out (30 seconds),</li>
            <li>delete or move the rectangle itself in any PDF editor,</li>
            <li>run <code>pdftotext</code> and read everything, boxes ignored.</li>
          </ul>
          <p>
            This is not a theoretical risk. It is exactly how the Manafort filing
            was unredacted by journalists in 2019, and how the TSA's screening
            manual leaked in 2009. Both documents looked perfectly redacted.
          </p>

          <h2>Failure 3: the clever workarounds that aren't</h2>
          <p>
            <strong>White text on white background.</strong> Changing the font
            color hides text from the eye, not from the file. Selection, search
            and extraction all still find it — and it fools even fewer people than
            the black box.
          </p>
          <p>
            <strong>The highlighter tool.</strong> A "black highlight" in Word or
            Google Docs is just character formatting. It exports to PDF as live
            text with a black background — copy-paste reads straight through it.
          </p>
          <p>
            <strong>Cropping the page.</strong> Cropping in many editors only
            changes the visible viewport; the content outside the crop box stays
            in the file and can be recovered by resetting the crop.
          </p>
          <p>
            <strong>Covering with an image.</strong> Pasting a black JPEG over the
            text is the annotation problem again: one object on top of another.
            Delete the image, read the page.
          </p>
          <p>
            And one subtle failure that survives even competent digital covering:
            <strong>the width leak</strong>. A black bar reveals exactly how long the
            hidden word is. Combined with the sentence context and a dictionary,
            short redacted words — names, countries, amounts — can often be guessed
            with uncomfortable accuracy. Proper redaction tools that replace content
            with fixed-width blocks or remove it entirely leak nothing at all.
          </p>

          <h2>Try the digital failure yourself</h2>
          <p>
            This page has a working miniature of the black-box failure. Select
            across the "redacted" SSN and copy it — then switch modes to see what
            true redaction does instead.
          </p>
        </div>

        <MarkerDemo />

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <h2>Why the failures keep happening</h2>
          <p>
            Every marker method shares one mental model: redaction as
            <em>making something hard to look at</em>. But a document is not what
            it looks like — it is what it contains. A PDF carries text in content
            streams, names in metadata, titles in bookmarks, attachments in
            embedded files and old versions in incremental saves. Covering the
            visual layer addresses one container out of many. The full map of
            hiding places is in our{" "}
            <Link to="/guides/how-to-redact-pdf-properly" className="text-[#0066CC] hover:underline">
              guide to proper PDF redaction
            </Link>
            .
          </p>

          <h2>How to check a redacted document you received</h2>
          <p>
            Sometimes you are on the receiving end: a court filing, a government
            release, a contract from a counterparty. Before trusting — or
            forwarding — a "redacted" PDF, run this five-minute audit:
          </p>
          <ol>
            <li>
              <strong>Select all and copy.</strong> Ctrl/Cmd+A, paste into a text
              editor. If the redacted text appears, the file was decorated, not
              redacted.
            </li>
            <li>
              <strong>Search for the obvious terms.</strong> Names, amounts, case
              numbers that should have been removed.
            </li>
            <li>
              <strong>Open the properties dialog.</strong> Document metadata
              (author, title, company) leaks what the pages hide.
            </li>
            <li>
              <strong>Check the bookmarks panel and attachments.</strong> Section
              titles and embedded files are classic survivors — the AstraZeneca
              contract leaked its numbers through bookmarks.
            </li>
            <li>
              <strong>Try to move a black box.</strong> In any PDF editor, click a
              redaction rectangle. If it selects, moves or deletes — there is live
              content underneath.
            </li>
          </ol>
          <p>
            If the document passes all five, the sender knew what they were doing.
            If it fails any of them, handle it accordingly — and if you are the
            sender next time, you now know better.
          </p>

          <h2>What actually works</h2>
          <p>
            <strong>For digital documents:</strong> use a tool that performs true
            redaction — deleting the content under each marked region from the
            PDF's structure, scrubbing metadata, annotations, bookmarks and
            attachments, and rebuilding the file. Then verify like an attacker:
            select-all, copy, search for the redacted terms. Our{" "}
            <Link to="/pdf/redact" className="text-[#0066CC] hover:underline">
              free redaction tool
            </Link>{" "}
            does the delete-and-rebuild in your browser and runs that verification
            automatically — "Verified: 0 matches remain" means the terms are gone,
            not covered.
          </p>
          <p>
            <strong>For paper:</strong> if you must redact physically, don't mark
            — remove. Cut the section out, or cover it and photocopy the page
            (then destroy the marked original; the copy contains no hidden layer).
            Never scan a marked-up original and treat the scan as redacted.
          </p>
          <p>
            <strong>The one-sentence test:</strong> if you can get the secret back
            without asking the sender, it was never redacted.
          </p>
        </div>

        <div className="mt-12 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-[#0066CC]" />
              <div>
                <h2 className="mb-1 text-lg font-semibold">
                  Redact for real — free, no upload
                </h2>
                <p className="text-sm text-muted-foreground">
                  True redaction with automatic verification, entirely in your
                  browser. No sign-up, files never leave your device.
                </p>
              </div>
            </div>
            <Link
              to="/pdf/redact"
              className="inline-flex items-center gap-2 rounded-md bg-[#0066CC] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0052a3]"
            >
              Open the tool
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    </Layout>
  );
}
