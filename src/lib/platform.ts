import { Capacitor } from '@capacitor/core'

/**
 * Whether DormLink runs as an installed app: the Android build, or the web app added to the home
 * screen (standalone). Everything else is a browser tab, phone or desktop, which gets the website
 * landing page (W1). The whole app works the same in a browser; this only picks the front page.
 */
export function isInstalledApp(): boolean {
  if (Capacitor.isNativePlatform()) return true
  return typeof window !== 'undefined' && !!window.matchMedia?.('(display-mode: standalone)').matches
}
