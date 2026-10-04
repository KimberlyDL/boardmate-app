import { toastController } from '@ionic/vue'

/** Short status messages at the bottom of the screen. */
export function useToast() {
  async function show(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const toast = await toastController.create({ message, color, duration: 3000, position: 'bottom' })
    await toast.present()
  }

  return {
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'danger'),
    info: (message: string) => show(message, 'medium'),
  }
}
