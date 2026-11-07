import { actionSheetController, alertController } from '@ionic/vue'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { Preferences } from '@capacitor/preferences'
import { AndroidSettings, NativeSettings } from 'capacitor-native-settings'

/**
 * Asking for location and camera the friendly way (Phase 17.2): a short
 * DormLink note first says why, then the phone's own question. When it was
 * turned off before, the app offers "Open settings" (Android) or says where
 * to turn it on (browsers). Nothing is ever asked without a tap.
 */

export interface LatLng {
  lat: number
  lng: number
}

const native = () => Capacitor.isNativePlatform()

async function ask(header: string, message: string, action: string): Promise<boolean> {
  const alert = await alertController.create({
    header,
    message,
    buttons: [
      { text: 'Not now', role: 'cancel' },
      { text: action, role: 'confirm' },
    ],
  })
  await alert.present()
  return (await alert.onDidDismiss()).role === 'confirm'
}

/** Location or camera is off for DormLink: open its settings page (app), or say where to turn it on (browser). */
async function turnedOff(what: 'Location'): Promise<void> {
  if (native()) {
    const open = await ask(
      `${what} is off for DormLink`,
      `To use it, allow ${what.toLowerCase()} for DormLink in your phone's settings (Permissions).`,
      'Open settings',
    )
    if (open) await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails }).catch(() => undefined)
    return
  }
  const alert = await alertController.create({
    header: `${what} is blocked`,
    message: `Your browser blocked ${what.toLowerCase()} for this site. Tap the lock or settings icon next to the address bar, allow ${what.toLowerCase()}, then try again.`,
    buttons: ['OK'],
  })
  await alert.present()
  await alert.onDidDismiss()
}

const LOCATION_WHY = 'DormLink uses your location only to show places near you and how far they are. It is not saved or shared.'

/** The device's position after asking nicely, or null (not allowed, turned off, or no fix). */
export async function locate(): Promise<LatLng | null> {
  return native() ? locateInApp() : locateInBrowser()
}

async function locateInApp(): Promise<LatLng | null> {
  try {
    let state = (await Geolocation.checkPermissions()).location
    if (state === 'denied') {
      await turnedOff('Location')
      return null
    }
    if (state !== 'granted') {
      if (!(await ask('Use your location?', LOCATION_WHY, 'Continue'))) return null
      state = (await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] })).location
      if (state !== 'granted') {
        const coarse = (await Geolocation.checkPermissions()).coarseLocation
        if (coarse !== 'granted') return null
      }
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  } catch {
    // Location services (GPS) switched off for the whole phone, or no fix in time.
    return null
  }
}

async function locateInBrowser(): Promise<LatLng | null> {
  if (!navigator.geolocation) return null
  const state = await navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((p) => p.state).catch(() => 'prompt')
  if (state === 'denied') {
    await turnedOff('Location')
    return null
  }
  if (state !== 'granted' && !(await ask('Use your location?', LOCATION_WHY, 'Continue'))) return null
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}

const CAMERA_EXPLAINED = 'dormlink.cameraExplained'

/**
 * Open a file input: on a phone, first offer "Take a photo" or "Choose a file"
 * (photo uploads only); on a computer, open the file picker straight away.
 * The camera is explained once before the phone first asks for it.
 */
export async function openFilePicker(input: HTMLInputElement | null | undefined): Promise<void> {
  if (!input) return
  const photos = /image/.test(input.accept)
  const touch = native() || window.matchMedia?.('(pointer: coarse)').matches
  if (!photos || !touch) return input.click()

  const choice = await new Promise<'camera' | 'files' | null>((resolve) => {
    void actionSheetController
      .create({
        header: 'Add a photo',
        buttons: [
          { text: 'Take a photo', handler: () => resolve('camera') },
          { text: 'Choose a file', handler: () => resolve('files') },
          { text: 'Cancel', role: 'cancel', handler: () => resolve(null) },
        ],
      })
      .then((sheet) => sheet.present())
  })
  if (!choice) return
  if (choice === 'files') return input.click()

  if (native()) {
    const seen = (await Preferences.get({ key: CAMERA_EXPLAINED }).catch(() => ({ value: null }))).value
    if (!seen) {
      const go = await ask(
        'Use the camera?',
        'DormLink opens the camera only to take the photo you add here. If it does not open, allow Camera for DormLink in your phone settings.',
        'Continue',
      )
      await Preferences.set({ key: CAMERA_EXPLAINED, value: '1' }).catch(() => undefined)
      if (!go) return
    }
  }
  input.setAttribute('capture', 'environment')
  input.click()
  // Back to a normal picker for next time.
  setTimeout(() => input.removeAttribute('capture'), 1000)
}

