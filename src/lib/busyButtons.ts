import { watch } from 'vue'
import { requestsInFlight } from './activity'

/**
 * Busy buttons, app-wide: when a button someone just tapped turns disabled while
 * the app is talking to the server, it shows DormLink's ring (the same mark as
 * DlLoader variant="ring") in place of its label, until the request is done or
 * the button is enabled again.
 *
 * Screens keep their usual `:disabled="busy"`; nothing to add per button. Only
 * the tapped button spins, even when one `busy` flag disables a whole list.
 * A button that already shows its own DlLoader is left alone.
 */

const RING =
  '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="dl-busy-svg">' +
  '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="3"/>' +
  '<path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'

/** How long after a tap a button may still turn busy (the request can start a moment later). */
const TAP_WINDOW_MS = 1500

let tapped: { el: HTMLElement; at: number } | null = null
const busy = new Set<HTMLElement>()

const isDisabled = (el: HTMLElement) => (el as HTMLElement & { disabled?: boolean }).disabled === true || el.hasAttribute('disabled')
const justTapped = (el: HTMLElement) => tapped?.el === el && performance.now() - tapped.at < TAP_WINDOW_MS

function markBusy(el: HTMLElement): void {
  if (busy.has(el) || !el.isConnected || el.querySelector('.dl-loader')) return
  const ring = document.createElement('span')
  ring.className = 'dl-busy-ring'
  ring.setAttribute('role', 'status')
  ring.setAttribute('aria-label', 'Working')
  ring.innerHTML = RING
  el.classList.add('dl-busy')
  el.setAttribute('aria-busy', 'true')
  el.appendChild(ring)
  busy.add(el)
}

function clearBusy(el: HTMLElement): void {
  el.classList.remove('dl-busy')
  el.removeAttribute('aria-busy')
  el.querySelectorAll(':scope > .dl-busy-ring').forEach((r) => r.remove())
  busy.delete(el)
}

function considerTapped(): void {
  if (tapped && justTapped(tapped.el) && isDisabled(tapped.el) && requestsInFlight.value > 0) markBusy(tapped.el)
}

/** Call once at start-up (main.ts). */
export function installBusyButtons(): void {
  document.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element | null)?.closest?.('ion-button') as HTMLElement | null
      if (button) tapped = { el: button, at: performance.now() }
    },
    true,
  )

  new MutationObserver((records) => {
    for (const record of records) {
      const el = record.target as HTMLElement
      if (el.tagName !== 'ION-BUTTON') continue
      if (!isDisabled(el)) clearBusy(el)
      else if (el === tapped?.el) considerTapped()
    }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['disabled'] })

  watch(requestsInFlight, (count) => {
    if (count === 0) [...busy].forEach(clearBusy)
    else considerTapped()
  })
}
