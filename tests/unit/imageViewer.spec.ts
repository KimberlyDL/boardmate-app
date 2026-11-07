import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import ImageViewer from '@/components/ImageViewer.vue'
import { isPdfUrl, useImageViewer } from '@/composables/useImageViewer'

vi.mock('@/components/PdfPages.vue', () => ({ default: { props: ['src', 'zoom'], template: '<div class="pdf-stub" :data-src="src" :data-zoom="zoom" />' } }))

const viewer = useImageViewer()
const dialog = () => document.querySelector('[role="dialog"]')
const key = (k: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k }))
const button = (label: string) => document.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement

const mounted: VueWrapper[] = []
const mountViewer = () => {
  const w = mount(ImageViewer, { attachTo: document.body })
  mounted.push(w)
  return w
}

afterEach(() => {
  viewer.close()
  mounted.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ImageViewer', () => {
  test('opens on the chosen photo on the same page, moves between photos and closes', async () => {
    mountViewer()
    viewer.open(['/a.webp', '/b.webp', '/c.webp'], 1)
    await flushPromises()

    expect(dialog()?.getAttribute('aria-label')).toBe('Photo 2 of 3')
    expect(document.querySelector('.dl-viewer img')?.getAttribute('src')).toBe('/b.webp')

    button('Next photo').click()
    await flushPromises()
    expect(document.querySelector('.dl-viewer img')?.getAttribute('src')).toBe('/c.webp')

    key('ArrowRight')
    await flushPromises()
    expect(document.querySelector('.count')?.textContent).toBe('1 / 3')

    key('Escape')
    await flushPromises()
    expect(dialog()).toBeNull()
  })

  test('closes on the phone back button before the page goes back', async () => {
    mountViewer()
    viewer.open(['/a.webp'])
    await flushPromises()

    const next = vi.fn()
    document.dispatchEvent(
      new CustomEvent('ionBackButton', { detail: { register: (_p: number, handler: (n: () => void) => void) => handler(next) } }),
    )
    await flushPromises()
    expect(dialog()).toBeNull()
    expect(next).not.toHaveBeenCalled()
  })

  test('draws a PDF in the app with zoom and download, and offers to open a file it cannot draw', async () => {
    mountViewer()
    viewer.open([{ src: 'https://api.test/documents/receipts/41?signature=y', kind: 'pdf', filename: 'receipt.pdf' }])
    await flushPromises()

    const pages = document.querySelector('.pdf-stub') as HTMLElement
    expect(pages.dataset.src).toBe('https://api.test/documents/receipts/41?signature=y')
    expect(document.querySelector('.dl-viewer img')).toBeNull()
    expect(document.querySelector('a[aria-label="Download"]')?.getAttribute('href')).toBe('https://api.test/documents/receipts/41?signature=y')
    button('Zoom in').click()
    await flushPromises()
    expect((document.querySelector('.pdf-stub') as HTMLElement).dataset.zoom).toBe('1.5')

    viewer.open(['/broken.webp'])
    await flushPromises()
    document.querySelector('.dl-viewer img')!.dispatchEvent(new Event('error'))
    await flushPromises()
    expect(document.body.textContent).toContain('This file can’t be shown here.')
  })
})

describe('isPdfUrl', () => {
  test('spots PDFs in plain and signed links', () => {
    expect(isPdfUrl('https://x.test/files/id%2Fabc.pdf?expires=1')).toBe(true)
    expect(isPdfUrl('/storage/doc.PDF')).toBe(true)
    expect(isPdfUrl('/storage/photo.webp?v=pdf')).toBe(false)
  })
})
