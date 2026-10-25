import { ref } from 'vue'

/** How many API requests are in flight; drives the thin progress bar at the top (components/GlobalProgress.vue). */
export const requestsInFlight = ref(0)

export function requestStarted(): void {
  requestsInFlight.value++
}

export function requestFinished(): void {
  requestsInFlight.value = Math.max(0, requestsInFlight.value - 1)
}
