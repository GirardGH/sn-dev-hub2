/** Compact, local vector version of the approved archive/code identity. */
export function BrandIcon({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" className={className}>
    <rect width="64" height="64" rx="16" fill="#8BD05B" />
    <path d="M11 39 29.5 29a5 5 0 0 1 5 0L53 39a3 3 0 0 1 0 5L34.5 54a5 5 0 0 1-5 0L11 44a3 3 0 0 1 0-5Z" fill="#102C3E" />
    <path d="M11 30 29.5 20a5 5 0 0 1 5 0L53 30a3 3 0 0 1 0 5L34.5 45a5 5 0 0 1-5 0L11 35a3 3 0 0 1 0-5Z" fill="#17483A" stroke="#8BD05B" strokeWidth="2.5" />
    <path d="M11 21 29.5 11a5 5 0 0 1 5 0L53 21a3 3 0 0 1 0 5L34.5 36a5 5 0 0 1-5 0L11 26a3 3 0 0 1 0-5Z" fill="white" stroke="#8BD05B" strokeWidth="2.5" />
    <path d="m27 19-6 4.5 6 4.5m10-9 6 4.5-6 4.5" stroke="#72B843" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
