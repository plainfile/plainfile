export interface FormStep {
  title: string;
  text: string;
}

export interface FormFAQItem {
  question: string;
  answer: string;
}

import type { VirtualField } from "./engine";

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
  virtualFields?: VirtualField[];
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

const ds82VirtualFields: VirtualField[] = [
  // Application Page 1 (PDF page index 4)
  { name: "lastName", label: "Last name", type: "text", page: 4, rect: { x: 65, y: 142, width: 540, height: 18 } },
  { name: "firstName", label: "First name", type: "text", page: 4, rect: { x: 65, y: 162, width: 300, height: 18 } },
  { name: "middleName", label: "Middle name", type: "text", page: 4, rect: { x: 370, y: 162, width: 235, height: 18 } },
  { name: "dateOfBirth", label: "Date of Birth", type: "text", page: 4, rect: { x: 65, y: 188, width: 120, height: 18 } },
  { name: "sex", label: "Sex (M/F)", type: "text", page: 4, rect: { x: 250, y: 188, width: 70, height: 18 } },
  { name: "placeOfBirth", label: "Place of Birth", type: "text", page: 4, rect: { x: 370, y: 188, width: 235, height: 18 } },
  { name: "ssn", label: "Social Security Number", type: "text", page: 4, rect: { x: 65, y: 215, width: 170, height: 18 } },
  { name: "email", label: "Email", type: "text", page: 4, rect: { x: 250, y: 215, width: 170, height: 18 } },
  { name: "phone", label: "Primary Contact Phone Number", type: "text", page: 4, rect: { x: 435, y: 215, width: 170, height: 18 } },
  { name: "mailingAddress1", label: "Mailing Address Line 1", type: "text", page: 4, rect: { x: 45, y: 245, width: 560, height: 18 } },
  { name: "mailingAddress2", label: "Mailing Address Line 2", type: "text", page: 4, rect: { x: 45, y: 275, width: 560, height: 18 } },
  { name: "city", label: "City", type: "text", page: 4, rect: { x: 45, y: 305, width: 170, height: 18 } },
  { name: "state", label: "State", type: "text", page: 4, rect: { x: 230, y: 305, width: 80, height: 18 } },
  { name: "zip", label: "Zip Code", type: "text", page: 4, rect: { x: 325, y: 305, width: 100, height: 18 } },
  { name: "country", label: "Country", type: "text", page: 4, rect: { x: 440, y: 305, width: 165, height: 18 } },
  { name: "previousNameA", label: "Other names used (A)", type: "text", page: 4, rect: { x: 45, y: 335, width: 270, height: 18 } },
  { name: "previousNameB", label: "Other names used (B)", type: "text", page: 4, rect: { x: 325, y: 335, width: 280, height: 18 } },
  { name: "passportName", label: "Name as printed on most recent passport", type: "text", page: 4, rect: { x: 280, y: 365, width: 325, height: 18 } },
  { name: "passportBookNumber", label: "Most recent passport book number", type: "text", page: 4, rect: { x: 280, y: 395, width: 170, height: 18 } },
  { name: "passportBookIssueDate", label: "Book issue date", type: "text", page: 4, rect: { x: 470, y: 395, width: 135, height: 18 } },
  { name: "passportCardNumber", label: "Most recent passport card number", type: "text", page: 4, rect: { x: 280, y: 425, width: 170, height: 18 } },
  { name: "passportCardIssueDate", label: "Card issue date", type: "text", page: 4, rect: { x: 470, y: 425, width: 135, height: 18 } },
  { name: "nameChangePlace", label: "Place of name change", type: "text", page: 4, rect: { x: 360, y: 455, width: 120, height: 18 } },
  { name: "nameChangeDate", label: "Date of name change", type: "text", page: 4, rect: { x: 500, y: 455, width: 105, height: 18 } },
  { name: "signatureDate", label: "Signature date", type: "text", page: 4, rect: { x: 500, y: 540, width: 105, height: 18 } },
  // Application Page 2 (PDF page index 5)
  { name: "applicantName", label: "Name of Applicant", type: "text", page: 5, rect: { x: 45, y: 40, width: 360, height: 18 } },
  { name: "dateOfBirth2", label: "Date of Birth", type: "text", page: 5, rect: { x: 470, y: 40, width: 130, height: 18 } },
  { name: "height", label: "Height", type: "text", page: 5, rect: { x: 45, y: 75, width: 60, height: 18 } },
  { name: "hairColor", label: "Hair Color", type: "text", page: 5, rect: { x: 115, y: 75, width: 100, height: 18 } },
  { name: "eyeColor", label: "Eye Color", type: "text", page: 5, rect: { x: 225, y: 75, width: 100, height: 18 } },
  { name: "occupation", label: "Occupation", type: "text", page: 5, rect: { x: 340, y: 75, width: 120, height: 18 } },
  { name: "employer", label: "Employer or School", type: "text", page: 5, rect: { x: 475, y: 75, width: 130, height: 18 } },
  { name: "additionalPhone1", label: "Additional Phone 1", type: "text", page: 5, rect: { x: 45, y: 110, width: 220, height: 18 } },
  { name: "additionalPhone2", label: "Additional Phone 2", type: "text", page: 5, rect: { x: 330, y: 110, width: 220, height: 18 } },
  { name: "permanentAddress1", label: "Permanent Address Line 1", type: "text", page: 5, rect: { x: 45, y: 145, width: 460, height: 18 } },
  { name: "permanentApt", label: "Permanent Apartment/Unit", type: "text", page: 5, rect: { x: 520, y: 145, width: 85, height: 18 } },
  { name: "permanentCity", label: "Permanent City", type: "text", page: 5, rect: { x: 45, y: 180, width: 160, height: 18 } },
  { name: "permanentState", label: "Permanent State", type: "text", page: 5, rect: { x: 220, y: 180, width: 60, height: 18 } },
  { name: "permanentZip", label: "Permanent Zip Code", type: "text", page: 5, rect: { x: 295, y: 180, width: 75, height: 18 } },
  { name: "permanentCountry", label: "Permanent Country", type: "text", page: 5, rect: { x: 385, y: 180, width: 155, height: 18 } },
  { name: "emergencyName", label: "Emergency Contact Name", type: "text", page: 5, rect: { x: 45, y: 215, width: 180, height: 18 } },
  { name: "emergencyAddress", label: "Emergency Address", type: "text", page: 5, rect: { x: 240, y: 215, width: 240, height: 18 } },
  { name: "emergencyApt", label: "Emergency Apartment/Unit", type: "text", page: 5, rect: { x: 495, y: 215, width: 85, height: 18 } },
  { name: "emergencyCity", label: "Emergency City", type: "text", page: 5, rect: { x: 45, y: 250, width: 120, height: 18 } },
  { name: "emergencyState", label: "Emergency State", type: "text", page: 5, rect: { x: 180, y: 250, width: 60, height: 18 } },
  { name: "emergencyZip", label: "Emergency Zip Code", type: "text", page: 5, rect: { x: 255, y: 250, width: 75, height: 18 } },
  { name: "emergencyCountry", label: "Emergency Country", type: "text", page: 5, rect: { x: 345, y: 250, width: 110, height: 18 } },
  { name: "emergencyEmail", label: "Emergency Email", type: "text", page: 5, rect: { x: 470, y: 250, width: 110, height: 18 } },
  { name: "emergencyPhone", label: "Emergency Phone Number", type: "text", page: 5, rect: { x: 45, y: 285, width: 120, height: 18 } },
  { name: "emergencyRelationship", label: "Relationship to Applicant", type: "text", page: 5, rect: { x: 195, y: 285, width: 140, height: 18 } },
  { name: "departureDate", label: "Departure Date", type: "text", page: 5, rect: { x: 45, y: 335, width: 90, height: 18 } },
  { name: "returnDate", label: "Return Date", type: "text", page: 5, rect: { x: 150, y: 335, width: 90, height: 18 } },
  { name: "countriesVisited", label: "Countries To Be Visited", type: "text", page: 5, rect: { x: 270, y: 335, width: 335, height: 18 } },
];

