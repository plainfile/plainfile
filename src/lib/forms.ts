export interface FormStep {
  title: string;
  text: string;
}

export interface FormFAQItem {
  question: string;
  answer: string;
}

export interface FormConfig {
  id: string;
  path: string;
  label: string;
  title: string;
  description: string;
  pageTitle: string;
  pageDescription: string;
  officialSourceUrl: string;
  formVersion: string;
  lastVerified: string;
  embeddedPdf: string;
  introHtml: string;
  stepsHtml: string;
  steps?: FormStep[];
  commonMistakesHtml: string;
  faq: FormFAQItem[];
}

const placeholderIntro = (label: string) => `
  <!-- content: owner -->
  <p class="mb-4 text-muted-foreground">
    Detailed introduction to ${label} will be provided here by the content owner.
  </p>
`;

const placeholderSteps = (label: string) => `
  <!-- content: owner -->
  <ol class="mb-6 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
    <li>Open the ${label} form above.</li>
    <li>Fill in each field directly on the page or in the sidebar.</li>
    <li>Review the information, then click Fill and download PDF.</li>
  </ol>
`;

const placeholderStepsArray = (label: string): FormStep[] => [
  { title: 'Open the form', text: `Open the ${label} form above.` },
  { title: 'Fill the fields', text: 'Fill in each field directly on the page or in the sidebar.' },
  { title: 'Download', text: 'Review the information, then click Fill and download PDF.' },
];

const placeholderMistakes = (label: string) => `
  <!-- content: owner -->
  <p class="mb-4 text-muted-foreground">
    Common mistakes specific to ${label} will be listed here by the content owner.
  </p>
`;

const commonFaq: FormFAQItem[] = [
  {
    question: "Is this the official government form?",
    answer:
      "We use the official PDF template from the government source linked on this page. The filling happens entirely in your browser; we do not alter the form itself.",
  },
  {
    question: "Do you store my data?",
    answer:
      "No. All processing happens locally in your browser. Your information never leaves your device unless you choose to download or share the filled PDF.",
  },
  {
    question: "Can I use this for legal or tax filing?",
    answer:
      "This tool helps you fill the form. It is not legal or tax advice. Review the official instructions and, if needed, consult a professional before filing.",
  },
];

