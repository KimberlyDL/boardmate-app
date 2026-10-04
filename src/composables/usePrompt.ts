import { alertController } from '@ionic/vue'

/** Small confirm / ask-for-a-reason dialogs used by admin and owner screens. */
export function usePrompt() {
  async function confirm(header: string, message: string, action: string): Promise<boolean> {
    const alert = await alertController.create({
      header,
      message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: action, role: 'confirm' },
      ],
    })
    await alert.present()
    return (await alert.onDidDismiss()).role === 'confirm'
  }

  /** Returns the typed reason, or null if cancelled. */
  async function reason(header: string, message: string, action: string): Promise<string | null> {
    const alert = await alertController.create({
      header,
      message,
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Reason (shown to the owner)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: action, role: 'confirm' },
      ],
    })
    await alert.present()
    const { role, data } = await alert.onDidDismiss()
    const text = (data?.values?.reason ?? '').trim()
    return role === 'confirm' && text ? text : null
  }

  return { confirm, reason }
}
