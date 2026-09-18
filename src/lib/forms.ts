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
    formVersion: "2024",
    lastVerified: "2025-01-15",
    embeddedPdf: "/forms/assets/w-9.pdf",
    introHtml: placeholderIntro("Form W-9"),
    stepsHtml: placeholderSteps("Form W-9"),
    steps: placeholderStepsArray("Form W-9"),
    commonMistakesHtml: placeholderMistakes("Form W-9"),
    faq: commonFaq,
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
    introHtml: placeholderIntro("Form I-9"),
    stepsHtml: placeholderSteps("Form I-9"),
    steps: placeholderStepsArray("Form I-9"),
    commonMistakesHtml: placeholderMistakes("Form I-9"),
    faq: commonFaq,
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
