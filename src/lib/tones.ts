/** A status tone of the design system's StatusTag. */
export type TagTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'

/**
 * The app's status helpers (billStatus, paymentColor…) speak in Ionic colors;
 * this maps them onto StatusTag tones so pages can keep using them unchanged.
 */
export function toneOf(ionColor: string | undefined | null): TagTone {
  switch (ionColor) {
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'danger':
      return 'danger'
    case 'primary':
      return 'brand'
    case 'tertiary':
      return 'info'
    default:
      return 'neutral'
  }
}
