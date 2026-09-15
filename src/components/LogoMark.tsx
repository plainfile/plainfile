// PlainFile logo mark: document with a redaction bar.
// Follows lucide conventions (24x24 grid, currentColor) so it can be used
// interchangeably with lucide icons.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* document outline */}
      <rect x="6.5" y="3.5" width="11" height="17" rx="2" />
      {/* redaction bar */}
      <rect x="9.2" y="10.8" width="5.6" height="2.4" rx="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
