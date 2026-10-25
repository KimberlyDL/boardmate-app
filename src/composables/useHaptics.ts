import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * Small vibrations on phones (native app, or Android browsers that allow it).
 * Silent everywhere else; never throws.
 */
async function safely(run: () => Promise<void>): Promise<void> {
  try {
    if (Capacitor.isNativePlatform() || 'vibrate' in navigator) await run()
  } catch {
    // Haptics are a nicety; ignore devices that refuse.
  }
}

export function useHaptics() {
  return {
    /** A light tap: toggles, pull-to-refresh release, selection. */
    tap: () => safely(() => Haptics.impact({ style: ImpactStyle.Light })),
    /** Something saved or sent. */
    success: () => safely(() => Haptics.notification({ type: NotificationType.Success })),
    /** Something needs attention. */
    warning: () => safely(() => Haptics.notification({ type: NotificationType.Warning })),
    /** Something failed. */
    error: () => safely(() => Haptics.notification({ type: NotificationType.Error })),
  }
}
