import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import BillingSection from '@/components/billing/BillingSection.vue'
import RecordPaymentModal from '@/components/billing/RecordPaymentModal.vue'
import ReportPaymentModal from '@/components/billing/ReportPaymentModal.vue'
import MyBillsPage from '@/views/boarder/MyBillsPage.vue'
import { billStatus } from '@/lib/billing'
import { billingService } from '@/services/billing'
import { tenancyService } from '@/services/tenancies'
import type { Bill, MyPlace, Payment } from '@/types/billing'
import type { Property } from '@/types/property'

vi.mock('@/services/billing', () => ({
  billingService: {
    bills: vi.fn(), payments: vi.fn(), balance: vi.fn(), record: vi.fn(), confirm: vi.fn(), reject: vi.fn(), reverse: vi.fn(),
    myBills: vi.fn(), myPayments: vi.fn(), report: vi.fn(), myStatementLink: vi.fn(), receiptLink: vi.fn(),
  },
}))
vi.mock('@/services/tenancies', () => ({ tenancyService: { list: vi.fn() } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
const prompt = vi.hoisted(() => ({ confirm: vi.fn(), reason: vi.fn() }))
vi.mock('@/composables/usePrompt', () => ({ usePrompt: () => prompt }))
// Entering a tab is the router's job; run the callback straight away.
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), onIonViewWillEnter: (cb: () => void) => cb() }))

// jsdom has no scrolling; Ionic's scrollable segment calls it.
Element.prototype.scrollTo = () => {}

