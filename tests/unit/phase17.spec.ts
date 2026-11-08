import { mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import OpenInAppBanner from '@/components/OpenInAppBanner.vue'
import { appPath } from '@/lib/appLinks'
import { openDocument } from '@/lib/documents'
import { locate, openFilePicker } from '@/lib/permissions'
import { useImageViewer } from '@/composables/useImageViewer'

const sheet = vi.hoisted(() => ({ choice: 'files' as string, alerts: [] as string[], confirm: true }))
vi.mock('@ionic/vue', async (original) => ({
  ...(await original<typeof import('@ionic/vue')>()),
  actionSheetController: {
    create: vi.fn(async ({ buttons }: { buttons: { text: string; handler?: () => void }[] }) => ({
      present: async () => buttons.find((b) => (sheet.choice === 'camera' ? b.text === 'Take a photo' : b.text === 'Choose a file'))?.handler?.(),
    })),
  },
  alertController: {
    create: vi.fn(async ({ header }: { header: string }) => {
      sheet.alerts.push(header)
      return { present: async () => undefined, onDidDismiss: async () => ({ role: sheet.confirm ? 'confirm' : 'cancel' }) }
    }),
  },
}))

const setUserAgent = (ua: string) => Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
const setPointer = (coarse: boolean) =>
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (q: string) => ({ matches: coarse && q.includes('coarse') }) })

beforeEach(() => {
  sheet.alerts = []
  sheet.confirm = true
  sheet.choice = 'files'
  for (const storage of [() => localStorage, () => sessionStorage]) {
    try {
      storage().clear()
    } catch {
      // ignore
    }
  }
})
afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('App Links', () => {
  test('sends website links to the same screen in the app, and ignores other sites', () => {
    expect(appPath('https://dormlink.vercel.app/reset-password?token=abc&email=a%40b.c')).toBe('/reset-password?token=abc&email=a%40b.c')
    expect(appPath('https://dormlink.vercel.app/listings/12')).toBe('/listings/12')
    expect(appPath('https://example.com/listings/12')).toBeNull()
    expect(appPath('not a link')).toBeNull()
  })
})

describe('Open in the app banner', () => {
  const mountBanner = async (path = '/listings/12') => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
    await router.push(path)
    return mount(OpenInAppBanner, { global: { plugins: [IonicVue, router] }, attachTo: document.body })
  }

  test('shows in an Android browser with a link that opens this page in the app, and can be dismissed', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130 Mobile')
    setPointer(true)
    const banner = await mountBanner()

    const open = banner.find('a.open')
    expect(open.attributes('href')).toBe(
      'intent://dormlink.vercel.app/listings/12#Intent;scheme=https;package=com.dormlink.app;S.browser_fallback_url=https%3A%2F%2Fdormlink.vercel.app%2Flistings%2F12;end',
    )
    await banner.find('button.close').trigger('click')
    expect(banner.find('.open-in-app').exists()).toBe(false)
  })

  test('shows once per visit: × until the next visit, Not for 7 days for a week, Open for a day', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130 Mobile')
    setPointer(true)
    // Node's own (empty) localStorage hides jsdom's here, so each storage is a plain in-memory one.
    const memory = () => {
      const items = new Map<string, string>()
      return {
        getItem: (k: string) => items.get(k) ?? null,
        setItem: (k: string, v: string) => void items.set(k, String(v)),
        removeItem: (k: string) => void items.delete(k),
        clear: () => items.clear(),
      }
    }
    vi.stubGlobal('localStorage', memory())
    vi.stubGlobal('sessionStorage', memory())
    const now = Date.now()
    const day = 86_400_000

    // A reload in the same tab is the same visit: not again.
    expect((await mountBanner()).find('.open-in-app').exists()).toBe(true)
    expect((await mountBanner()).find('.open-in-app').exists()).toBe(false)

    // A new visit (new tab): back, until "Not for 7 days".
    sessionStorage.clear()
    const banner = await mountBanner()
    await banner.find('button.snooze').trigger('click')
    expect(Number(localStorage.getItem('dormlink.openInAppHiddenUntil'))).toBeGreaterThanOrEqual(now + 7 * day)
    sessionStorage.clear()
    expect((await mountBanner()).find('.open-in-app').exists()).toBe(false)

    // Once the week is over it comes back; Open hides it for a day.
    localStorage.setItem('dormlink.openInAppHiddenUntil', String(now - 1))
    const again = await mountBanner()
    await again.find('a.open').trigger('click')
    const until = Number(localStorage.getItem('dormlink.openInAppHiddenUntil'))
    expect(until).toBeGreaterThanOrEqual(now + day)
    expect(until).toBeLessThan(now + 2 * day)
    vi.unstubAllGlobals()
  })

  test('never shows on a computer or an iPhone', async () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130')
    expect((await mountBanner()).find('.open-in-app').exists()).toBe(false)
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
    expect((await mountBanner()).find('.open-in-app').exists()).toBe(false)
  })
})

describe('permissions', () => {
  test('a computer opens the file picker straight away', async () => {
    setPointer(false)
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png' })
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined)

    await openFilePicker(input)

    expect(click).toHaveBeenCalledOnce()
    expect(input.hasAttribute('capture')).toBe(false)
  })

  test('a phone offers the camera for photos, opening it with the capture hint', async () => {
    setPointer(true)
    sheet.choice = 'camera'
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png' })
    let captured: string | null = null
    vi.spyOn(input, 'click').mockImplementation(() => void (captured = input.getAttribute('capture')))

    await openFilePicker(input)

    expect(captured).toBe('environment')
  })

  test('location in a browser says why first, and helps when it was blocked', async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 13.4, longitude: 121.2 } } as GeolocationPosition))
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
    const query = vi.fn(async () => ({ state: 'prompt' }))
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query } })

    expect(await locate()).toEqual({ lat: 13.4, lng: 121.2 })
    expect(sheet.alerts).toEqual(['Use your location?'])

    query.mockResolvedValueOnce({ state: 'denied' })
    expect(await locate()).toBeNull()
    expect(sheet.alerts).toContain('Location is blocked')
    expect(getCurrentPosition).toHaveBeenCalledOnce()
  })
})

describe('PDFs in the app', () => {
  test('a receipt opens in the viewer as a PDF with its file name', async () => {
    await openDocument(async () => ({ url: 'https://api.test/documents/receipts/41?signature=y', expires_in_minutes: 5, filename: 'receipt.pdf' }), 'Receipt')

    const viewer = useImageViewer()
    expect(viewer.isOpen.value).toBe(true)
    expect(viewer.images.value[0]).toEqual({ src: 'https://api.test/documents/receipts/41?signature=y', kind: 'pdf', alt: 'Receipt', filename: 'receipt.pdf' })
    viewer.close()
  })
})
