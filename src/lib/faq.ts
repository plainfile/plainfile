export interface FAQItem {
  question: string;
  answer: string;
}

export const REDACTION_FAQ: FAQItem[] = [
  {
    question: 'How does PlainFile redact PDFs?',
    answer:
      'PlainFile runs MuPDF inside your browser as WebAssembly. When you apply redactions, it removes the selected text, images and metadata from the actual PDF bytes, then re-verifies that nothing extractable remains.',
  },
  {
    question: 'Do my files leave my device?',
    answer:
      'No. The PDF is loaded into browser memory and processed locally. No bytes are uploaded to any server.',
  },
  {
    question: 'Is the redaction reversible?',
    answer:
      'No. Once you download the redacted file, the removed content is gone from the document. Keep a backup of the original if you may need it later.',
  },
  {
    question: 'What can I redact?',
    answer:
      'You can draw manual rectangles, search for a term, or use preset patterns (SSN, email, phone, credit card). Each match becomes a permanent redaction region.',
  },
  {
    question: 'Is there a file size limit?',
    answer:
      'Currently the tool is tested up to roughly 50 MB and ~200 pages. Larger files may work but are not guaranteed.',
  },
  {
    question: 'Can I use it offline?',
    answer:
      'Yes. After the page loads once, the WASM engine and worker are cached. You can disconnect from the internet and keep redacting.',
  },
];
