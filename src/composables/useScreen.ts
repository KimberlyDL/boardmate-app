import { computed, ref } from 'vue'
import { BREAKPOINTS, screenSizeOf, type ScreenSize } from '@/lib/layout'

/**
 * The screen size class, kept up to date when the window is resized or a tablet turns (W1).
 * Prefer CSS media queries for looks; use this only where the markup itself changes
 * (e.g. the sidebar instead of bottom tabs). One listener is shared by every caller.
 */
const size = ref<ScreenSize>('phone')
let started = false

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  size.value = screenSizeOf(window.innerWidth)
  if (!window.matchMedia) return
  for (const width of Object.values(BREAKPOINTS)) {
    window.matchMedia(`(min-width: ${width}px)`).addEventListener?.('change', () => {
      size.value = screenSizeOf(window.innerWidth)
    })
  }
}

export function useScreen() {
  start()
  return {
    size,
    isPhone: computed(() => size.value === 'phone'),
    isDesktop: computed(() => size.value === 'desktop'),
  }
}
