/**
 * The mark: a bistro chair, seen from the side, with nobody in it.
 *
 * A place set for someone who has not arrived is the whole product in one
 * glyph — and being geometry rather than character art, it sits beside the
 * typography without competing with it. The bentwood back is the shape of the
 * chair you actually sit in at the restaurants this is built for.
 */
export function Mark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* bentwood back */}
      <path d="M7.6 12.5V5.2a1.6 1.6 0 0 1 1.6-1.6h.6" />
      {/* seat */}
      <path d="M5.6 12.5h12.8" />
      {/* legs and stretcher */}
      <path d="M7.6 12.5v7.4" />
      <path d="M16.6 12.5v7.4" />
      <path d="M7.6 16.8h9" />
    </svg>
  );
}
