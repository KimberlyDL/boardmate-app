import { Capacitor } from '@capacitor/core'
import type { SocialLoginPlugin } from '@capgo/capacitor-social-login'

/**
 * "Continue with Google". Either way Google hands back a signed ID token,
 * which the app sends to POST /auth/google.
 *
 * - Web: Google Identity Services. Loads Google's script once and renders the
 *   official button.
 * - Android app: Google blocks its sign-in page inside the app's WebView, so
 *   the native account picker (Credential Manager) is used instead. It asks for
 *   a token addressed to the same Web client ID, so the API side does not
 *   change. Google Cloud also needs an Android OAuth client for
 *   com.dormlink.app with the signing key's SHA-1.
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

let nativeReady: Promise<SocialLoginPlugin> | null = null

/** Loaded only in the Android app: importing the plugin runs web setup code the website doesn't need. */
function initNative(): Promise<SocialLoginPlugin> {
  nativeReady ??= import('@capgo/capacitor-social-login')
    .then(async ({ SocialLogin }) => {
      await SocialLogin.initialize({ google: { webClientId: clientId!, mode: 'online' } })
      return SocialLogin
    })
    .catch((e) => {
      nativeReady = null
      throw e
    })
  return nativeReady
}

export const googleAuth = {
  /** False until VITE_GOOGLE_CLIENT_ID is set; the button stays hidden. */
  isConfigured(): boolean {
    return !!clientId
  },

  /** True in the Android app, where the native account picker is used instead of Google's web button. */
  isNative(): boolean {
    return Capacitor.isNativePlatform()
  },

  /**
   * Android app: open the native Google account picker and return the ID token,
   * or null if the person closed the picker.
   */
  async signInNative(): Promise<string | null> {
    if (!clientId) return null
    const SocialLogin = await initNative()
    try {
      const login = await SocialLogin.login({ provider: 'google', options: {} })
      const idToken = login.result && 'idToken' in login.result ? login.result.idToken : null
      if (!idToken) throw new Error('Google did not return a sign-in token. Please try again.')
      return idToken
    } catch (e) {
      if ((e as { code?: string }).code === 'USER_CANCELLED') return null
      throw e
    }
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
