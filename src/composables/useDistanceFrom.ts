import { Preferences } from '@capacitor/preferences'
import { computed, ref } from 'vue'
import { listingService } from '@/services/listings'
import type { Campus } from '@/types/booking'

/** Where the Dorm Finder measures distance from. */
export type DistancePoint =
  | { kind: 'campus'; id: number; name: string; lat: number; lng: number }
  | { kind: 'me'; lat: number; lng: number }
  | { kind: 'point'; lat: number; lng: number }

const KEY = 'dormlink.distanceFrom'
const campuses = ref<Campus[]>([])
const point = ref<DistancePoint | null>(null)
let loaded: Promise<void> | null = null

const fromCampus = (c: Campus): DistancePoint => ({ kind: 'campus', id: c.id, name: c.name, lat: c.latitude, lng: c.longitude })

async function load() {
  try {
    campuses.value = await listingService.campuses()
  } catch {
    campuses.value = []
  }
  let saved: DistancePoint | null = null
  try {
    saved = JSON.parse((await Preferences.get({ key: KEY })).value ?? 'null')
  } catch {
    saved = null
  }
  if (saved?.kind === 'campus') {
    // A campus the admin renamed, moved or removed: use the list as it is now.
    const id = saved.id
    const campus = campuses.value.find((c) => c.id === id)
    saved = campus ? fromCampus(campus) : null
  }
  const fallback = campuses.value[0]
  point.value = saved ?? (fallback ? fromCampus(fallback) : null)
}

async function choose(next: DistancePoint | null) {
  point.value = next
  await Preferences.set({ key: KEY, value: JSON.stringify(next) })
}

/** The phone's position, or null when it cannot or will not share it. */
function locate(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}

/**
 * The Finder's distance point, shared by the map and the list and remembered
 * on this device. Defaults to the admin's default campus.
 */
export function useDistanceFrom() {
  loaded ??= load()
  const label = computed(() => {
    const p = point.value
    if (!p) return 'Not set'
    if (p.kind === 'campus') return p.name
    return p.kind === 'me' ? 'My location' : 'Chosen point'
  })
  return {
    ready: loaded,
    campuses,
    point,
    label,
    near: computed(() => (point.value ? { lat: point.value.lat, lng: point.value.lng } : null)),
    chooseCampus: (c: Campus) => choose(fromCampus(c)),
    choosePoint: (lat: number, lng: number) => choose({ kind: 'point', lat, lng }),
    /** Uses the phone's location; false when it is not available. */
    async chooseMyLocation(): Promise<boolean> {
      const here = await locate()
      if (!here) return false
      await choose({ kind: 'me', ...here })
      return true
    },
  }
}
