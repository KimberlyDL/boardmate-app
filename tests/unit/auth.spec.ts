import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth'
import { accountService } from '@/services/account'
import { tokenStorage } from '@/services/tokenStorage'
import { caretakerService } from '@/services/caretaker'
import type { User } from '@/types/user'

// In-memory stand-in for Capacitor Preferences (no localStorage under Node).
vi.mock('@capacitor/preferences', () => {
  const store = new Map<string, string>()
  return {
    Preferences: {
      get: async ({ key }: { key: string }) => ({ value: store.get(key) ?? null }),
      set: async ({ key, value }: { key: string; value: string }) => void store.set(key, value),
      remove: async ({ key }: { key: string }) => void store.delete(key),
    },
  }
})

const kim: User = {
  id: 1,
  name: 'Kim Santos',
  email: 'kim@example.com',
  phone: null,
  email_verified_at: '2026-10-03T21:00:00+08:00',
  pending_email: null,
  has_password: true,
  google_linked: false,
  photo_url: null,
  roles: ['boarder'],
  active_role: 'boarder',
  consented_at: '2026-10-03T21:00:00+08:00',
  created_at: '2026-10-03T21:00:00+08:00',
}

describe('auth store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    await tokenStorage.clear()
  })

  test('login stores the token and user', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue({ token: 'abc', user: kim })
    const auth = useAuthStore()

    await auth.login('kim@example.com', 'secret123')

    expect(auth.isLoggedIn).toBe(true)
    expect(await tokenStorage.get()).toBe('abc')
  })

  test('register does not log in; it remembers the email to confirm', async () => {
    vi.spyOn(authService, 'register').mockResolvedValue({ email: 'kim@example.com', message: 'Check your email' })
    const auth = useAuthStore()

    await auth.register({
      name: 'Kim',
      email: 'kim@example.com',
      password: 'secret123',
      password_confirmation: 'secret123',
      consent: true,
    })

    expect(auth.isLoggedIn).toBe(false)
    expect(auth.pendingConfirmationEmail).toBe('kim@example.com')
    expect(await tokenStorage.get()).toBeNull()
  })

  test('Google sign-in starts a session and passes consent through', async () => {
    const google = vi.spyOn(authService, 'google').mockResolvedValue({ token: 'g-tok', user: { ...kim, google_linked: true } })
    const auth = useAuthStore()

    await auth.loginWithGoogle('id-token', true)

    expect(google).toHaveBeenCalledWith('id-token', true)
    expect(auth.user?.google_linked).toBe(true)
    expect(await tokenStorage.get()).toBe('g-tok')
  })

  test('after login, goes back to a pending invitation, else the role home', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue({ token: 'abc', user: { ...kim, roles: ['boarder', 'owner'], active_role: 'owner' } })
    const auth = useAuthStore()
    await auth.login('kim@example.com', 'secret123')

    expect(auth.homePath).toBe('/owner')
    expect(await auth.postLoginPath()).toBe('/owner')
    expect(await auth.postLoginPath('/profile')).toBe('/profile')

    await caretakerService.pendingInvite.set('tok123')
    expect(await auth.postLoginPath('/profile')).toBe('/invitations/tok123')
    await caretakerService.pendingInvite.clear()
  })

  test('init restores the session from a stored token', async () => {
    await tokenStorage.set('abc')
    vi.spyOn(accountService, 'me').mockResolvedValue(kim)
    const auth = useAuthStore()

    await auth.init()

    expect(auth.user?.email).toBe('kim@example.com')
    expect(auth.ready).toBe(true)
  })

  test('init clears a token the API rejects', async () => {
    await tokenStorage.set('expired')
    vi.spyOn(accountService, 'me').mockRejectedValue(new Error('401'))
    const auth = useAuthStore()

    await auth.init()

    expect(auth.isLoggedIn).toBe(false)
    expect(await tokenStorage.get()).toBeNull()
  })

  test('logout clears the session even if the API call fails', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue({ token: 'abc', user: kim })
    vi.spyOn(authService, 'logout').mockRejectedValue(new Error('offline'))
    const auth = useAuthStore()
    await auth.login('kim@example.com', 'secret123')

    await expect(auth.logout()).rejects.toThrow('offline')

    expect(auth.isLoggedIn).toBe(false)
    expect(await tokenStorage.get()).toBeNull()
  })
})
