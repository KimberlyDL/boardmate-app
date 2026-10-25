import { toastController } from '@ionic/vue'
import { type DataIconName, lucideDataUrl } from '@/lib/icons'

const ICON: Record<'success' | 'danger' | 'medium', DataIconName> = { success: 'circle-check', danger: 'circle-alert', medium: 'info' }

/** Short status messages at the bottom of the screen: an ink pill with a colored status icon. */
export function useToast() {
  async function show(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const toast = await toastController.create({ message, color, icon: lucideDataUrl(ICON[color]), duration: 3000, position: 'bottom' })
    await toast.present()
  }

  return {
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'danger'),
    info: (message: string) => show(message, 'medium'),
  }
}
