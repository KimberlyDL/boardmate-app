import { Preferences } from '@capacitor/preferences'
import { computed, ref } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'

const KEY = 'boardmate.theme'
const mode = ref<ThemeMode>('system')
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

function apply() {
  const dark = mode.value === 'dark' || (mode.value === 'system' && !!media?.matches)
  document.documentElement.classList.toggle('ion-palette-dark', dark)
}

/** Call once before mounting: restores the saved choice and follows the OS while on "system". */
export async function initTheme(): Promise<void> {
  const saved = (await Preferences.get({ key: KEY })).value
  if (saved === 'light' || saved === 'dark' || saved === 'system') mode.value = saved
  media?.addEventListener('change', apply)
  apply()
}

export function useTheme() {
  async function setMode(next: ThemeMode) {
    mode.value = next
    apply()
    await Preferences.set({ key: KEY, value: next })
  }

  const isDark = computed(() => mode.value === 'dark' || (mode.value === 'system' && !!media?.matches))

  return { mode, isDark, setMode }
}
