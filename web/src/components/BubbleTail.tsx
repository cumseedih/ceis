/**
 * The Messages tail (design.md, Chat): the last bubble of a group carries a small hook at
 * its outer bottom corner, about 6px below the body. Drawn as an SVG so the curve matches
 * the template and the sent side picks up the gradient's bottom stop.
 */
export function BubbleTail({ sent }: { sent: boolean }) {
  // Mirrored: the hook sits under the outer edge (right for sent, left for received).
  const path = sent
    ? "M18 6 C18 9.2 15.4 11.2 11 12 C6.4 9 3.8 7.3 1 6 Z"
    : "M0 6 C0 9.2 2.6 11.2 7 12 C11.6 9 14.2 7.3 17 6 Z";
  return (
    <svg
      aria-hidden
      width="18"
      height="12"
      viewBox="0 0 18 12"
      className={`pointer-events-none absolute bottom-[-6px] ${sent ? "right-0" : "left-0"}`}
    >
      <path d={path} fill={sent ? "var(--om-bubble-user-bottom)" : "var(--om-bubble-agent)"} />
    </svg>
  );
}
