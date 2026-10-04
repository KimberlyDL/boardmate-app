/**
 * Google Identity Services (web). Loads Google's script once and renders the
 * official "Continue with Google" button. Google hands back a signed ID token,
 * which the app sends to POST /auth/google.
 *
 * For the Android build, swap the button for a native Google sign-in plugin
 * that returns the same ID token; the API side does not change.
 */

interface CredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (r: CredentialResponse) => void; ux_mode?: 'popup' | 'redirect' }): void
  renderButton(
    parent: HTMLElement,
    options: { theme?: string; size?: string; text?: string; shape?: string; width?: number; logo_alignment?: string },
  ): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load Google sign-in. Check your connection.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export const googleAuth = {
  /** False until VITE_GOOGLE_CLIENT_ID is set; the button stays hidden. */
  isConfigured(): boolean {
    return !!clientId
  },

  /** Render Google's button into `el`; `onIdToken` gets the ID token after sign-in. */
  async renderButton(el: HTMLElement, onIdToken: (idToken: string) => void): Promise<void> {
    if (!clientId) return
    await loadScript()
    const id = window.google!.accounts.id
    id.initialize({ client_id: clientId, callback: (r) => onIdToken(r.credential), ux_mode: 'popup' })
    id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'center',
      width: Math.min(el.clientWidth || 320, 400),
    })
  },
}
