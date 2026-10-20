import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import GroupPage from '@/views/groups/GroupPage.vue'
import LineSheet from '@/components/groups/LineSheet.vue'
import ExpenseSheet from '@/components/groups/ExpenseSheet.vue'
import { groupService } from '@/services/groups'
import type { Balances, Group, GroupLine, Repayment } from '@/types/groups'

vi.mock('@/services/groups', () => ({
  groupService: {
    get: vi.fn(),
    lines: vi.fn(),
    balances: vi.fn(),
    repayments: vi.fn(),
    markRepayment: vi.fn(),
    confirmRepayment: vi.fn(),
    rejectRepayment: vi.fn(),
    setRole: vi.fn(),
    setDefaultSplit: vi.fn(),
    addExpense: vi.fn(),
    editExpense: vi.fn(),
    deleteExpense: vi.fn(),
    resplit: vi.fn(),
    correct: vi.fn(),
  },
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
vi.mock('vue-router', async (original) => ({ ...(await original<typeof import('vue-router')>()), useRoute: () => ({ params: { id: '4' } }) }))
// Confirm dialogs answer yes; entering the page runs its callback at once.
const dialog = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@ionic/vue', async (original) => ({
  ...(await original<typeof import('@ionic/vue')>()),
  onIonViewWillEnter: (cb: () => void) => cb(),
  alertController: dialog,
}))

// Scrollable segments scroll the chosen button into view; jsdom has no scrolling.
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

async function openTab(value: string) {
  page().querySelector('ion-segment')!.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }))
  await flushPromises()
}

