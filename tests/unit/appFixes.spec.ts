import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Fixes for the Android app (2026-11-08): location when the phone's Location is
 * off or slow, the camera for "Take a photo", big photos shrunk before upload,
 * and email confirmation links that land on the website (so the app can open them).
 */

const ui = vi.hoisted(() => ({ alerts: [] as string[], confirm: true, choice: 'camera' }))
vi.mock('@ionic/vue', async (original) => ({
  ...(await original<typeof import('@ionic/vue')>()),
  actionSheetController: {
    create: vi.fn(async ({ buttons }: { buttons: { text: string; handler?: () => void }[] }) => ({
      present: async () => buttons.find((b) => b.text === (ui.choice === 'camera' ? 'Take a photo' : 'Choose a file'))?.handler?.(),
    })),
  },
  alertController: {
    create: vi.fn(async ({ header }: { header: string }) => {
      ui.alerts.push(header)
      return { present: async () => undefined, onDidDismiss: async () => ({ role: ui.confirm ? 'confirm' : 'cancel' }) }
    }),
  },
}))
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}))
const geo = vi.hoisted(() => ({ checkPermissions: vi.fn(), requestPermissions: vi.fn(), getCurrentPosition: vi.fn() }))
vi.mock('@capacitor/geolocation', () => ({ Geolocation: geo }))
const settings = vi.hoisted(() => ({ openAndroid: vi.fn(async () => undefined) }))
vi.mock('capacitor-native-settings', () => ({
  NativeSettings: settings,
  AndroidSettings: { ApplicationDetails: 'application_details', Location: 'location' },
}))
vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(async () => ({ value: '1' })), set: vi.fn(async () => undefined) } }))
const http = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/services/api', () => ({ api: http }))
const nav = vi.hoisted(() => ({ replace: vi.fn(), route: { params: {} as Record<string, string>, query: {} as Record<string, string> } }))
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ replace: nav.replace }),
  useRoute: () => nav.route,
}))

import { locate, openFilePicker } from '@/lib/permissions'
import { shrinkPhotosIn, SHRINK_ABOVE_BYTES } from '@/lib/images'
import ConfirmEmailPage from '@/views/auth/ConfirmEmailPage.vue'

const fix = { coords: { latitude: 13.41, longitude: 121.18 } }
const fail = (code: string) => Object.assign(new Error(code), { code })

beforeEach(() => {
  ui.alerts = []
  ui.confirm = true
  vi.clearAllMocks()
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('location in the Android app', () => {
  test("the phone's Location being off offers its settings instead of failing silently", async () => {
    geo.checkPermissions.mockRejectedValue(fail('OS-PLUG-GLOC-0007'))

    expect(await locate()).toBeNull()
    expect(ui.alerts).toEqual(['Location is off'])
    expect(settings.openAndroid).toHaveBeenCalledWith({ option: 'location' })
  })

  test('explains first, then asks, and tries a rough fix when the precise one is slow', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' })
    geo.requestPermissions.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' })
    geo.getCurrentPosition.mockRejectedValueOnce(fail('OS-PLUG-GLOC-0010')).mockResolvedValueOnce(fix)

    expect(await locate()).toEqual({ lat: 13.41, lng: 121.18 })
    expect(ui.alerts).toEqual(['Use your location?'])
    expect(geo.getCurrentPosition.mock.calls.map(([o]) => o.enableHighAccuracy)).toEqual([true, false])
  })

  test('approximate location is enough', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'granted' })
    geo.getCurrentPosition.mockResolvedValue(fix)

    expect(await locate()).toEqual({ lat: 13.41, lng: 121.18 })
    expect(geo.getCurrentPosition).toHaveBeenCalledWith(expect.objectContaining({ enableHighAccuracy: false }))
  })

  test('turned off for DormLink for good: Open settings opens the app page', async () => {
    geo.checkPermissions.mockResolvedValue({ location: 'denied', coarseLocation: 'denied' })

    expect(await locate()).toBeNull()
    expect(ui.alerts).toEqual(['Location is off for DormLink'])
    expect(settings.openAndroid).toHaveBeenCalledWith({ option: 'application_details' })
  })
})

describe('Take a photo', () => {
  test('opens the camera by accepting any image for that tap, then puts the list back', async () => {
    vi.useFakeTimers()
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/jpeg,image/png,application/pdf' })
    let seen = { accept: '', capture: null as string | null }
    vi.spyOn(input, 'click').mockImplementation(() => void (seen = { accept: input.accept, capture: input.getAttribute('capture') }))

    await openFilePicker(input)
    expect(seen).toEqual({ accept: 'image/*', capture: 'environment' })

    vi.advanceTimersByTime(1000)
    expect(input.accept).toBe('image/jpeg,image/png,application/pdf')
    expect(input.hasAttribute('capture')).toBe(false)
    vi.useRealTimers()
  })
})

describe('big photos before upload', () => {
  test('small photos and PDFs go as they are', async () => {
    const form = new FormData()
    form.append('proof', new File(['x'], 'proof.pdf', { type: 'application/pdf' }))
    form.append('amount_centavos', '150000')
    expect(await shrinkPhotosIn(form)).toBe(form)
  })

  test('a big camera photo is sent as a smaller JPEG, other fields unchanged', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4000, height: 3000, close: () => undefined })))
    const drawn: number[][] = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: () => undefined,
      drawImage: (_b: unknown, _x: number, _y: number, w: number, h: number) => drawn.push([w, h]),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) => done(new Blob(['small'], { type: 'image/jpeg' })))

    const form = new FormData()
    form.append('note', 'Leak')
    form.append('photo', new File([new Uint8Array(SHRINK_ABOVE_BYTES + 1)], 'IMG_2041.png', { type: 'image/png' }))
    const out = await shrinkPhotosIn(form)

    const photo = out.get('photo') as File
    expect(out.get('note')).toBe('Leak')
    expect(photo.name).toBe('IMG_2041.jpg')
    expect(photo.type).toBe('image/jpeg')
    expect(drawn).toEqual([[2560, 1920]])
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
})

describe('email confirmation link', () => {
  test('sends the link path and signature to the API, then shows the result', async () => {
    nav.route = { params: { id: '12', hash: 'abc' }, query: { expires: '1790000000', signature: 'f00d' } }
    http.get.mockResolvedValue({ data: { data: { status: 'success' } } })

    mount(ConfirmEmailPage, { props: { kind: 'verify' }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/auth/email/verify/12/abc?expires=1790000000&signature=f00d')
    expect(nav.replace).toHaveBeenCalledWith({ path: '/email-verified', query: { status: 'success' } })
  })

  test('a new email address uses its own check, and a lost connection offers Try again', async () => {
    nav.route = { params: { id: '12', hash: 'abc' }, query: { expires: '1', signature: 's' } }
    http.get.mockRejectedValueOnce(new Error('Network Error'))

    mount(ConfirmEmailPage, { props: { kind: 'change' }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/auth/email-change/verify/12/abc?expires=1&signature=s')
    expect(document.body.textContent).toContain('Try again')
    expect(nav.replace).not.toHaveBeenCalled()
  })
})
