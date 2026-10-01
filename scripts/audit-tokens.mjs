/**
 * Synthetic tokens used by the redaction audit.
 *
 * Every value here is deliberately invalid or reserved, so the test document cannot
 * contain a real person's data:
 *   - 123-45-6789 is the classic non-issued SSN used in examples
 *   - example.com is reserved by RFC 2606 for documentation
 *   - +1 555 0100 is inside the 555-0100..555-0199 range reserved for fiction
 *   - the IBAN fails its check digits and the account number is invented
 *
 * Do not replace these with realistic-looking live data. The point of the audit is to
 * measure redaction behaviour, not to handle anyone's actual records.
 */

export const TOKENS = [
  { id: 'name', value: 'Dana Whitfield', kind: 'fictional name' },
  { id: 'ssn', value: '123-45-6789', kind: 'SSN (non-issued example range)' },
  { id: 'account', value: 'ACCT-4417-0099-2231-7788', kind: 'account number' },
  { id: 'iban', value: 'DE00 0000 0000 0000 0000 00', kind: 'IBAN (fails check digits)' },
  { id: 'email', value: 'dana.whitfield@example.com', kind: 'email (reserved domain)' },
  { id: 'phone', value: '+1 555 0100', kind: 'phone (reserved fiction range)' },
  { id: 'dob', value: '1974-03-08', kind: 'date of birth' },
  { id: 'case', value: 'CLIENT-7841-QX', kind: 'case reference (also in metadata)' },
  { id: 'hidden', value: 'INVISIBLE-LAYER-3391', kind: 'white-on-white text layer' },
];

export const TOKEN_VALUES = TOKENS.map((t) => t.value);

/** Tokens planted in the document's Info/metadata dictionary rather than on the page. */
export const METADATA_TOKENS = ['CLIENT-7841-QX', '123-45-6789', 'Dana Whitfield'];
