import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ReportsPage from '@/views/account/ReportsPage.vue'
import { reportService } from '@/services/reports'

vi.mock('@/services/reports', async (original) => ({
  ...(await original<typeof import('@/services/reports')>()),
  reportService: { list: vi.fn(), link: vi.fn(), preview: vi.fn() },
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
const opened = vi.hoisted(() => ({
  downloadFile: vi.fn(async (get: () => Promise<unknown>) => void (await get())),
  openDocument: vi.fn(async (get: () => Promise<unknown>) => void (await get())),
}))
vi.mock('@/lib/documents', () => opened)
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), onIonViewWillEnter: (cb: () => void) => cb() }))

const page = () => document.body

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button, .table-preview .get')].find((b) => b.textContent?.trim() === label)
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
  vi.mocked(reportService.link).mockResolvedValue({ url: 'https://example.test/report.xlsx', filename: 'x.xlsx', expires_in_minutes: 10 })
  vi.mocked(reportService.preview).mockResolvedValue({
    title: 'Collections',
    subtitle: 'All properties (2) · Oct 1, 2026 – Oct 31, 2026',
    headers: ['Date paid', 'Payer', 'Amount (PHP)'],
    rows: [['2026-10-05', 'Kim', '2,000.00']],
    total: 312,
    money_columns: [2],
  })
})
afterEach(() => {
  document.body.innerHTML = ''
})

async function pick(format: string) {
  ([...page().querySelectorAll('.format')].find((b) => b.textContent?.includes(format)) as HTMLElement).click()
  await flushPromises()
}

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
    expect(reportService.link).toHaveBeenLastCalledWith('collections', { propertyId: null, from: null, to: null }, 'xlsx')
    expect(opened.downloadFile).toHaveBeenCalledTimes(1)

    await openReport('Collections')
    await type('From', '2026-10-01')
    await press('Download')
    expect(toast.error).toHaveBeenCalledWith('Choose both dates, or neither.')
    await type('To', '2026-10-15')
    await press('Download')
    expect(reportService.link).toHaveBeenLastCalledWith('collections', { propertyId: null, from: '2026-10-01', to: '2026-10-15' }, 'xlsx')
  })

  test('a report for one property needs no choice and no dates', async () => {
    await openReport('Occupancy')
    expect(page().textContent).toContain('As of today.')
    await press('Download')
    expect(reportService.link).toHaveBeenCalledWith('occupancy', { propertyId: 3, from: null, to: null }, 'xlsx')
  })

  test('downloads the file type picked: Excel by default, PDF or CSV', async () => {
    await openReport('Occupancy')
    await pick('PDF')
    await press('Download')
    expect(reportService.link).toHaveBeenLastCalledWith('occupancy', { propertyId: 3, from: null, to: null }, 'pdf')
    await pick('CSV')
    await press('Download')
    expect(reportService.link).toHaveBeenLastCalledWith('occupancy', { propertyId: 3, from: null, to: null }, 'csv')
  })

  test('previews Excel or CSV as a table over the page, and downloads from there', async () => {
    await openReport('Collections')
    await press('Preview')

    expect(reportService.preview).toHaveBeenCalledWith('collections', { propertyId: null, from: null, to: null })
    const sheet = page().querySelector('.table-preview')!
    expect(sheet.textContent).toContain('All properties (2) · Oct 1, 2026 – Oct 31, 2026')
    expect(sheet.textContent).toContain('Showing the first 1 row of 312 rows. The file has all of them.')
    expect([...sheet.querySelectorAll('td')].map((td) => [td.textContent, td.classList.contains('money')])).toEqual([
      ['2026-10-05', false],
      ['Kim', false],
      ['2,000.00', true],
    ])

    await press('CSV')
    expect(reportService.link).toHaveBeenLastCalledWith('collections', { propertyId: null, from: null, to: null }, 'csv')
    ;(sheet.querySelector('.close') as HTMLElement).click()
    await flushPromises()
    expect(page().querySelector('.table-preview')).toBeNull()
  })

  test('a PDF preview is the real file, in the viewer', async () => {
    await openReport('Collections')
    await pick('PDF')
    await press('Preview')

    expect(opened.openDocument).toHaveBeenCalledWith(expect.any(Function), 'Collections')
    expect(reportService.link).toHaveBeenLastCalledWith('collections', { propertyId: null, from: null, to: null }, 'pdf')
    expect(reportService.preview).not.toHaveBeenCalled()
  })
})