const schengenVirtualFields: VirtualField[] = [
  // Page 1 (PDF page index 0)
  { name: "surname", label: "Surname", type: "text", page: 0, rect: { x: 103, y: 370, width: 330, height: 16 } },
  { name: "surnameAtBirth", label: "Surname at birth", type: "text", page: 0, rect: { x: 103, y: 388, width: 330, height: 16 } },
  { name: "firstNames", label: "First name(s)", type: "text", page: 0, rect: { x: 103, y: 406, width: 330, height: 16 } },
  { name: "dateOfBirth", label: "Date of birth", type: "text", page: 0, rect: { x: 91, y: 455, width: 70, height: 16 } },
  { name: "placeOfBirth", label: "Place of birth", type: "text", page: 0, rect: { x: 183, y: 440, width: 155, height: 16 } },
  { name: "countryOfBirth", label: "Country of birth", type: "text", page: 0, rect: { x: 183, y: 490, width: 155, height: 16 } },
  { name: "currentNationality", label: "Current nationality", type: "text", page: 0, rect: { x: 367, y: 440, width: 70, height: 16 } },
  { name: "nationalityAtBirth", label: "Nationality at birth", type: "text", page: 0, rect: { x: 367, y: 462, width: 70, height: 16 } },
  { name: "otherNationalities", label: "Other nationalities", type: "text", page: 0, rect: { x: 367, y: 484, width: 70, height: 16 } },
  { name: "sex", label: "Sex", type: "text", page: 0, rect: { x: 86, y: 555, width: 60, height: 16 } },
  { name: "civilStatus", label: "Civil status", type: "text", page: 0, rect: { x: 178, y: 555, width: 240, height: 16 } },
  { name: "parentalAuthority", label: "Parental authority / legal guardian", type: "text", page: 0, rect: { x: 86, y: 585, width: 350, height: 16 } },
  { name: "nationalIdentityNumber", label: "National identity number", type: "text", page: 0, rect: { x: 86, y: 610, width: 350, height: 16 } },
  // Page 2 (PDF page index 1)
  { name: "travelDocumentType", label: "Type of travel document", type: "text", page: 1, rect: { x: 68, y: 110, width: 360, height: 16 } },
  { name: "travelDocumentNumber", label: "Number of travel document", type: "text", page: 1, rect: { x: 68, y: 180, width: 90, height: 16 } },
  { name: "dateOfIssue", label: "Date of issue", type: "text", page: 1, rect: { x: 160, y: 180, width: 90, height: 16 } },
  { name: "validUntil", label: "Valid until", type: "text", page: 1, rect: { x: 252, y: 180, width: 90, height: 16 } },
  { name: "issuedBy", label: "Issued by", type: "text", page: 1, rect: { x: 344, y: 180, width: 90, height: 16 } },
  { name: "familySurname", label: "Family member surname", type: "text", page: 1, rect: { x: 68, y: 250, width: 180, height: 16 } },
  { name: "familyFirstNames", label: "Family member first name(s)", type: "text", page: 1, rect: { x: 257, y: 250, width: 180, height: 16 } },
  { name: "familyDateOfBirth", label: "Family member date of birth", type: "text", page: 1, rect: { x: 68, y: 320, width: 90, height: 16 } },
  { name: "familyNationality", label: "Family member nationality", type: "text", page: 1, rect: { x: 165, y: 320, width: 180, height: 16 } },
  { name: "familyDocumentNumber", label: "Family member document number", type: "text", page: 1, rect: { x: 349, y: 320, width: 140, height: 16 } },
  { name: "homeAddress", label: "Home address and email", type: "text", page: 1, rect: { x: 68, y: 420, width: 270, height: 16 } },
  { name: "telephone", label: "Telephone no.", type: "text", page: 1, rect: { x: 349, y: 420, width: 130, height: 16 } },
  { name: "residencePermit", label: "Residence permit", type: "text", page: 1, rect: { x: 68, y: 475, width: 360, height: 16 } },
  { name: "currentOccupation", label: "Current occupation", type: "text", page: 1, rect: { x: 68, y: 510, width: 360, height: 16 } },
  { name: "numberOfEntries", label: "Number of entries requested", type: "text", page: 1, rect: { x: 441, y: 535, width: 70, height: 16 } },
  { name: "employer", label: "Employer / educational establishment", type: "text", page: 1, rect: { x: 68, y: 545, width: 360, height: 16 } },
  { name: "purposeOfJourney", label: "Purpose(s) of the journey", type: "text", page: 1, rect: { x: 68, y: 600, width: 360, height: 16 } },
  { name: "additionalInfoPurpose", label: "Additional information on purpose of stay", type: "text", page: 1, rect: { x: 68, y: 650, width: 360, height: 16 } },
  { name: "mainDestination", label: "Member State of main destination", type: "text", page: 1, rect: { x: 68, y: 700, width: 180, height: 16 } },
  { name: "firstEntryState", label: "Member State of first entry", type: "text", page: 1, rect: { x: 252, y: 700, width: 180, height: 16 } },
  { name: "intendedArrivalDate", label: "Intended date of arrival", type: "text", page: 1, rect: { x: 68, y: 775, width: 180, height: 16 } },
  { name: "intendedDepartureDate", label: "Intended date of departure", type: "text", page: 1, rect: { x: 280, y: 775, width: 180, height: 16 } },
  // Page 3 (PDF page index 2)
  { name: "fingerprintsCollected", label: "Fingerprints collected previously", type: "text", page: 2, rect: { x: 90, y: 115, width: 60, height: 16 } },
  { name: "fingerprintsDate", label: "Date fingerprints collected", type: "text", page: 2, rect: { x: 68, y: 140, width: 120, height: 16 } },
  { name: "fingerprintsNumber", label: "Visa number (if known)", type: "text", page: 2, rect: { x: 250, y: 140, width: 180, height: 16 } },
  { name: "entryPermitIssuedBy", label: "Entry permit issued by", type: "text", page: 2, rect: { x: 68, y: 200, width: 120, height: 16 } },
  { name: "entryPermitValidFrom", label: "Entry permit valid from", type: "text", page: 2, rect: { x: 200, y: 200, width: 100, height: 16 } },
  { name: "entryPermitValidUntil", label: "Entry permit valid until", type: "text", page: 2, rect: { x: 330, y: 200, width: 100, height: 16 } },
  { name: "invitingPersonName", label: "Inviting person(s) / accommodation", type: "text", page: 2, rect: { x: 68, y: 260, width: 360, height: 16 } },
  { name: "invitingAddress", label: "Address/email of inviting person", type: "text", page: 2, rect: { x: 68, y: 315, width: 180, height: 16 } },
  { name: "invitingTelephone", label: "Telephone No", type: "text", page: 2, rect: { x: 257, y: 315, width: 180, height: 16 } },
  { name: "invitingCompanyName", label: "Inviting company/organisation", type: "text", page: 2, rect: { x: 68, y: 350, width: 360, height: 16 } },
  { name: "invitingCompanyAddress", label: "Address of inviting company", type: "text", page: 2, rect: { x: 68, y: 405, width: 180, height: 16 } },
  { name: "invitingCompanyTelephone", label: "Telephone No of company", type: "text", page: 2, rect: { x: 257, y: 405, width: 180, height: 16 } },
  { name: "costCoveredBy", label: "Cost covered by (applicant)", type: "text", page: 2, rect: { x: 68, y: 450, width: 180, height: 16 } },
  { name: "costCoveredOther", label: "Cost covered by (other)", type: "text", page: 2, rect: { x: 278, y: 450, width: 180, height: 16 } },
  { name: "fillerName", label: "Person filling the form (name)", type: "text", page: 2, rect: { x: 68, y: 620, width: 360, height: 16 } },
  { name: "fillerAddress", label: "Address/email of person filling", type: "text", page: 2, rect: { x: 68, y: 665, width: 180, height: 16 } },
  { name: "fillerTelephone", label: "Telephone No", type: "text", page: 2, rect: { x: 257, y: 665, width: 180, height: 16 } },
  // Page 4 (PDF page index 3)
  { name: "placeAndDate", label: "Place and date", type: "text", page: 3, rect: { x: 65, y: 615, width: 200, height: 16 } },
];

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
    virtualFields: ds82VirtualFields,
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
    virtualFields: schengenVirtualFields,
  },
];

export function getFormByPath(path: string): FormConfig | undefined {
  return FORMS.find((form) => form.path === path);
}

export function getFormById(id: string): FormConfig | undefined {
  return FORMS.find((form) => form.id === id);
}