export const FORMS: FormConfig[] = [
  {
    id: "w-9",
    path: "/forms/w-9",
    label: "W-9",
    title: "Fill W-9 Online — Free, No Upload",
    description:
      "Fill IRS Form W-9 (Request for Taxpayer Identification Number) online for free. No sign-up, no upload — your data never leaves your device.",
    pageTitle: "Fill W-9 Online Free — No Sign Up, No Upload",
    pageDescription:
      "Fill IRS Form W-9 online for free. No sign-up, no upload — complete the official template in your browser and download the filled PDF.",
    officialSourceUrl: "https://www.irs.gov/forms-pubs/about-form-w-9",
    formVersion: "Rev. March 2024",
    lastVerified: "2026-09-16",
    embeddedPdf: "/forms/assets/w-9.pdf",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        Form W-9 (Request for Taxpayer Identification Number and Certification) is the IRS form you hand to
        anyone who will report payments made to you — a freelance client, a bank, a marketplace, a property
        manager. You don't file it with the IRS: the requester keeps it and uses your TIN to issue forms like
        1099-NEC or 1099-INT at year-end.
      </p>
      <p class="mb-4 text-muted-foreground">
        A W-9 contains your full legal name and your Social Security Number or EIN — exactly the data identity
        thieves want. Filling it here means the completed form never touches our servers: the official IRS
        template loads into your browser, you type into it locally, and the finished PDF is generated on your
        device.
      </p>
      <ul class="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Official IRS template (Rev. March 2024), hosted on this site</li>
        <li>Type directly into the form fields or use the sidebar — checkboxes and signature included</li>
        <li>Flattened on download: fields are locked, metadata is wiped</li>
        <li>Zero bytes uploaded — verify it yourself in the browser's Network tab</li>
      </ul>
      <p class="text-muted-foreground">
        Sending other documents along with the W-9? If a bank statement or ID scan goes with it, remove what
        the requester doesn't need first with our <a href="/pdf/redact" class="text-primary underline">PDF
        redaction tool</a> — it also runs entirely in your browser.
      </p>
    `,
    stepsHtml: `
      <ol class="mb-6 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li><strong>Line 1 — Your legal name.</strong> Enter your name exactly as it appears on your tax return. If you operate as a single-member LLC (disregarded entity), line 1 is the owner's name — not the LLC's name.</li>
        <li><strong>Line 2 — Business name.</strong> Fill in your business, trade or DBA name only if it differs from line 1. Otherwise leave it blank.</li>
        <li><strong>Line 3a — Tax classification.</strong> Check exactly one box. Freelancers and sole proprietors check “Individual/sole proprietor”. A single-member LLC that hasn't elected corporate status also checks “Individual/sole proprietor”; multi-member LLCs check the LLC box and enter P, C or S.</li>
        <li><strong>Line 3b — Flow-through entities.</strong> New since the March 2024 revision: only partnerships, trusts and LLCs taxed as partnerships check this if they have foreign partners, owners or beneficiaries. Most individuals leave it empty.</li>
        <li><strong>Line 4 — Exemptions.</strong> Leave blank unless you have an exempt payee code (most individuals and freelancers don't). Corporations are exempt only for certain payment types.</li>
        <li><strong>Lines 5–6 — Address.</strong> Enter the address where the requester should mail your information returns (your 1099s). Use your current mailing address.</li>
        <li><strong>Part I — Taxpayer Identification Number.</strong> Individuals enter their SSN; entities enter their EIN. Sole proprietors may use either, but the number must match the name on line 1 — a mismatch triggers IRS notices and backup withholding.</li>
        <li><strong>Part II — Sign and date.</strong> Sign and date the certification. You confirm under penalty of perjury that the TIN is correct and that you are not subject to backup withholding. Use the built-in signature pad — most requesters accept an e-signed W-9.</li>
        <li><strong>Download and send securely.</strong> Download the flattened PDF and deliver it to the requester — preferably not as an unencrypted email attachment, since it contains your SSN.</li>
      </ol>
    `,
    steps: [
      { title: "Line 1 — Your legal name", text: "Enter your name exactly as it appears on your tax return. If you operate as a single-member LLC (disregarded entity), line 1 is the owner's name — not the LLC's name." },
      { title: "Line 2 — Business name", text: "Fill in your business, trade or DBA name only if it differs from line 1. Otherwise leave it blank." },
      { title: "Line 3a — Tax classification", text: "Check exactly one box. Freelancers and sole proprietors check “Individual/sole proprietor”. A single-member LLC that hasn't elected corporate status also checks “Individual/sole proprietor”; multi-member LLCs check the LLC box and enter P, C or S." },
      { title: "Line 3b — Flow-through entities", text: "New since the March 2024 revision: only partnerships, trusts and LLCs taxed as partnerships check this if they have foreign partners, owners or beneficiaries. Most individuals leave it empty." },
      { title: "Line 4 — Exemptions", text: "Leave blank unless you have an exempt payee code (most individuals and freelancers don't). Corporations are exempt only for certain payment types." },
      { title: "Lines 5–6 — Address", text: "Enter the address where the requester should mail your information returns (your 1099s). Use your current mailing address." },
      { title: "Part I — Taxpayer Identification Number", text: "Individuals enter their SSN; entities enter their EIN. Sole proprietors may use either, but the number must match the name on line 1 — a mismatch triggers IRS notices and backup withholding." },
      { title: "Part II — Sign and date", text: "Sign and date the certification. You confirm under penalty of perjury that the TIN is correct and that you are not subject to backup withholding. Use the built-in signature pad — most requesters accept an e-signed W-9." },
      { title: "Download and send securely", text: "Download the flattened PDF and deliver it to the requester — preferably not as an unencrypted email attachment, since it contains your SSN." },
    ],
    commonMistakesHtml: `
      <ol class="mb-6 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
        <li>
          <strong class="text-foreground">Sending a W-9 to anyone who asks.</strong> W-9 phishing is a real
          scam: a fake “client” collects SSNs. Verify the requester through a channel you already trust before
          sending anything, and never send the form back to an unexpected email.
        </li>
        <li>
          <strong class="text-foreground">Wrong classification for an LLC.</strong> A single-member LLC is
          disregarded by default — line 1 gets the owner's name, and line 3a is “Individual/sole proprietor”
          (or C/S if the LLC elected corporate taxation). Checking “LLC” without an election is the most common
          W-9 error.
        </li>
        <li>
          <strong class="text-foreground">TIN that doesn't match the name.</strong> If the SSN/EIN doesn't match
          line 1 in IRS records, the requester gets a CP2100 notice and must start 24% backup withholding on
          your payments.
        </li>
        <li>
          <strong class="text-foreground">Unsigned or undated form.</strong> Without the Part II certification
          the form is invalid — requesters will reject it, and missing certification can also trigger backup
          withholding.
        </li>
        <li>
          <strong class="text-foreground">Not updating after life changes.</strong> Marriage, divorce, a new
          EIN, a changed address — send an updated W-9 to every active requester; stale data surfaces as 1099
          mismatches at year-end.
        </li>
        <li>
          <strong class="text-foreground">Emailing the filled form unencrypted.</strong> The PDF holds your SSN.
          Prefer a secure upload link from the requester, or at minimum agree on the channel first. Filling it
          locally (as on this page) removes the server-storage risk — delivery is the remaining weak point.
        </li>
      </ol>
    `,
    faq: [
      ...commonFaq,
      {
        question: "Do I send Form W-9 to the IRS?",
        answer: "No. A W-9 goes to the person or company that requested it — a client, bank or platform. They keep it on file and use your TIN to prepare information returns (like the 1099-NEC). The IRS never receives the W-9 itself.",
      },
      {
        question: "Should I use my SSN or EIN on a W-9?",
        answer: "Individuals use their SSN. Sole proprietors and single-member LLCs may use either the owner's SSN or the business EIN — many prefer an EIN to avoid circulating their SSN. Multi-member LLCs and corporations use the entity's EIN. The number must match the name on line 1.",
      },
      {
        question: "What is backup withholding?",
        answer: "If you don't provide a correct TIN or fail to sign the certification, the payer must withhold 24% of your payments and send it to the IRS. Filling the form completely and correctly avoids this.",
      },
      {
        question: "Is it safe to fill out a W-9 online here?",
        answer: "Yes — the form is filled entirely in your browser. Your name, SSN and signature never leave your device: you can disconnect from the internet after the page loads and everything still works. We have no servers receiving your data.",
      },
      {
        question: "Which W-9 version is current?",
        answer: "The IRS revision of March 2024 (it added line 3b for flow-through entities). We host the official template; the exact version and the date we last verified it are shown in the “Official source” block above.",
      },
      {
        question: "Is an electronic signature valid on a W-9?",
        answer: "The IRS permits electronic signatures on Form W-9 when the requester accepts them, and most do. The signature you draw or type here is an e-signature image, not a cryptographic certificate — if a requester has stricter requirements, they will say so.",
      },
    ],
  },
  {
    id: "i-9",
    path: "/forms/i-9",
    label: "I-9",
    title: "Fill I-9 Online — Free, No Upload",
    description:
      "Fill USCIS Form I-9 (Employment Eligibility Verification) online for free. No sign-up, no upload — your data never leaves your device.",
    pageTitle: "Fill I-9 Form Online Free — No Sign Up, No Upload",
    pageDescription:
      "Fill USCIS Form I-9 online for free. No sign-up, no upload — complete the official employment eligibility form in your browser.",
    officialSourceUrl: "https://www.uscis.gov/i-9",
    formVersion: "as published by USCIS",
    lastVerified: "2025-01-15",
    embeddedPdf: "/forms/assets/i-9.pdf",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        Form I-9 (Employment Eligibility Verification) is the USCIS form every U.S. employer must complete for
        every person they hire — citizens and noncitizens alike. The employee fills Section 1 no later than the
        first day of work; the employer examines the original identity and work-authorization documents and
        completes Section 2 within three business days of the start date.
      </p>
      <p class="mb-4 text-muted-foreground">
        An I-9 collects some of the most sensitive data a person shares at work: date of birth, Social Security
        Number, passport or green card numbers. Filling it here means that information never leaves your device —
        the official USCIS template loads into your browser, you complete it locally, and the PDF is generated
        on your machine.
      </p>
      <ul class="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Official USCIS template, hosted on this site — edition and verification date shown above</li>
        <li>Fill Section 1 on your phone or laptop before your first day — no app, no account</li>
        <li>Flattened on download, metadata wiped</li>
        <li>Zero bytes uploaded — your SSN and document numbers stay on your device</li>
      </ul>
      <p class="text-muted-foreground">
        Note: this page helps you fill the form. Employers must still examine original documents — an I-9 is
        never valid from a filled PDF alone.
      </p>
    `,
    stepsHtml: `
      <ol class="mb-6 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li><strong>Employee: fill Section 1.</strong> Enter your full legal name, address and date of birth. Check exactly one status box: U.S. citizen, noncitizen national, lawful permanent resident, or alien authorized to work. Sign and date no later than your first day of employment.</li>
        <li><strong>Employee: decide on the SSN field.</strong> The Social Security Number in Section 1 is voluntary — unless your employer uses E-Verify, in which case it is required. Ask HR if you're unsure.</li>
        <li><strong>Employee: choose your documents.</strong> Pick either one document from List A (proves identity and work authorization — e.g. a U.S. passport or green card) OR one from List B (identity — e.g. a driver's license) plus one from List C (work authorization — e.g. an unrestricted Social Security card). The choice is yours, not the employer's.</li>
        <li><strong>Employer: complete Section 2.</strong> Within three business days of the start date, examine the employee's original documents and record the document title, issuing authority, number and expiration date. Enter the first day of employment, then sign.</li>
        <li><strong>Employer: retain, don't file.</strong> The I-9 is never sent to USCIS. Keep it for three years after the hire date or one year after employment ends — whichever is later — and produce it on inspection.</li>
        <li><strong>Employer: reverify on time.</strong> If the employee's work authorization expires, reverify using Supplement B (formerly Section 3) no later than the expiration date. Permanent residents and citizens never need reverification.</li>
      </ol>
    `,
    steps: [
      { title: "Employee: fill Section 1", text: "Enter your full legal name, address and date of birth. Check exactly one status box: U.S. citizen, noncitizen national, lawful permanent resident, or alien authorized to work. Sign and date no later than your first day of employment." },
      { title: "Employee: decide on the SSN field", text: "The Social Security Number in Section 1 is voluntary — unless your employer uses E-Verify, in which case it is required. Ask HR if you're unsure." },
      { title: "Employee: choose your documents", text: "Pick either one document from List A (proves identity and work authorization — e.g. a U.S. passport or green card) OR one from List B (identity — e.g. a driver's license) plus one from List C (work authorization — e.g. an unrestricted Social Security card). The choice is yours, not the employer's." },
      { title: "Employer: complete Section 2", text: "Within three business days of the start date, examine the employee's original documents and record the document title, issuing authority, number and expiration date. Enter the first day of employment, then sign." },
      { title: "Employer: retain, don't file", text: "The I-9 is never sent to USCIS. Keep it for three years after the hire date or one year after employment ends — whichever is later — and produce it on inspection." },
      { title: "Employer: reverify on time", text: "If the employee's work authorization expires, reverify using Supplement B (formerly Section 3) no later than the expiration date. Permanent residents and citizens never need reverification." },
    ],
    commonMistakesHtml: `
      <ol class="mb-6 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
        <li>
          <strong class="text-foreground">Telling the employee which documents to bring.</strong> The employee
          chooses any valid combination (List A, or List B + List C). Demanding a specific document — or more
          documents than required — is document abuse, even with good intentions.
        </li>
        <li>
          <strong class="text-foreground">Accepting expired documents.</strong> Documents must be unexpired at
          the moment Section 2 is completed (a formal receipt is the narrow exception). “It expired last week”
          is one of the most common audit findings.
        </li>
        <li>
          <strong class="text-foreground">Late timing.</strong> Section 1 must be done by the first day of work;
          Section 2 — within three business days of it. An I-9 completed a week later is a compliance violation,
          even if everything else is correct.
        </li>
        <li>
          <strong class="text-foreground">Missing signatures and dates.</strong> The employee attestation in
          Section 1 and the employer attestation in Section 2 both require a signature and date. Blank
          attestations are the single most frequent fine in I-9 audits.
        </li>
        <li>
          <strong class="text-foreground">Backdating corrections.</strong> Never backdate. Fix errors with a
          single line through the entry, initials and the current date — and attach a note for material
          corrections.
        </li>
        <li>
          <strong class="text-foreground">Forgetting to reverify.</strong> Work authorization with an expiration
          date (List A or C) must be reverified in Supplement B before it lapses. Set a calendar reminder the
          day the form is completed.
        </li>
        <li>
          <strong class="text-foreground">Completing the I-9 before the offer is accepted.</strong> Running
          verification as a pre-screening tool risks discrimination claims. The form comes after acceptance,
          before (or on) day one.
        </li>
      </ol>
    `,
    faq: [
      ...commonFaq,
      {
        question: "Do I file Form I-9 with USCIS?",
        answer: "No. The completed form stays with the employer, who must keep it for three years after the hire date or one year after employment ends — whichever is later — and show it on government inspection. It is never mailed or uploaded to USCIS.",
      },
      {
        question: "Is my Social Security Number required on the I-9?",
        answer: "The SSN field in Section 1 is voluntary, unless your employer participates in E-Verify — then it is required. Everything else in Section 1 (name, address, date of birth, status, signature) is mandatory.",
      },
      {
        question: "Which documents do I need for an I-9?",
        answer: "Either one document from List A (e.g. a U.S. passport, passport card, permanent resident card, or an employment authorization document) or one from List B plus one from List C (e.g. a driver's license plus an unrestricted Social Security card or birth certificate). The employee picks the combination.",
      },
      {
        question: "Can Section 2 be done remotely?",
        answer: "Generally, the employer or their authorized representative must physically examine original documents. Since 2023, employers enrolled in E-Verify in good standing may use an alternative remote examination procedure — everyone else verifies in person.",
      },
      {
        question: "Which I-9 version is current?",
        answer: "USCIS currently requires the edition dated 08/01/2023 (expiration 05/31/2027) — check the edition date in the form's corner. We host the official template, and the “Official source” block above shows when we last verified it against uscis.gov.",
      },
      {
        question: "Is it safe to fill an I-9 on this site?",
        answer: "Yes. Everything happens in your browser: the template loads once, your answers and signature are processed locally, and the finished PDF is generated on your device. Nothing is uploaded — you can switch to airplane mode after the page loads and complete the whole form offline.",
      },
    ],
  },
  {
    id: "ds-11",
    path: "/forms/ds-11",
    label: "DS-11",
    title: "Fill DS-11 Online — Free, No Upload",
    description:
      "Fill U.S. Department of State Form DS-11 (passport application) online for free. No sign-up, no upload — your data never leaves your device.",
    pageTitle: "Fill DS-11 Passport Application Online Free — No Sign Up",
    pageDescription:
      "Complete the DS-11 U.S. passport application online for free. No sign-up, no upload — fill the official State Department form in your browser.",
    officialSourceUrl: "https://eforms.state.gov/Forms/ds11.pdf",
    formVersion: "as published by the U.S. Department of State",
    lastVerified: "2026-09-15",
    embeddedPdf: "/forms/assets/ds-11.pdf",
    introHtml: placeholderIntro("Form DS-11"),
    stepsHtml: placeholderSteps("Form DS-11"),
    steps: placeholderStepsArray("Form DS-11"),
    commonMistakesHtml: placeholderMistakes("Form DS-11"),
    faq: commonFaq,
  },
  {
    id: "ds-82",
    path: "/forms/ds-82",
    label: "DS-82",
    title: "Fill DS-82 Online — Free, No Upload",
    description:
      "Fill U.S. Department of State Form DS-82 (passport renewal) online for free. No sign-up, no upload — your data never leaves your device.",
    pageTitle: "Fill DS-82 Passport Renewal Online Free — No Sign Up",
    pageDescription:
      "Renew your U.S. passport with Form DS-82 online for free. No sign-up, no upload — complete the official renewal form in your browser.",
    officialSourceUrl: "https://eforms.state.gov/Forms/ds82.pdf",
    formVersion: "as published by the U.S. Department of State",
    lastVerified: "2026-09-15",
    embeddedPdf: "/forms/assets/ds-82.pdf",
    introHtml: placeholderIntro("Form DS-82"),
    stepsHtml: placeholderSteps("Form DS-82"),
    steps: placeholderStepsArray("Form DS-82"),
    commonMistakesHtml: placeholderMistakes("Form DS-82"),
    faq: commonFaq,
  },
  {
    id: "w-4",
    path: "/forms/w-4",
    label: "W-4",
    title: "Fill W-4 Online — Free, No Upload",
    description:
      "Fill IRS Form W-4 (Employee's Withholding Certificate) online for free. No sign-up, no upload — your data never leaves your device.",
    pageTitle: "Fill W-4 Online 2026 Free — No Sign Up, No Upload",
    pageDescription:
      "Fill out IRS Form W-4 for 2026 online for free. No sign-up, no upload — adjust your withholding in your browser.",
    officialSourceUrl: "https://www.irs.gov/forms-pubs/about-form-w-4",
    formVersion: "2025",
    lastVerified: "2026-09-15",
    embeddedPdf: "/forms/assets/w-4.pdf",
    introHtml: placeholderIntro("Form W-4"),
    stepsHtml: placeholderSteps("Form W-4"),
    steps: placeholderStepsArray("Form W-4"),
    commonMistakesHtml: placeholderMistakes("Form W-4"),
    faq: commonFaq,
  },
  {
    id: "schengen",
    path: "/forms/schengen",
    label: "Schengen Visa",
    title: "Fill Schengen Visa Application Online — Free, No Upload",
    description:
      "Fill the Schengen visa application form (EU short-stay visa) online for free. No sign-up, no upload — your data never leaves your device.",
    pageTitle: "Schengen Visa Application Form — Fill Online Free, No Sign Up",
    pageDescription:
      "Fill the Schengen visa application form online for free. No sign-up, no upload — complete the EU short-stay visa form in your browser.",
    officialSourceUrl: "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-code_en",
    formVersion: "as published by EU Member States",
    lastVerified: "2026-09-15",
    embeddedPdf: "/forms/assets/schengen.pdf",
    introHtml: placeholderIntro("Schengen visa application"),
    stepsHtml: placeholderSteps("Schengen visa application"),
    steps: placeholderStepsArray("Schengen visa application"),
    commonMistakesHtml: placeholderMistakes("Schengen visa application"),
    faq: commonFaq,
  },
];

export function getFormByPath(path: string): FormConfig | undefined {
  return FORMS.find((form) => form.path === path);
}

export function getFormById(id: string): FormConfig | undefined {
  return FORMS.find((form) => form.id === id);
}
