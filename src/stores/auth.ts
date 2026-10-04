import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toastController } from '@ionic/vue'
import { setUnauthorizedHandler } from '@/services/api'
import { accountService } from '@/services/account'
import { authService, type AuthResult, type RegisterInput } from '@/services/auth'
import { tokenStorage } from '@/services/tokenStorage'
import { caretakerService } from '@/services/caretaker'
import { homeFor } from '@/lib/roles'
import type { UserRole } from '@/types/enums'
import type { User } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = ref(false)
  /** Email waiting for confirmation, shown on the Check-your-email page (kept out of URLs). */
  const pendingConfirmationEmail = ref('')
  let initPromise: Promise<void> | null = null

  const isLoggedIn = computed(() => user.value !== null)
  /** Start page of the role the user is currently acting as. */
  const homePath = computed(() => homeFor(user.value?.active_role))

  function hasRole(role: UserRole): boolean {
    return user.value?.roles.includes(role) ?? false
  }

  async function switchRole(role: UserRole) {
    user.value = await accountService.switchRole(role)
  }

  /**
   * Where to go right after logging in: back to a caretaker invitation opened
   * while signed out, else the requested page, else the role's home.
   */
  async function postLoginPath(requested?: string): Promise<string> {
    const invite = await caretakerService.pendingInvite.get()
    if (invite) return `/invitations/${invite}`
    return requested && requested !== '/' ? requested : homePath.value
  }

  /** Restore the session on app start (token from storage → /me). Runs once. */
  function init(): Promise<void> {
    initPromise ??= (async () => {
      setUnauthorizedHandler(onSessionExpired)
      if (await tokenStorage.get()) {
        try {
          user.value = await accountService.me()
        } catch {
          await clearSession()
        }
      }
      ready.value = true
    })()
    return initPromise
  }

  async function startSession(result: AuthResult) {
    await tokenStorage.set(result.token)
    user.value = result.user
  }

  async function login(email: string, password: string) {
    await startSession(await authService.login(email, password))
  }

  /** Throws with code "consent_required" for a new person without consent. */
  async function loginWithGoogle(idToken: string, consent = false) {
    await startSession(await authService.google(idToken, consent))
  }

  /** Creates the account; the user must confirm their email before logging in. */
  async function register(input: RegisterInput) {
    const result = await authService.register(input)
    pendingConfirmationEmail.value = result.email
    return result
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      await clearSession()
    }
  }

  async function refresh() {
    user.value = await accountService.me()
  }

  function setUser(updated: User) {
    user.value = updated
  }

  async function clearSession() {
    await tokenStorage.clear()
    user.value = null
  }

  /** The API rejected the token (expired after 30 idle days, or revoked). */
  async function onSessionExpired() {
    const wasLoggedIn = isLoggedIn.value
    await clearSession()
    if (!wasLoggedIn) return

    const toast = await toastController.create({
      message: 'Your session expired. Please log in again.',
      duration: 3000,
      position: 'bottom',
    })
    await toast.present()
    // Imported lazily: the router itself imports this store.
    const { default: router } = await import('@/router')
    await router.replace({ name: 'login' })
  }

  return {
    user,
    ready,
    pendingConfirmationEmail,
    isLoggedIn,
    homePath,
    hasRole,
    switchRole,
    postLoginPath,
    init,
    login,
    loginWithGoogle,
    register,
    logout,
    refresh,
    setUser,
    clearSession,
  }
})
