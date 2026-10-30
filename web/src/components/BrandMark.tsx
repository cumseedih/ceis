import { cx } from "../util";

/**
 * The app's own mark: the ceis W stroke on its white tile with a hairline edge,
 * `public/icon.svg`. It stands for the app where the app speaks for itself (the sign-in
 * door, the first seconds before the socket is up, the token gate), never for the Muse:
 * the face is the Muse, the mark is the app. The tile stays white in the dark theme too.
 */
export function BrandMark({ size = 72, className }: { size?: number; className?: string }) {
  return <img src="/icon.svg" alt="ceis" width={size} height={size} draggable={false} className={cx("block shrink-0 select-none", className)} style={{ width: size, height: size }} />;
}

/**
 * The bare script mark on transparency (`public/mark.png`): the sign-in door's centred
 * mark, with no tile or container behind it.
 */
export function BareMark({ size = 64, className }: { size?: number; className?: string }) {
  return <img src="/mark.png" alt="ceis" width={size} draggable={false} className={cx("block h-auto shrink-0 select-none", className)} style={{ width: size }} />;
}
