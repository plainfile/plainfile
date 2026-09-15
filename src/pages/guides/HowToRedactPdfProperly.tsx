import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { MarkerDemo } from "@/components/MarkerDemo";
import { Link } from "react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

const PUBLISHED = "2026-09-14";

export default function HowToRedactPdfProperly() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Redact a PDF Properly (and Why Black Boxes Fail)",
    description:
      "True PDF redaction means deleting content from the document structure — not drawing black boxes over it. Threat model, famous failures, sanitization checklist and verification steps.",
    author: { "@type": "Organization", name: "PlainFile" },
    publisher: { "@type": "Organization", name: "PlainFile" },
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    mainEntityOfPage: "https://plainfile.io/guides/how-to-redact-pdf-properly",
  };

  return (
    <Layout>
      <SEO
        title="How to Redact a PDF Properly — True Redaction vs Black Boxes"
        description="Most PDF 'redaction' is a black rectangle drawn over live text. Learn why that fails (Manafort, TSA, AstraZeneca), what real redaction removes, and how to verify the result."
        path="/guides/how-to-redact-pdf-properly"
        jsonLd={[articleLd]}
      />

      <article className="mx-auto max-w-3xl">
        <header className="mb-10">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            How to Redact a PDF Properly (and Why Black Boxes Fail)
          </h1>
          <p className="text-sm text-muted-foreground">
            By the PlainFile team · Published September 14, 2026 · 8 min read
          </p>
        </header>

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <p className="lead">
            Redaction means one thing: the sensitive content is <strong>gone</strong> —
            deleted from the document, unrecoverable by anyone who receives the file.
            Most of what people call "redacting a PDF" is something else entirely:
            drawing a black rectangle on top of live text. The text stays in the
            file, and getting it back takes seconds. This guide explains why the
            distinction matters, how famous leaks happened, what a proper redaction
            must remove, and how to verify the result before you hit "send".
          </p>

          <h2>Three leaks that were "redacted"</h2>
          <p>
            <strong>Manafort, 2019.</strong> Lawyers for Paul Manafort filed a court
            document with black rectangles over key paragraphs. Journalists selected
            the text, copied it, and pasted it into a text editor — revealing details
            of the Mueller investigation that were meant to stay sealed. The "redaction"
            was a drawing object floating above intact text.
          </p>
          <p>
            <strong>TSA, 2009.</strong> The US Transportation Security Administration
            published a screening manual with black boxes over sensitive procedures.
            The boxes were ordinary annotations; anyone could remove them in Acrobat
            or copy the text underneath. The manual had to be rewritten.
          </p>
          <p>
            <strong>EU–AstraZeneca contract, 2021.</strong> The European Commission
            published a vaccine contract with properly redacted page text — but the
            confidential numbers survived in the PDF's <em>bookmarks</em> (the
            navigation outline). Redacting the page body while leaving document-level
            structures intact is still a leak.
          </p>
          <p>
            One root cause connects all three: somebody hid the content instead of
            deleting it.
          </p>

          <h2>A PDF is not a picture of a page</h2>
          <p>
            The black-box mistake comes from thinking of a PDF as a photo of a
            document. It is not. A PDF is a structured container of objects, and
            sensitive data can live in any of them:
          </p>
          <ul>
            <li>
              <strong>Content streams</strong> — the drawing commands that place text
              and images on the page. This is the only layer a black rectangle
              affects, and it only covers it visually.
            </li>
            <li>
              <strong>Document metadata (Info / XMP)</strong> — author, title,
              company, editing history. Names leak here constantly.
            </li>
            <li>
              <strong>Annotations</strong> — comments, highlights, sticky notes and
              link annotations, often containing the very text you removed from the
              page.
            </li>
            <li>
              <strong>Bookmarks (outline)</strong> — section titles, as in the
              AstraZeneca case.
            </li>
            <li>
              <strong>Embedded files</strong> — a PDF can carry attachments, for
              example the original Excel spreadsheet with every unredacted figure.
            </li>
            <li>
              <strong>Form fields</strong> — hidden values in AcroForm fields.
            </li>
            <li>
              <strong>Invisible text layers</strong> — scanned documents often have an
              OCR text layer you cannot see. Covering the scan covers nothing.
            </li>
            <li>
              <strong>Incremental revisions</strong> — editors that "save" by
              appending leave old versions of objects inside the file body.
            </li>
            <li>
              <strong>Embedded fonts</strong> — font files contain copies of the
              glyphs used, including the ones you thought you deleted.
            </li>
          </ul>

          <h2>Try it yourself</h2>
          <p>
            Below is a miniature of the failure. On the left setting, the SSN is
            "redacted" the way most editors do it — a black box drawn over the text.
            Select across the box with your mouse and copy. Then switch to true
            redaction and try again.
          </p>
        </div>

        <MarkerDemo />

        <div className="prose prose-slate max-w-none dark:prose-invert">
          <h2>The attacker's checklist: how redacted files get tested</h2>
          <p>
            Anyone who receives your redacted PDF can run this playbook in minutes —
            journalists, opposing counsel and curious recipients do it routinely.
            Treat it as your own pre-send test:
          </p>
          <ol>
            <li>Select all (Ctrl/Cmd+A) and copy-paste the text into an editor.</li>
            <li>Search the document for the term you redacted.</li>
            <li>
              Run a text extractor (<code>pdftotext</code>) or OCR over the result.
            </li>
            <li>Inspect metadata with ExifTool or any PDF properties dialog.</li>
            <li>Check for embedded files and attachments.</li>
            <li>Open the bookmarks panel and the link annotations.</li>
            <li>
              Look for leftover objects from incremental saves (older revisions of
              the content).
            </li>
          </ol>
          <p>
            If any of these turns up your secret, the file was never redacted — it
            was decorated.
          </p>

          <h2>How to redact a PDF properly</h2>
          <p>
            Proper redaction is a delete-and-rebuild operation, not a drawing
            operation:
          </p>
          <ol>
            <li>
              <strong>Mark what must go.</strong> Search for exact terms (names,
              account numbers, SSNs) across the whole document — identifiers repeat
              in headers and footers — and draw regions over anything non-searchable
              like scans, stamps and signatures.
            </li>
            <li>
              <strong>Apply real redaction.</strong> The tool must remove the content
              under each region from the PDF's content streams — text, images and
              vector graphics — not paint over it.
            </li>
            <li>
              <strong>Sanitize the whole document.</strong> Metadata, annotations,
              bookmarks, embedded files, form values, JavaScript and old revisions
              all get scrubbed, and the file is rebuilt from scratch rather than
              appended to.
            </li>
            <li>
              <strong>Verify.</strong> Re-open the output and run the attacker's
              checklist above. At minimum: copy-paste everything and search for the
              redacted terms.
            </li>
          </ol>
          <p>
            This is exactly the pipeline our{" "}
            <Link to="/pdf/redact" className="text-[#0066CC] hover:underline">
              free PDF redaction tool
            </Link>{" "}
            runs in your browser: it applies true redaction with the MuPDF engine,
            scrubs every layer listed below, then automatically re-opens the result
            and searches for your terms — showing "Verified: 0 matches remain" only
            when nothing is extractable. The file never leaves your device, which
            matters when the content is sensitive enough to redact in the first
            place.
          </p>

          <h2>The sanitization checklist</h2>
          <p>
            Whatever tool you use, a complete redaction covers all of these layers:
          </p>
          <table>
            <thead>
              <tr>
                <th>Layer</th>
                <th>What must happen</th>
                <th>Failure it prevents</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Page content</td>
                <td>Text, images and vector art under each region deleted from content streams</td>
                <td>Copy-paste from under black boxes (Manafort)</td>
              </tr>
              <tr>
                <td>Metadata / XMP</td>
                <td>Author, title, producer and dates wiped</td>
                <td>Names and case details in file properties</td>
              </tr>
              <tr>
                <td>Annotations</td>
                <td>Comments, highlights, links removed</td>
                <td>Secrets sitting in sticky notes</td>
              </tr>
              <tr>
                <td>Bookmarks</td>
                <td>Outline removed or filtered</td>
                <td>Numbers leaking via section titles (AstraZeneca)</td>
              </tr>
              <tr>
                <td>Embedded files</td>
                <td>Attachments removed</td>
                <td>The unredacted spreadsheet riding inside the PDF</td>
              </tr>
              <tr>
                <td>Form fields</td>
                <td>Flattened or hidden values removed</td>
                <td>Data in invisible field values</td>
              </tr>
              <tr>
                <td>JavaScript</td>
                <td>Scripts removed</td>
                <td>Data and logic embedded in the file</td>
              </tr>
              <tr>
                <td>Revisions</td>
                <td>Full rebuild, never incremental save</td>
                <td>Old object versions in the file body</td>
              </tr>
              <tr>
                <td>Fonts</td>
                <td>Unused glyphs subsetted out</td>
                <td>Copies of deleted characters in embedded fonts</td>
              </tr>
            </tbody>
          </table>

          <h2>A note on scans and stubborn files</h2>
          <p>
            Scanned documents are a special case: the page is a photograph, and any
            "text" in it exists only as an invisible OCR layer. Search-based redaction
            misses whatever the OCR got wrong, so mark regions manually and treat the
            whole page as an image. For maximum assurance on suspicious files — odd
            encodings, broken structures, documents from untrusted sources — flatten
            the page: render it to an image and rebuild the PDF from those images.
            You lose the text layer entirely, but nothing can leak from a layer that
            no longer exists. Remember that flattening pages does not clean
            document-level metadata — that step still has to happen.
          </p>

          <h2>Redaction is not alteration</h2>
          <p>
            One legal boundary is worth stating plainly. Removing information the
            recipient has no right or need to see — account numbers, unrelated
            transactions, other people's identifiers — is legitimate privacy
            hygiene. Changing what remains so the document tells a different story
            is not redaction; it is forgery. Recipients can usually see that content
            was removed, and that is fine: a visibly redacted document says "some
            things here are private", while an altered one says nothing until it is
            examined — and then it says the worst possible thing about you.
          </p>

          <h2>Redacting for a specific situation</h2>
          <p>
            The mechanics are the same everywhere, but each document type has its own
            checklist of what to remove and what to keep:
          </p>
          <ul>
            <li>
              <Link to="/pdf/redact-bank-statement" className="text-[#0066CC] hover:underline">
                Redact a bank statement
              </Link>{" "}
              — account numbers, transactions and balances; what landlords and
              lenders actually need to see.
            </li>
            <li>
              <Link to="/pdf/redact-ssn" className="text-[#0066CC] hover:underline">
                Redact Social Security Numbers
              </Link>{" "}
              — pattern search, the last-four convention, ITINs and EINs.
            </li>
            <li>
              <Link to="/pdf/redact-medical-records" className="text-[#0066CC] hover:underline">
                Redact medical records
              </Link>{" "}
              — HIPAA's 18 identifiers, scanned pages and mixed text/image records.
            </li>
          </ul>

          <h2>The bottom line</h2>
          <p>
            Redaction is deletion. If the text can be selected, searched, extracted
            or found in metadata, bookmarks or attachments, the document is not
            redacted — no matter how black the boxes look. Mark, delete, sanitize,
            then verify like an attacker would. Only then send.
          </p>
          <p>
            Working with paper printouts too? Read{" "}
            <Link to="/guides/why-black-marker-redaction-fails" className="text-[#0066CC] hover:underline">
              why black marker redaction doesn't work
            </Link>{" "}
            — the physical version of the same failure, and the only safe way to
            redact on paper.
          </p>
        </div>

        <div className="mt-12 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-[#0066CC]" />
              <div>
                <h2 className="mb-1 text-lg font-semibold">
                  Redact a PDF right now — free, no upload
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