/** Type into the ion-input with this label. */
async function fill(label: string, value: string) {
  const input = [...page().querySelectorAll('ion-input')].find((i) => i.querySelector('.label-text')?.textContent === label)?.querySelector('input')
  if (!input) throw new Error(`No input "${label}"`)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

const members = [
  { id: 1, name: 'Kim Santos', role: 'admin', role_label: 'Leader', has_account: true, joined_on: '2026-09-01', left_on: null, is_me: true },
  { id: 2, name: 'Ana Cruz', role: 'member', role_label: 'Member', has_account: true, joined_on: '2026-09-01', left_on: null, is_me: false },
  { id: 3, name: 'Ben Reyes', role: 'member', role_label: 'Member', has_account: true, joined_on: '2026-09-15', left_on: null, is_me: false },
]

const memberGroup = {
  id: 4,
  room: { id: 9, label: '203' },
  property: { id: 3, name: 'Santos House' },
  default_split_method: 'equal',
  default_split_label: 'Equal',
  view: 'member',
  me: { id: 2, role: 'member', is_current: true },
  can_manage: false,
  can_appoint_moderators: false,
  members: members.map((m) => ({ ...m, is_me: m.id === 2 })),
} as unknown as Group

const leaderGroup = { ...memberGroup, me: { id: 1, role: 'admin', is_current: true }, can_manage: true, can_appoint_moderators: true, members } as unknown as Group

const electricity = {
  id: 20,
  kind: 'owner_bill',
  kind_label: 'Owner bill',
  is_locked: true,
  bill_number: 'B-0001',
  description: 'Electricity, September',
  amount_centavos: 300000,
  spent_on: '2026-10-01',
  paid_by: { id: 1, name: 'Kim Santos' },
  adjusts_expense_id: null,
  reason: null,
  proof_url: null,
  added_by_me: false,
  split_method: 'equal',
  split_label: 'Equal',
  shares: [
    { member_id: 1, name: 'Kim Santos', amount_centavos: 100000 },
    { member_id: 2, name: 'Ana Cruz', amount_centavos: 100000 },
    { member_id: 3, name: 'Ben Reyes', amount_centavos: 100000 },
  ],
  my_share_centavos: 100000,
} as unknown as GroupLine

const balances: Balances = {
  me: { owe_centavos: 100000, owed_to_me_centavos: 0 },
  pairs: [
    { from: { id: 2, name: 'Ana Cruz' }, to: { id: 1, name: 'Kim Santos' }, amount_centavos: 100000, involves_me: true },
    { from: { id: 3, name: 'Ben Reyes' }, to: { id: 1, name: 'Kim Santos' }, amount_centavos: 100000, involves_me: false },
  ],
}

function serve(group: Group, repayments: Repayment[] = []) {
  vi.mocked(groupService.get).mockResolvedValue(group)
  vi.mocked(groupService.lines).mockResolvedValue([electricity])
  vi.mocked(groupService.balances).mockResolvedValue(balances)
  vi.mocked(groupService.repayments).mockResolvedValue(repayments)
}

const mountGroup = () => mount(GroupPage, { global: { plugins: [IonicVue], stubs: { IonBackButton: true } }, attachTo: document.body })

beforeEach(() => {
  vi.clearAllMocks()
  dialog.create.mockResolvedValue({ present: vi.fn(), onDidDismiss: async () => ({ role: 'confirm', data: { values: { reason: 'Not received' } } }) })
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('GroupPage', () => {
  test('a member sees the owner bill with their share, and pays back only their own pair', async () => {
    serve(memberGroup)
    vi.mocked(groupService.markRepayment).mockResolvedValue({ repayment: {} as Repayment, message: 'Marked as paid. Kim Santos confirms it.' })
    mountGroup()
    await flushPromises()

    expect(text()).toContain('Electricity, September')
    expect(text()).toContain('You: ₱1,000.00')
    expect(buttons()).toContain('Add expense')

    await openTab('balances')
    expect(text()).toContain('Ana Cruz → Kim Santos')
    // Ana pays Kim; Ben's debt to Kim is not hers to record.
    expect(buttons().filter((b) => b === 'Pay back')).toHaveLength(1)
    expect(buttons()).not.toContain('Record payment')

    await press('Pay back')
    expect(text()).toContain('Kim Santos confirms it before it counts.')
    await press('Mark as paid')
    expect(groupService.markRepayment).toHaveBeenCalledWith(4, expect.objectContaining({ to_member_id: 1, from_member_id: undefined, amount_centavos: 100000, method: 'cash' }))
    expect(toast.success).toHaveBeenCalledWith('Marked as paid. Kim Santos confirms it.')
  })

  test('the receiver confirms or rejects a waiting payback', async () => {
    const waiting = {
      id: 7,
      from: { id: 2, name: 'Ana Cruz' },
      to: { id: 1, name: 'Kim Santos' },
      amount_centavos: 100000,
      method: 'online',
      method_label: 'Online',
      reference: 'GC-123',
      proof_url: null,
      note: null,
      status: 'pending',
      status_label: 'Waiting',
      decided_by: null,
      reject_reason: null,
      can_decide: true,
      created_at: '2026-10-05T10:00:00+08:00',
    } as Repayment
    serve(leaderGroup, [waiting])
    vi.mocked(groupService.confirmRepayment).mockResolvedValue('Confirmed.')
    vi.mocked(groupService.rejectRepayment).mockResolvedValue('Rejected.')
    mountGroup()
    await flushPromises()

    await openTab('repayments')
    expect(text()).toContain('Online · GC-123')
    await press('Confirm')
    expect(groupService.confirmRepayment).toHaveBeenCalledWith(4, 7)
    await press('Reject')
    expect(groupService.rejectRepayment).toHaveBeenCalledWith(4, 7, 'Not received')
  })

  test('the leader appoints a moderator', async () => {
    serve(leaderGroup)
    vi.mocked(groupService.setRole).mockResolvedValue('Ana Cruz is now a moderator.')
    mountGroup()
    await flushPromises()

    await openTab('members')
    expect(buttons().filter((b) => b === 'Make moderator')).toHaveLength(2)
    await press('Make moderator')
    expect(groupService.setRole).toHaveBeenCalledWith(4, 2, 'moderator')
    expect(toast.success).toHaveBeenCalledWith('Ana Cruz is now a moderator.')
  })

  test('staff see members and owner bills only', async () => {
    serve({ ...memberGroup, view: 'staff', me: null, can_manage: false, can_appoint_moderators: true } as unknown as Group)
    vi.mocked(groupService.lines).mockResolvedValue([{ ...electricity, shares: undefined, my_share_centavos: undefined }])
    mountGroup()
    await flushPromises()

    expect(text()).toContain('you see the members and the owner\'s bills only')
    expect(text()).not.toContain('Balances')
    expect(buttons()).not.toContain('Add expense')
    expect(groupService.balances).not.toHaveBeenCalled()
    expect(groupService.repayments).not.toHaveBeenCalled()
  })
})

describe('LineSheet', () => {
  const mountLine = () => mount(LineSheet, { props: { line: null, group: leaderGroup }, global: { plugins: [IonicVue] }, attachTo: document.body })

  test('a correction to an owner bill must add up to zero', async () => {
    vi.mocked(groupService.correct).mockResolvedValue({ line: {} as GroupLine, message: 'Correction added.' })
    const wrapper = mountLine()
    await wrapper.setProps({ line: electricity })
    await flushPromises()

    expect(text()).toContain('Owner bill: the amount is fixed')
    await press('Add a correction')
    await fill('Ben Reyes', '-500')
    await fill('Reason', 'Ben was away half the month')
    await press('Add correction')
    expect(toast.error).toHaveBeenCalledWith('For an owner bill, the changes must add up to ₱0.')
    expect(groupService.correct).not.toHaveBeenCalled()

    await fill('Kim Santos', '+250')
    await fill('Ana Cruz', '250')
    await press('Add correction')
    expect(groupService.correct).toHaveBeenCalledWith(4, 20, { 1: 25000, 2: 25000, 3: -50000 }, 'Ben was away half the month')
    expect(wrapper.emitted('changed')).toEqual([['Correction added.']])
  })

  test('only the leader, moderators or whoever added it may edit or delete a member expense', async () => {
    const wifi = { ...electricity, id: 21, kind: 'member_expense', kind_label: 'Shared expense', is_locked: false, description: 'Internet', added_by_me: false } as GroupLine
    const wrapper = mount(LineSheet, { props: { line: null, group: memberGroup }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await wrapper.setProps({ line: wifi })
    await flushPromises()
    expect(buttons()).not.toContain('Edit')
    expect(buttons()).not.toContain('Change split')

    await wrapper.setProps({ line: { ...wifi, added_by_me: true } })
    await flushPromises()
    expect(buttons()).toContain('Edit')
    expect(buttons()).toContain('Delete')
  })
})

describe('ExpenseSheet', () => {
  test('adds an expense split equally among everyone ticked', async () => {
    vi.mocked(groupService.addExpense).mockResolvedValue({ line: {} as GroupLine, message: 'Expense added.' })
    const wrapper = mount(ExpenseSheet, { props: { open: false, group: memberGroup }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await flushPromises()

    await fill('What for', 'Water refills')
    await fill('Amount (₱)', '90')
    await press('Add expense')
    expect(groupService.addExpense).toHaveBeenCalledWith(4, expect.objectContaining({ description: 'Water refills', amount_centavos: 9000, participants: [1, 2, 3], method: 'equal' }))
    expect(wrapper.emitted('done')).toEqual([['Expense added.']])
  })
})
