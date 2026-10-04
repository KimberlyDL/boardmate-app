import { Preferences } from '@capacitor/preferences'

/**
 * Persists the Sanctum API token. Capacitor Preferences uses localStorage on
 * the web and native storage on Android, so the same code works on both.
 */
const TOKEN_KEY = 'boardmate.token'

let cached: string | null | undefined

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (cached === undefined) {
      cached = (await Preferences.get({ key: TOKEN_KEY })).value
    }
    return cached
  },

  async set(token: string): Promise<void> {
    cached = token
    await Preferences.set({ key: TOKEN_KEY, value: token })
  },

  async clear(): Promise<void> {
    cached = null
    await Preferences.remove({ key: TOKEN_KEY })
  },
}
