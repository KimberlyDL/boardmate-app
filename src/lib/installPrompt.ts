import { ref } from 'vue'

/**
 * The browser's "install this app" offer (Chrome and Edge on Android and desktop), kept so the
 * website can show its own "Install the app" button (W1). Browsers without it (Safari) never fire
 * the event, and the button stays hidden. Imported from main.ts so the early event is not missed.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const offer = ref<InstallPromptEvent | null>(null)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    offer.value = e as InstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    offer.value = null
  })
}

export function useInstallPrompt() {
  /** Shows the browser's install dialog; true when the person installed it. */
  async function install(): Promise<boolean> {
    const event = offer.value
    if (!event) return false
    offer.value = null
    await event.prompt()
    return (await event.userChoice).outcome === 'accepted'
  }

  return { canInstall: offer, install }
}
