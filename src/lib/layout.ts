/**
 * Screen sizes for the website and desktop layout (W1). The same numbers are in theme/app.css
 * (CSS media queries cannot read variables). Phone is the default; tablet and desktop only add.
 */
export const BREAKPOINTS = {
  /** From here a screen is a tablet: two columns where they help. */
  tablet: 768,
  /** From here a screen is a desktop: sidebar instead of bottom tabs (16.2), wider pages. */
  desktop: 992,
} as const

export type ScreenSize = 'phone' | 'tablet' | 'desktop'

/** The size class of a width in CSS pixels. */
export function screenSizeOf(width: number): ScreenSize {
  if (width >= BREAKPOINTS.desktop) return 'desktop'
  if (width >= BREAKPOINTS.tablet) return 'tablet'
  return 'phone'
}
