import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ReportsPage from '@/views/account/ReportsPage.vue'
import { reportService } from '@/services/reports'

vi.mock('@/services/reports', () => ({ reportService: { list: vi.fn(), link: vi.fn() } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
const opened = vi.hoisted(() => ({ openDocument: vi.fn(async (get: () => Promise<unknown>) => void (await get())) }))
vi.mock('@/lib/documents', () => opened)
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), onIonViewWillEnter: (cb: () => void) => cb() }))

const page = () => document.body

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === label)
  if (!el) throw new Error(`No button "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

async function type(label: string, value: string) {
  const input = [...page().querySelectorAll('ion-input')].find((i) => i.querySelector('.label-text')?.textContent === label)?.querySelector('input')
  if (!input) throw new Error(`No input "${label}"`)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

const two = [
  { id: 3, name: 'Santos House' },
  { id: 4, name: 'Annex' },
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(reportService.list).mockResolvedValue([
    { key: 'collections', label: 'Collections', description: 'Every confirmed payment.', uses_dates: true, properties: two },
    { key: 'occupancy', label: 'Occupancy', description: 'Every place today.', uses_dates: false, properties: [two[0]] },
  ])
  vi.mocked(reportService.link).mockResolvedValue({ url: 'https://example.test/report.csv', filename: 'x.csv', expires_in_minutes: 10 })
})
afterEach(() => {
  document.body.innerHTML = ''
})

async function openReport(label: string) {
  mount(ReportsPage, { global: { plugins: [IonicVue], stubs: { IonBackButton: true } }, attachTo: document.body })
  await flushPromises()
  const item = [...page().querySelectorAll('ion-item')].find((i) => i.textContent?.includes(label))!
  ;(item as HTMLElement).click()
  await flushPromises()
}

describe('ReportsPage', () => {
  test('downloads a dated report for all properties, or a period', async () => {
    await openReport('Collections')
    expect(page().textContent).toContain('Leave the dates empty for this month.')

    await press('Download')
    expect(reportService.link).toHaveBeenLastCalledWith('collections', null, null, null)
    expect(opened.openDocument).toHaveBeenCalledTimes(1)

    await openReport('Collections')
    await type('From', '2026-10-01')
    await press('Download')
    expect(toast.error).toHaveBeenCalledWith('Choose both dates, or neither.')
    await type('To', '2026-10-15')
    await press('Download')
    expect(reportService.link).toHaveBeenLastCalledWith('collections', null, '2026-10-01', '2026-10-15')
  })

  test('a report for one property needs no choice and no dates', async () => {
    await openReport('Occupancy')
    expect(page().textContent).toContain('As of today.')
    await press('Download')
    expect(reportService.link).toHaveBeenCalledWith('occupancy', 3, null, null)
  })
})