const page = () => document.body
const text = () => page().textContent ?? ''
const buttons = () => [...page().querySelectorAll('ion-button')].map((b) => b.textContent?.trim())

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === label)
  if (!el) throw new Error(`No button "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

/** Switch the segment the way Ionic reports a tap. */
async function showTab(value: string) {
  page().querySelector('ion-segment')!.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }))
  await flushPromises()
}

/** Kim's October bill: ₱1,800 rent, ₱1,500 paid, overdue. */
const october = {
  id: 21,
  number: 'BILL-2026-000012',
  kind: 'periodic',
  kind_label: 'Monthly bill',
  property_id: 3,
  payer: { id: 5, name: 'Kim Santos' },
  room_label: '203',
  tenancy_id: 8,
  period_start_on: '2026-10-26',
  period_end_on: '2026-11-25',
  issued_on: '2026-10-25',
  due_on: '2026-10-25',
  total_centavos: 180000,
  balance_centavos: 30000,
  status: 'partly_paid',
  is_overdue: true,
  lines: [{ id: 1, kind: 'rent', kind_label: 'Rent', description: 'Rent, Oct 26 – Nov 25, 2026', amount_centavos: 180000, reason: null, adjusts_line_id: null }],
} as Bill

const reported = {
  id: 40,
  property_id: 3,
  payer: { id: 5, name: 'Kim Santos' },
  amount_centavos: 30000,
  method: 'e_wallet',
  method_label: 'E-wallet (GCash, Maya)',
  reference: 'GC-777',
  proof_url: 'https://api.test/files/proof.png',
  paid_on: '2026-10-26',
  note: null,
  status: 'pending',
  status_label: 'Waiting for confirmation',
  receipt_number: null,
  submitted_by: 'Kim Santos',
  reported_by_payer: true,
  decided_by: null,
  decided_at: null,
  reject_reason: null,
  reference_reused: true,
  created_at: null,
} as Payment

const confirmed = { ...reported, id: 41, status: 'confirmed', status_label: 'Confirmed', receipt_number: 'OR-2026-000001', reported_by_payer: false, submitted_by: 'Carla Cruz', reference_reused: false } as Payment

const property = (abilities: string[]) => ({ id: 3, name: 'Santos House', abilities }) as unknown as Property
const OWNER = ['view', 'record_payments', 'confirm_payment_proofs', 'edit_issued_bills']
const COLLECTOR = ['view', 'record_payments', 'confirm_payment_proofs']

function mountSection(abilities: string[]) {
  return mount(BillingSection, { props: { property: property(abilities) }, global: { plugins: [IonicVue] }, attachTo: document.body })
}

beforeEach(() => {
  // Pages carry the notification bell, which reads the notifications store.
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(billingService.bills).mockResolvedValue({
    items: [october],
    meta: { current_page: 1, last_page: 1, total: 1, unpaid_count: 1, unpaid_total_centavos: 30000 },
  })
  vi.mocked(tenancyService.list).mockResolvedValue({
    items: [{ id: 8, tenant: { id: 5, name: 'Kim Santos' }, room: { label: '203' }, unit: { label: 'Bed 1' } }] as never,
    meta: { current_page: 1, last_page: 1, total: 1 },
  })
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('billStatus', () => {
  test('names what is left to do on a bill', () => {
    expect(billStatus({ status: 'paid', is_overdue: false }).label).toBe('Paid')
    expect(billStatus({ status: 'unpaid', is_overdue: false }).label).toBe('Unpaid')
    expect(billStatus({ status: 'unpaid', is_overdue: true }).label).toBe('Overdue')
    expect(billStatus({ status: 'partly_paid', is_overdue: true }).label).toBe('Partly paid · overdue')
  })
})

describe('BillingSection', () => {
  test('opens on payments to confirm, flags a reused reference, and confirms one', async () => {
    vi.mocked(billingService.payments).mockResolvedValue({ items: [reported], meta: { current_page: 1, last_page: 1, total: 1, pending_count: 1 } })
    vi.mocked(billingService.confirm).mockResolvedValue({ payment: confirmed, message: 'Payment confirmed. Receipt OR-2026-000001.' })
    prompt.confirm.mockResolvedValue(true)
    mountSection(COLLECTOR)
    await flushPromises()

    expect(text()).toContain('₱300.00')
    expect(text()).toContain('1 payment to confirm')
    expect(text()).toContain('Ref GC-777')
    expect(text()).toContain('Used before')
    expect(text()).toContain('See proof')
    expect(buttons()).toContain('Record a payment')
    expect(buttons()).not.toContain('Add a charge') // Collectors record and confirm, but do not charge

    await press('Confirm')
    expect(prompt.confirm.mock.calls[0][1]).toContain('was used on another payment before')
    expect(billingService.confirm).toHaveBeenCalledWith(40)
    expect(toast.success).toHaveBeenCalledWith('Payment confirmed. Receipt OR-2026-000001.')
  })

  test('rejects with the reason the boarder will see', async () => {
    vi.mocked(billingService.payments).mockResolvedValue({ items: [reported], meta: { current_page: 1, last_page: 1, total: 1, pending_count: 1 } })
    vi.mocked(billingService.reject).mockResolvedValue({ payment: reported, message: 'Payment rejected.' })
    prompt.reason.mockResolvedValue('Same screenshot as before')
    mountSection(COLLECTOR)
    await flushPromises()

    await press('Reject')
    expect(billingService.reject).toHaveBeenCalledWith(40, 'Same screenshot as before')
  })

  test('shows unpaid bills with what is left when nothing waits for confirmation', async () => {
    vi.mocked(billingService.payments).mockResolvedValue({ items: [], meta: { current_page: 1, last_page: 1, total: 0, pending_count: 0 } })
    mountSection(OWNER)
    await flushPromises()

    expect(billingService.bills).toHaveBeenCalledWith(3, { status: 'unpaid', page: 1 })
    expect(text()).toContain('BILL-2026-000012')
    expect(text()).toContain('₱300.00 left')
    expect(text()).toContain('Partly paid · overdue')
    expect(buttons()).toContain('Add a charge')
  })

  test('only the owner or a Manager can reverse a confirmed payment', async () => {
    vi.mocked(billingService.payments).mockResolvedValue({ items: [confirmed], meta: { current_page: 1, last_page: 1, total: 1, pending_count: 0 } })
    vi.mocked(billingService.reverse).mockResolvedValue({ payment: confirmed, message: 'Payment reversed.' })
    prompt.reason.mockResolvedValue('Wrong boarder')

    const collector = mountSection(COLLECTOR)
    await flushPromises()
    await showTab('payments')
    expect(text()).toContain('Recorded by Carla Cruz')
    expect(buttons()).not.toContain('Reverse')
    collector.unmount()
    document.body.innerHTML = ''

    mountSection(OWNER)
    await flushPromises()
    await showTab('payments')
    await press('Reverse')
    expect(billingService.reverse).toHaveBeenCalledWith(41, 'Wrong boarder')
  })
})

describe('RecordPaymentModal', () => {
  async function openFor(wrapper: VueWrapper) {
    await wrapper.setProps({ open: true })
    await flushPromises()
  }

  test('shows what the payer owes, fills it in, and records the payment', async () => {
    vi.mocked(billingService.balance).mockResolvedValue({ owed_centavos: 30000, credit_centavos: 0, bills: [october] })
    vi.mocked(billingService.record).mockResolvedValue({ payment: confirmed, message: 'Payment recorded. Receipt OR-2026-000001.' })
    const payers = [{ id: 5, name: 'Kim Santos', tenancy_id: 8, room_label: '203', unit_label: 'Bed 1' }]
    const wrapper = mount(RecordPaymentModal, {
      props: { open: false, propertyId: 3, payers, presetPayerId: 5 },
      global: { plugins: [IonicVue] },
      attachTo: document.body,
    })
    await openFor(wrapper)

    expect(billingService.balance).toHaveBeenCalledWith(3, 5)
    expect(text()).toContain('Owes now')
    expect(text()).toContain('BILL-2026-000012 · due Oct 25 (overdue)')

    await press('Record payment')
    expect(billingService.record).toHaveBeenCalledWith(3, 5, expect.objectContaining({ amount_centavos: 30000, method: 'cash' }))
    expect(wrapper.emitted('done')?.[0]).toEqual(['Payment recorded. Receipt OR-2026-000001.'])
  })
})

const santos: MyPlace = {
  property_id: 3,
  property_name: 'Santos House',
  owed_centavos: 30000,
  credit_centavos: 0,
  pay_to: { gcash_name: 'Ana Santos', gcash_number: '0917 123 4567', bank_name: null, bank_account_name: null, bank_account_number: null },
}

describe('MyBillsPage', () => {
  test('shows what the boarder owes, how to pay, and the bills left to pay', async () => {
    vi.mocked(billingService.myBills).mockResolvedValue({
      items: [{ ...october, property_name: 'Santos House' }],
      meta: { current_page: 1, last_page: 1, total: 1, places: [santos] },
    })
    mount(MyBillsPage, { global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(billingService.myBills).toHaveBeenCalledWith({ status: 'unpaid', page: 1 })
    const t = text()
    expect(t).toContain('You owe ₱300.00')
    expect(t).toContain('GCash 0917 123 4567 (Ana Santos)')
    expect(t).toContain('BILL-2026-000012 · Santos House')
    expect(t).toContain('₱300.00 to pay')
    expect(buttons()).toContain('I paid: tell the owner')
  })

  test('lists payments with their receipt or why they were not confirmed', async () => {
    vi.mocked(billingService.myBills).mockResolvedValue({ items: [], meta: { current_page: 1, last_page: 1, total: 0, places: [santos] } })
    vi.mocked(billingService.myPayments).mockResolvedValue({
      items: [
        { ...confirmed, property_name: 'Santos House' },
        { ...reported, id: 42, status: 'rejected', status_label: 'Rejected', reject_reason: 'Same screenshot as before', property_name: 'Santos House' },
      ],
      meta: { current_page: 1, last_page: 1, total: 2 },
    })
    mount(MyBillsPage, { global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()
    await showTab('payments')

    expect(text()).toContain('Receipt OR-2026-000001')
    expect(text()).toContain('Not confirmed: Same screenshot as before')
  })
})

describe('ReportPaymentModal', () => {
  test('starts from what is owed and needs a reference no. or a screenshot', async () => {
    vi.mocked(billingService.report).mockResolvedValue({ payment: reported, message: 'Payment reported. The owner will confirm it.' })
    const wrapper = mount(ReportPaymentModal, { props: { open: false, places: [santos] }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(text()).toContain('Santos House')
    await press('Send to the owner')
    expect(toast.error).toHaveBeenCalledWith('Enter the reference no. or attach a screenshot.')
    expect(billingService.report).not.toHaveBeenCalled()

    const ref = [...page().querySelectorAll('ion-input')].find((i) => i.querySelector('.label-text')?.textContent === 'Reference no.')!.querySelector('input')!
    ref.value = 'GC-777'
    ref.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    await press('Send to the owner')

    expect(billingService.report).toHaveBeenCalledWith(3, expect.objectContaining({ amount_centavos: 30000, method: 'e_wallet', reference: 'GC-777' }))
    expect(wrapper.emitted('done')?.[0]).toEqual(['Payment reported. The owner will confirm it.'])
  })
})

describe('MyBillsPage follow-up (C7) and documents (A9)', () => {
  test('marks late and checked bills, and opens the statement and a receipt as PDFs', async () => {
    const tab = { location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    vi.mocked(billingService.myBills).mockResolvedValue({
      items: [
        { ...october, property_name: 'Santos House', is_late: true, late_notice_number: 'NTC-2026-000001', under_review: null },
        { ...october, id: 22, number: 'BILL-2026-000013', property_name: 'Santos House', is_late: false, under_review: { since: '2026-10-28T10:00:00+08:00', reason: 'Checking', by: null } },
      ],
      meta: { current_page: 1, last_page: 1, total: 2, places: [santos] },
    })
    vi.mocked(billingService.myStatementLink).mockResolvedValue({ url: 'https://api.test/documents/statements/3/5?signature=x', expires_in_minutes: 30 })
    vi.mocked(billingService.myPayments).mockResolvedValue({ items: [{ ...confirmed, property_name: 'Santos House' }], meta: { current_page: 1, last_page: 1, total: 1 } })
    vi.mocked(billingService.receiptLink).mockResolvedValue({ url: 'https://api.test/documents/receipts/41?signature=y', expires_in_minutes: 30 })

    mount(MyBillsPage, { global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()
    expect(text()).toContain('Late')
    expect(text()).toContain('Being checked')

    await press('Statement (PDF)')
    expect(billingService.myStatementLink).toHaveBeenCalledWith(3)
    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(tab.location.href).toBe('https://api.test/documents/statements/3/5?signature=x')

    await showTab('payments')
    await press('Receipt (PDF)')
    expect(billingService.receiptLink).toHaveBeenCalledWith(41)
    expect(tab.location.href).toBe('https://api.test/documents/receipts/41?signature=y')
    open.mockRestore()
  })
})
