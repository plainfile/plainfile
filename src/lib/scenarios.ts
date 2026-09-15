import type { FAQItem } from "@/lib/faq";

export interface ScenarioStep {
  title: string;
  text: string;
}

export interface ScenarioChecklist {
  redact: string[];
  keep: string[];
}

export interface ScenarioConfig {
  id: string;
  path: string;
  label: string;
  title: string;
  description: string;
  pageTitle: string;
  pageDescription: string;
  introHtml: string;
  /** Regex presets (from PRESET_PATTERNS) pre-selected when the page opens. */
  defaultPresets?: string[];
  /** "Why this matters" — explanation of the problem, shown after the tool. */
  whyHtml: string;
  /** Step-by-step instructions, also used for HowTo schema. */
  steps: ScenarioStep[];
  /** Case-specific checklist: what to remove vs. what to leave visible. */
  checklist: ScenarioChecklist;
  /** Scenario-specific FAQ, also used for FAQPage schema. */
  faq: FAQItem[];
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: "bank-statement",
    path: "/pdf/redact-bank-statement",
    label: "Redact Bank Statement",
    title: "Redact Bank Statement PDF — Remove Account Numbers & Transactions",
    description:
      "Permanently remove account numbers, transaction details, names and addresses from bank statement PDFs. Free, in your browser, no upload.",
    pageTitle: "Redact Bank Statement PDF — Free, No Upload, No Sign Up",
    pageDescription:
      "Remove account numbers, routing numbers, transactions and balances from bank statements. True redaction in your browser — files never leave your device.",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        Bank statements contain sensitive data: account numbers, routing numbers, transaction history,
        balances and personal addresses. Use this tool to permanently delete that information from the PDF
        itself — not just cover it with black boxes.
      </p>
      <ul class="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Search &amp; redact account numbers, SSN, names and addresses</li>
        <li>Draw manual rectangles over specific transactions or balances</li>
        <li>Automatic verification confirms nothing extractable remains</li>
        <li>Files stay on your device — zero bytes uploaded</li>
      </ul>
    `,
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        Landlords, lenders, visa officers and marketplaces routinely ask for a bank statement as proof of
        income or address. But a full statement exposes far more than they need: your account and routing
        numbers, every transaction, your balance and your home address. Shared carelessly, that is enough
        for identity theft or targeted fraud.
      </p>
      <p class="mb-4 text-muted-foreground">
        The common "fixes" fail. A black marker on a printout shows through on a scan. A black rectangle
        drawn in a PDF editor sits <em>on top</em> of the text — anyone can select, copy or extract what is
        underneath. True redaction removes the content from the document structure itself, which is what
        this tool does, and then verifies that nothing extractable remains.
      </p>
      <p class="text-muted-foreground">
        Redacting for privacy before sharing is legitimate. What you must never do is alter a statement to
        misrepresent your finances — that is fraud. Delete what the recipient does not need; do not change
        what remains.
      </p>
    `,
    steps: [
      {
        title: "Drop your bank statement PDF",
        text: "Drag the file into the tool above. It loads into browser memory only — nothing is uploaded.",
      },
      {
        title: "Find sensitive data automatically",
        text: "Type your account number or name into search, or enable the SSN / card presets. Every match is highlighted on the page.",
      },
      {
        title: "Draw boxes over what search missed",
        text: "Cover transaction rows, balances or barcodes by drawing rectangles directly on the page.",
      },
      {
        title: "Apply redactions",
        text: "Confirm the permanent-removal dialog. The tool deletes the content from the PDF structure and scrubs metadata.",
      },
      {
        title: "Check the verification badge and download",
        text: "The result is re-opened and scanned: 'Verified: 0 matches remain' means the terms are gone. Download the redacted file.",
      },
    ],
    checklist: {
      redact: [
        "Account number and routing / IBAN / sort code",
        "Transaction history the recipient does not need",
        "Current and available balances (unless proof of funds is the point)",
        "Home address and phone number",
        "Employer name in payroll descriptions, if it identifies your income source unnecessarily",
        "Card numbers and merchant details",
      ],
      keep: [
        "Your name — usually the very thing being verified",
        "Bank name and statement period dates",
        "Summary totals, if the recipient asked for proof of income or funds",
        "Anything explicitly requested — redact around it, not through it",
      ],
    },
    faq: [
      {
        question: "Is it legal to redact a bank statement before sharing it?",
        answer:
          "Yes — removing information the recipient does not need (account numbers, transactions, balances) to protect your privacy is normal practice. What is illegal is altering a statement to deceive: changing amounts, dates or payees to misrepresent your finances is fraud.",
      },
      {
        question: "What does a landlord or lender actually need to see?",
        answer:
          "Usually your name, the bank's name, the statement period and either the income deposits or the summary totals. Ask what they need to verify and redact everything else — most recipients accept this, and many appreciate the care.",
      },
      {
        question: "Why not just draw black boxes in a PDF editor?",
        answer:
          "A black rectangle in most editors is an annotation layered on top of the text. The underlying text stays in the file and can be selected, copied or extracted with free tools. PlainFile applies true redaction: the content is deleted from the PDF structure, then the result is automatically re-scanned to confirm nothing remains.",
      },
      {
        question: "Can the recipient tell the statement was redacted?",
        answer:
          "Redacted areas appear as clean blank/black regions — a recipient can see that content was removed, which is normal and expected. What they cannot do is recover what was removed.",
      },
      {
        question: "My statement is a scan from a phone photo. Will search work?",
        answer:
          "Scanned statements have no text layer, so search finds nothing. Use manual rectangles to cover sensitive areas — redaction works on images too, and metadata is scrubbed either way.",
      },
    ],
  },
  {
    id: "ssn",
    path: "/pdf/redact-ssn",
    label: "Redact SSN",
    title: "Redact SSN from PDF — Free Social Security Number Removal",
    description:
      "Remove Social Security Numbers from any PDF permanently. Search by SSN pattern or draw boxes. Browser-based, no upload, no sign-up.",
    pageTitle: "Redact SSN from PDF — Free, No Upload, No Sign Up",
    pageDescription:
      "Instantly find and permanently remove Social Security Numbers from PDFs. Uses regex search and true redaction — verified after every apply.",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        Social Security Numbers appear in tax forms, loan applications, medical records and employment documents.
        This tool finds 9-digit SSN patterns automatically and removes them from the PDF structure itself.
      </p>
      <ul class="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Auto-detects SSN patterns (XXX-XX-XXXX and XXXXXXXXX)</li>
        <li>Also removes names, addresses and dates of birth if needed</li>
        <li>Verifies zero extractable matches remain after redaction</li>
        <li>Works offline after first load</li>
      </ul>
    `,
    defaultPresets: ["ssn"],
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        An SSN is the single most valuable identifier for identity thieves — combined with a name and date of
        birth it is enough to open credit lines. Yet SSNs sit inside documents that get shared all the time:
        W-9s sent to clients, loan applications forwarded to brokers, court filings, old HR paperwork.
      </p>
      <p class="mb-4 text-muted-foreground">
        The SSN preset on this page is pre-enabled: one click on "Find matches" highlights every
        XXX-XX-XXXX pattern in the document. Because a full SSN is rarely needed by the recipient, the
        common convention is to remove it entirely or leave only the last four digits for verification.
      </p>
      <p class="text-muted-foreground">
        Covering an SSN with a black box in a regular editor leaves the digits in the file — anyone can copy
        them out. True redaction deletes the digits from the PDF and then re-scans the result to prove they
        are gone.
      </p>
    `,
    steps: [
      {
        title: "Drop the PDF containing the SSN",
        text: "The file opens locally in your browser. Nothing is uploaded — the '0 bytes uploaded' badge is literal.",
      },
      {
        title: "Click 'Find matches'",
        text: "The SSN preset is already enabled on this page. Every XXX-XX-XXXX pattern in the document is highlighted.",
      },
      {
        title: "Add anything the pattern missed",
        text: "SSNs printed without dashes, split across lines, or embedded in scans need a manual rectangle — draw over them on the page.",
      },
      {
        title: "Apply redactions",
        text: "Confirm the dialog. The matched digits are deleted from the PDF structure, and metadata is scrubbed.",
      },
      {
        title: "Verify and download",
        text: "The tool re-opens the result and searches again. 'Verified: 0 matches remain' confirms no SSN pattern is extractable.",
      },
    ],
    checklist: {
      redact: [
        "Full SSN anywhere it appears — page headers and footers included",
        "Date of birth, when it travels together with the SSN",
        "Signature image, if the recipient does not need it",
        "Dependent or spouse SSNs on joint forms",
        "Old employer identification details not relevant to the recipient",
      ],
      keep: [
        "Last four digits, if the recipient uses them for verification (redact only the first five)",
        "Your name and the form's purpose — the document must still make sense",
        "Tax year, form type and anything the recipient explicitly requested",
      ],
    },
    faq: [
      {
        question: "Does the tool find SSNs printed without dashes?",
        answer:
          "The preset matches the dashed XXX-XX-XXXX format. A 9-digit run without dashes also matches generic card/phone patterns unreliably, so the dependable way is to type the exact number into the search box or draw a rectangle over it.",
      },
      {
        question: "Is it safe to leave the last four digits?",
        answer:
          "Last-four is the standard convention — banks and the SSA itself use it for verification. The common approach is to redact the first five digits and leave the last four visible. Draw a rectangle over just the first five digits to do that.",
      },
      {
        question: "What about ITINs and EINs?",
        answer:
          "ITINs follow the same XXX-XX-XXXX pattern, so the SSN preset catches them. EINs use XX-XXXXXXX — search for the exact number or draw a manual rectangle.",
      },
      {
        question: "The SSN is on every page in the header. Do I have to mark each one?",
        answer:
          "No. Search runs across the whole document, so 'Find matches' with the SSN preset marks every occurrence on every page in one pass.",
      },
      {
        question: "My document is a scan and search finds nothing. What now?",
        answer:
          "Scans have no text layer for the search to hit. Draw manual rectangles over each SSN — redaction removes image content under the region just as permanently as text.",
      },
    ],
  },
  {
    id: "medical-records",
    path: "/pdf/redact-medical-records",
    label: "Redact Medical Records",
    title: "Redact Medical Records PDF — Free HIPAA-Style Redaction",
    description:
      "Remove PHI from medical record PDFs: names, DOB, MRN, diagnoses, provider info. True redaction in browser, no upload.",
    pageTitle: "Redact Medical Records PDF — Free, No Upload, No Sign Up",
    pageDescription:
      "Permanently delete PHI from medical PDFs: patient names, dates of birth, MRNs, diagnoses and provider details. Verified, local, private.",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        Medical records contain protected health information (PHI) regulated by HIPAA.
        Sharing records for insurance, legal proceedings or second opinions requires careful redaction
        of names, dates, medical record numbers, diagnoses and provider identifiers.
      </p>
      <ul class="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Search for patient names, MRN, DOB, diagnoses, provider names</li>
        <li>Manual redaction for images, handwriting or non-searchable text</li>
        <li>Full PDF sanitization: metadata, annotations, embedded files removed</li>
        <li>Automatic verification — no hidden text remains</li>
      </ul>
    `,
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        HIPAA defines 18 identifiers that turn a medical document into protected health information: names,
        dates, medical record numbers (MRN), account and certificate numbers, email addresses, device
        identifiers and more. When records are shared — for a second opinion, an insurance appeal, litigation
        or research — the identifiers that are not needed must be removed, not just hidden.
      </p>
      <p class="mb-4 text-muted-foreground">
        Medical PDFs are hostile to casual redaction: identifiers repeat in headers and footers of every
        page, lab reports mix searchable text with scanned images, and handwriting rides on top of forms.
        Search handles the repeated typed identifiers in one pass; manual rectangles handle scans, stamps
        and handwriting.
      </p>
      <p class="text-muted-foreground">
        Because the file never leaves your device, the PHI is never exposed to a third-party server during
        redaction — a meaningful property when the whole point is limiting who sees the data.
      </p>
    `,
    steps: [
      {
        title: "Drop the medical records PDF",
        text: "Records open locally in the browser. For PHI this matters: no server ever receives the file.",
      },
      {
        title: "Search for each identifier",
        text: "Search the patient name, MRN and date of birth one by one — search runs document-wide, so repeating headers and footers are caught in one pass.",
      },
      {
        title: "Draw over scans, stamps and handwriting",
        text: "Anything without a text layer — scanned forms, physician signatures, stamps — is covered with manual rectangles.",
      },
      {
        title: "Apply redactions",
        text: "Confirm the dialog. Content is deleted from the PDF structure; metadata, annotations and embedded files are scrubbed too.",
      },
      {
        title: "Verify and download",
        text: "The result is re-opened and re-searched for every term you used. 'Verified: 0 matches remain' means nothing extractable is left.",
      },
    ],
    checklist: {
      redact: [
        "Patient name, date of birth and address",
        "Medical record number (MRN) and account numbers",
        "Social Security and insurance member IDs",
        "Provider names and facility identifiers, if the recipient does not need them",
        "Dates tied to the patient (admission, discharge, birth) when de-identifying",
        "Signatures, stamps and handwritten notes that identify anyone",
      ],
      keep: [
        "Diagnoses and treatment details that are the reason for sharing",
        "Dates of service, if the recipient needs the timeline",
        "Lab values and clinical content — redact identifiers, not the medicine",
        "Anything the insurer, attorney or physician explicitly asked to see",
      ],
    },
    faq: [
      {
        question: "Which identifiers does HIPAA require to be removed?",
        answer:
          "HIPAA's Safe Harbor list covers 18 identifiers: names, geographic detail below state level, most dates, phone and fax numbers, email addresses, SSNs, MRNs, health plan and account numbers, certificate/license numbers, vehicle and device identifiers, URLs, IP addresses, biometrics, full-face photos and any other unique identifying number. Redact whichever of these the recipient does not need.",
      },
      {
        question: "Half of my records are scanned images. Can I still redact them?",
        answer:
          "Yes. Search only hits the text layer, but manual rectangles remove whatever is underneath — text or image. Draw over identifiers in scanned pages; the pixels under the region are removed, not covered.",
      },
      {
        question: "Does using this tool make my process HIPAA-compliant?",
        answer:
          "No tool alone confers compliance — that depends on your policies and agreements. What this tool does provide is a strong technical property: the file is processed entirely on your device, so no PHI is transmitted to or stored by a third party during redaction.",
      },
      {
        question: "The patient name is in the header of all 60 pages. One pass or sixty?",
        answer:
          "One pass. Search runs across the entire document, so searching the name once marks every occurrence on every page.",
      },
      {
        question: "Does redaction also clean document metadata?",
        answer:
          "Yes. Every apply also scrubs Info/XMP metadata, annotations, embedded files, JavaScript and bookmarks, then rebuilds the file — metadata often leaks patient names even when pages look clean.",
      },
    ],
  },
  {
    id: "emails",
    path: "/pdf/redact-emails",
    label: "Redact Email Addresses",
    title: "Redact Email Addresses in PDF — Remove All Emails at Once",
    description:
      "Find and permanently remove every email address in a PDF with pattern search. True redaction in your browser, no upload, no sign-up.",
    pageTitle: "Redact Email Addresses in PDF — Free, No Upload, No Sign Up",
    pageDescription:
      "Automatically find and permanently delete all email addresses from a PDF. Regex pattern search + true redaction, verified after every apply. Files never leave your device.",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        Email addresses hide throughout documents: correspondence headers, signature blocks, CC lists,
        contact pages. This tool finds every address at once with a pattern search and removes them
        from the PDF structure itself.
      </p>
      <ul class="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Email pattern preset catches standard addresses in one pass</li>
        <li>Manual rectangles for addresses in scans, logos and signatures</li>
        <li>Metadata scrubbed — the "Author" field often leaks an email too</li>
        <li>Automatic verification re-searches the result</li>
      </ul>
    `,
    defaultPresets: ["email"],
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        Documents get shared far beyond their original audience: a contract forwarded to a new vendor,
        a report published as an attachment, meeting notes uploaded to a shared drive. Every personal
        email address inside becomes exposed — to scrapers harvesting addresses for spam and phishing,
        and to people who simply should not have a direct line to your colleagues or clients.
      </p>
      <p class="mb-4 text-muted-foreground">
        Under GDPR and similar privacy laws, email addresses are personal data. Publishing a document
        with third-party addresses inside can be a compliance issue, not just a courtesy problem —
        which is why discovery productions and public records releases redact them as a matter of
        routine.
      </p>
      <p class="text-muted-foreground">
        The email preset on this page is pre-enabled: "Find matches" highlights every address in the
        document in one pass, including the ones buried on page 40 that manual review always misses.
      </p>
    `,
    steps: [
      {
        title: "Drop the PDF",
        text: "The file opens locally in your browser — nothing is uploaded.",
      },
      {
        title: "Click 'Find matches'",
        text: "The email preset is already enabled. Every address matching the standard email pattern is highlighted across all pages.",
      },
      {
        title: "Check edge cases manually",
        text: "Obfuscated addresses ('name at company dot com'), addresses inside scanned images and signature graphics need manual rectangles.",
      },
      {
        title: "Apply redactions",
        text: "Confirm the dialog. Addresses are deleted from the PDF structure; metadata — a common email leak — is scrubbed too.",
      },
      {
        title: "Verify and download",
        text: "The result is re-opened and re-searched for the email pattern. 'Verified: 0 matches remain' confirms a clean file.",
      },
    ],
    checklist: {
      redact: [
        "Personal email addresses of employees, clients and third parties",
        "CC/BCC lists in printed correspondence",
        "Email addresses in signature blocks and letterheads",
        "Addresses in document metadata (Author, Creator fields)",
        "Mailing list addresses that expose group membership",
      ],
      keep: [
        "Your own contact email, if the recipient needs to reply",
        "Public role addresses (support@, info@) that are meant to be shared",
        "Addresses the document exists to communicate — e.g. the contact page of a brochure",
      ],
    },
    faq: [
      {
        question: "Does the pattern catch every email format?",
        answer:
          "The preset matches standard addresses (name@domain.tld), including plus-addressing and subdomains. It will not catch deliberately obfuscated forms like 'name at company dot com' — search for those manually or draw rectangles over them.",
      },
      {
        question: "The same address appears 50 times. Do I mark each one?",
        answer:
          "No. One pattern search marks every occurrence in the document, page headers and footers included.",
      },
      {
        question: "Can emails hide anywhere besides the page text?",
        answer:
          "Yes — document metadata (the Author field is often an email), annotations and embedded files. Every apply scrubs all of these layers automatically, not just the visible pages.",
      },
      {
        question: "Is redacting emails enough for GDPR compliance when publishing a document?",
        answer:
          "Emails are one category of personal data. Names, phone numbers, IDs and anything that identifies a person may also need removal — combine the email preset with searches for names and the phone/SSN presets.",
      },
      {
        question: "My PDF is a scan and search finds nothing. What now?",
        answer:
          "Scans have no text layer. Draw manual rectangles over each visible address — redaction removes the pixels under the region permanently.",
      },
    ],
  },
  {
    id: "legal-documents",
    path: "/pdf/redact-legal-documents",
    label: "Redact Legal Documents",
    title: "Redact Legal Documents & Court Filings — Rule-Compliant Redaction",
    description:
      "Redact court filings, contracts and discovery documents correctly: SSNs, account numbers, minors' names, DOBs. True redaction in your browser, no upload.",
    pageTitle: "Redact Legal Documents & Court Filings — Free, No Upload",
    pageDescription:
      "Permanently remove SSNs, financial account numbers, dates of birth and minors' names from court filings and legal PDFs. True redaction, verified, files never leave your device.",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        Court rules (like US Federal Rule 5.2) require redacting personal identifiers before filing:
        Social Security numbers, financial account numbers, dates of birth and names of minors.
        Getting this wrong can mean sanctions — or a stranger's identity theft.
      </p>
      <ul class="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Pattern presets for SSNs, cards and phones + exact-term search</li>
        <li>Manual rectangles for signatures, stamps and scanned exhibits</li>
        <li>Full sanitization: metadata, annotations and embedded files removed</li>
        <li>Automatic verification proves nothing extractable remains</li>
      </ul>
    `,
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        Legal documents are redaction-critical twice over. First, the rules: US federal courts require
        filers to limit personal identifiers — only the last four digits of SSNs and financial account
        numbers, only the year of birth, only minors' initials (Rule 5.2; state courts have similar
        rules). Second, the stakes: filings become public records, and the Manafort case showed the
        world that a black rectangle in the wrong tool is a press leak, not a redaction.
      </p>
      <p class="mb-4 text-muted-foreground">
        Discovery productions add another dimension: documents produced to opposing counsel must have
        privileged or irrelevant personal content removed in a way that survives scrutiny — opposing
        experts <em>will</em> run text extraction on your production.
      </p>
      <p class="text-muted-foreground">
        Because this tool processes everything locally, confidential client material is never
        transmitted to a third-party server during redaction — a property that matters under
        professional-responsibility duties. As always: redaction removes, it never alters. Changing
        substantive content in a legal document is a far more serious matter than failing to redact.
      </p>
    `,
    steps: [
      {
        title: "Drop the filing or exhibit PDF",
        text: "Opens locally — confidential material never leaves your device.",
      },
      {
        title: "Run pattern searches",
        text: "Enable the SSN and card presets and click 'Find matches'. Then search exact terms: DOBs, minor's names, account numbers.",
      },
      {
        title: "Apply the rule of partial redaction",
        text: "Where rules allow last-four digits, draw a rectangle over only the first digits, leaving the last four visible.",
      },
      {
        title: "Cover scans and signatures manually",
        text: "Exhibits, stamps and wet signatures have no text layer — draw rectangles over them.",
      },
      {
        title: "Apply, verify, download",
        text: "Content is deleted and the document rebuilt; the tool re-searches the output and shows 'Verified: 0 matches remain'.",
      },
    ],
    checklist: {
      redact: [
        "SSNs and taxpayer IDs — all but the last four digits (Rule 5.2)",
        "Financial account numbers — all but the last four digits",
        "Dates of birth — leave only the year",
        "Names of minors — replace with initials",
        "Home addresses in protective-order and domestic cases",
        "Privileged or confidential third-party content in discovery productions",
      ],
      keep: [
        "Last four digits where the rules permit them",
        "Case captions, docket numbers and party names (adults)",
        "Everything the court or opposing counsel is entitled to see — redact identifiers, not substance",
      ],
    },
    faq: [
      {
        question: "What exactly does Rule 5.2 require to be redacted?",
        answer:
          "For US federal court filings: Social Security and taxpayer IDs to the last four digits, financial account numbers to the last four digits, dates of birth to the year only, and minors' names to initials. State courts and other jurisdictions have their own variants — check your local rules before filing.",
      },
      {
        question: "Is redacting the same as filing under seal?",
        answer:
          "No. Redaction removes specific identifiers from a public document. Filing under seal keeps the entire document non-public and requires a motion and court approval. When in doubt about which applies, consult the court's rules or an attorney.",
      },
      {
        question: "Will opposing counsel be able to recover what I redacted?",
        answer:
          "Not from this tool's output. Content is deleted from the PDF structure, metadata and attachments are scrubbed, the file is rebuilt, and the result is automatically re-searched — the same extraction techniques an opposing expert would use.",
      },
      {
        question: "Exhibits are scans — how do I redact those?",
        answer:
          "Draw manual rectangles over the sensitive areas. Redaction removes the image content under each region permanently, no text layer needed.",
      },
      {
        question: "Does redaction hold up as 'permanent' for court purposes?",
        answer:
          "The removed content no longer exists in the output file — there is nothing to undo or recover. Keep the original in your own files; the redacted copy is what you produce or file.",
      },
    ],
  },
  {
    id: "foia",
    path: "/pdf/redact-for-foia",
    label: "Redact for FOIA",
    title: "Redact PDF for FOIA & Public Records Requests — Privacy Exemptions",
    description:
      "Prepare documents for FOIA and public records release: remove personal data under privacy exemptions. True redaction in your browser, no upload.",
    pageTitle: "Redact PDF for FOIA & Public Records — Free, No Upload",
    pageDescription:
      "Remove personal information from documents before FOIA or public records release. Pattern search, true redaction and automatic verification — entirely in your browser.",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        Whether you are releasing documents under FOIA, answering a public records request, or
        publishing records you received, personal data inside must be removed properly.
        Privacy exemptions like FOIA (b)(6) and (b)(7)(C) exist precisely for this.
      </p>
      <ul class="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Pattern presets for SSNs, emails, phones and cards</li>
        <li>Exact-term search for names, addresses and case numbers</li>
        <li>Manual rectangles for scans, stamps and handwritten notes</li>
        <li>Verification proves the release copy is clean</li>
      </ul>
    `,
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        Public records laws balance transparency against privacy. FOIA exemption (b)(6) protects
        personnel and medical files where disclosure would be a clearly unwarranted invasion of
        privacy; (b)(7)(C) does the same for law enforcement records. State sunshine laws have
        parallel provisions. Releasing a document with a home address, SSN or medical detail left in
        is not transparency — it is a privacy breach that can harm a bystander.
      </p>
      <p class="mb-4 text-muted-foreground">
        Government agencies have made this mistake at scale: the TSA published a screening manual
        with removable black boxes, and the EU published a contract with confidential figures
        surviving in the PDF bookmarks. If professionals with legal staff get it wrong, a
        requester publishing documents on a personal blog needs to be even more careful.
      </p>
      <p class="text-muted-foreground">
        Journalists and researchers also redact in the other direction: documents received through
        FOIA often contain unredacted personal data that should be removed before publication.
        The standard is the same — delete, sanitize, verify.
      </p>
    `,
    steps: [
      {
        title: "Drop the records PDF",
        text: "Opens locally in your browser — unreleased records never touch a server.",
      },
      {
        title: "Run pattern presets",
        text: "Enable SSN, email, phone and card presets and click 'Find matches' — identifiers across all pages are marked in one pass.",
      },
      {
        title: "Search names and addresses",
        text: "Search each third party's name, home address and any case or medical record numbers individually.",
      },
      {
        title: "Cover scans and handwriting",
        text: "Older records are often scans with stamps and handwritten notes — draw rectangles over anything the search cannot see.",
      },
      {
        title: "Apply, verify, release",
        text: "Content is deleted, metadata and bookmarks scrubbed, and the output re-searched. Release only after 'Verified: 0 matches remain'.",
      },
    ],
    checklist: {
      redact: [
        "Names and home addresses of private individuals (exemption b(6) / b(7)(C) territory)",
        "SSNs, dates of birth and medical details",
        "Personal phone numbers and email addresses",
        "Names of minors and victims",
        "Law enforcement techniques or informant details, where applicable",
        "Third-party data that slipped in unredacted from the agency",
      ],
      keep: [
        "Names of public officials acting in their official capacity",
        "Agency names, dates of correspondence and subject matter",
        "Everything the public has a legitimate interest in — redact privacy, not accountability",
      ],
    },
    faq: [
      {
        question: "Which FOIA exemptions cover personal privacy?",
        answer:
          "Exemption (b)(6) covers personnel, medical and similar files where disclosure would be a clearly unwarranted invasion of personal privacy. Exemption (b)(7)(C) protects personal information in law enforcement records. State public records laws have their own equivalents.",
      },
      {
        question: "I received FOIA documents with unredacted personal data. Should I re-redact before publishing?",
        answer:
          "Yes — agencies occasionally release more than they should. Removing bystanders' home addresses, SSNs and medical details before publication protects those people and reduces your own legal exposure.",
      },
      {
        question: "The records are old scans with handwritten notes. Can the tool handle them?",
        answer:
          "Search only works on text layers, so for scans you draw manual rectangles over sensitive areas. Redaction removes the image content under each region permanently.",
      },
      {
        question: "Can redaction be challenged or reversed by the recipient?",
        answer:
          "The redaction itself cannot be reversed — the content is deleted from the file, not covered. Whether a redaction was legally justified is a separate question handled through appeals, not technology.",
      },
      {
        question: "Does the tool also clean metadata before release?",
        answer:
          "Yes. Every apply scrubs Info/XMP metadata, annotations, embedded files, JavaScript and bookmarks, then rebuilds the document — metadata leaks are a classic release-day mistake.",
      },
    ],
  },
];

export function getScenarioByPath(path: string): ScenarioConfig | undefined {
  return SCENARIOS.find((s) => s.path === path);
}

export function getScenarioById(id: string): ScenarioConfig | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
