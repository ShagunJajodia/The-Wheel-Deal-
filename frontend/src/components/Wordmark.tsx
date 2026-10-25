/** "The Wheel Deal" wordmark with a small line-art wheel. Inherits the text colour. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9.5" />
        <circle cx="12" cy="12" r="2.25" />
        <path
          d="M12 2.5v7.25M12 14.25v7.25M2.5 12h7.25M14.25 12h7.25M5.3 5.3l5.1 5.1M13.6 13.6l5.1 5.1M18.7 5.3l-5.1 5.1M10.4 13.6l-5.1 5.1"
          strokeWidth="1.1"
        />
      </svg>
      The Wheel Deal
    </span>
  );
}
