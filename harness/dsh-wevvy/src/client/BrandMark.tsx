/**
 * The app's own mark: the wevvy script "We" in brand blue, bare (no tile, no container),
 * served from the plugin's `assets/` like the dragon stills. It stands for the app where
 * the app speaks for itself — the sign-in pages, the permissions page — never for the
 * Muse: the face is the Muse, the mark is the app, and the mark never goes in the chat.
 */
import { createElement as h, type ReactNode } from 'react'

export function BrandMark({ size = 72, className }: { size?: number; className?: string }): ReactNode {
  return h('img', {
    src: 'wevvy/assets/wevvy-mark-256.png',
    alt: 'wevvy',
    width: size,
    draggable: false,
    className: `nm-brand-mark${className ? ` ${className}` : ''}`,
  })
}
