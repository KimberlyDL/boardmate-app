import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import HouseRulesList from '@/components/houseRules/HouseRulesList.vue'
import HouseRulesSection from '@/components/property/HouseRulesSection.vue'
import HouseRulesPage from '@/views/boarder/HouseRulesPage.vue'
import { houseRuleService } from '@/services/houseRules'
import { tenancyService } from '@/services/tenancies'
import type { HouseRule, HouseRuleVersion } from '@/types/houseRules'
import type { Property } from '@/types/property'
import type { Tenancy } from '@/types/tenancy'

vi.mock('@/services/houseRules', () => ({
  houseRuleService: { forProperty: vi.fn(), version: vi.fn(), saveDraft: vi.fn(), discardDraft: vi.fn(), publish: vi.fn(), forStay: vi.fn(), accept: vi.fn() },
}))
vi.mock('@/services/tenancies', () => ({ tenancyService: { mine: vi.fn() } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
// Confirm dialogs answer yes; entering the page runs its callback at once.
const dialog = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@ionic/vue', async (original) => ({
  ...(await original<typeof import('@ionic/vue')>()),
  onIonViewWillEnter: (cb: () => void) => cb(),
  alertController: dialog,
}))

const page = () => document.body
const text = () => page().textContent ?? ''

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === label)
  if (!el) throw new Error(`No button "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

const quiet: HouseRule = { category: 'quiet_hours', category_label: 'Quiet hours', body: 'Keep quiet from 10:00 PM.' }
const dishes: HouseRule = { category: 'cleanliness', category_label: 'Cleanliness', body: 'Wash your dishes.' }
const v1: HouseRuleVersion = { id: 1, version: 1, is_draft: false, note: null, published_at: '2026-10-01T09:00:00+08:00', published_by: 'Ana Santos', rules: [quiet, dishes] }

beforeEach(() => {
  vi.clearAllMocks()
  dialog.create.mockResolvedValue({ present: vi.fn(), onDidDismiss: async () => ({ role: 'confirm' }) })
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('HouseRulesList', () => {
  test('groups the rules by category, in the owner\'s order', () => {
    const wrapper = mount(HouseRulesList, { props: { rules: [quiet, dishes, { ...quiet, body: 'No karaoke.' }] } })
    expect(wrapper.findAll('.category').map((c) => c.text())).toEqual(['Quiet hours', 'Cleanliness'])
    expect(wrapper.findAll('li').map((l) => l.text())).toEqual(['Keep quiet from 10:00 PM.', 'No karaoke.', 'Wash your dishes.'])
  })
})

describe('HouseRulesSection', () => {
  const property = { id: 3, name: 'Santos House', abilities: ['view', 'manage_rules'] } as unknown as Property

  test('the owner edits from the rules in force and publishes the next version', async () => {
    vi.mocked(houseRuleService.forProperty).mockResolvedValue({ current: v1, draft: null, automatic: [], versions: [{ version: 1, published_at: v1.published_at, published_by: 'Ana Santos', note: null, rules_count: 2 }] })
    vi.mocked(houseRuleService.saveDraft).mockResolvedValue({ draft: { ...v1, version: null, is_draft: true }, message: 'Draft saved.' })
    vi.mocked(houseRuleService.publish).mockResolvedValue({ version: { ...v1, version: 2 }, message: 'House rules version 2 published.' })
    mount(HouseRulesSection, { props: { property }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(text()).toContain('Version 1')
    expect(text()).toContain('Wash your dishes.')
    await press('Change the rules')
    expect(page().querySelectorAll('ion-textarea')).toHaveLength(2)
    await press('Remove')
    await press('Publish')

    expect(dialog.create.mock.calls[0][0].header).toBe('Publish version 2?')
    expect(houseRuleService.saveDraft).toHaveBeenCalledWith(3, [{ category: 'cleanliness', body: 'Wash your dishes.' }], null)
    expect(houseRuleService.publish).toHaveBeenCalledWith(3)
    expect(toast.success).toHaveBeenCalledWith('House rules version 2 published.')
  })

  test('a Collector only reads', async () => {
    vi.mocked(houseRuleService.forProperty).mockResolvedValue({ current: v1, draft: null, automatic: [], versions: [] })
    mount(HouseRulesSection, { props: { property: { ...property, abilities: ['view'] } }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()
    expect([...page().querySelectorAll('ion-button')].map((b) => b.textContent?.trim())).not.toContain('Change the rules')
  })
})

describe('HouseRulesPage', () => {
  test('the tenant accepts the new version', async () => {
    vi.mocked(tenancyService.mine).mockResolvedValue([{ id: 8, property: { id: 3, name: 'Santos House' } } as unknown as Tenancy])
    vi.mocked(houseRuleService.forStay)
      .mockResolvedValueOnce({ current: { ...v1, version: 2, note: 'Visitor hours added' }, needs_acceptance: true, acceptances: [] })
      .mockResolvedValue({ current: { ...v1, version: 2 }, needs_acceptance: false, acceptances: [{ version: 2, method: 'app', method_label: 'In the app', recorded_by: null, accepted_at: '2026-10-18T09:00:00+08:00' }] })
    vi.mocked(houseRuleService.accept).mockResolvedValue('Thanks. You accepted the house rules.')
    mount(HouseRulesPage, { global: { plugins: [IonicVue], stubs: { IonBackButton: true } }, attachTo: document.body })
    await flushPromises()

    expect(text()).toContain('What changed: Visitor hours added')
    expect(text()).toContain('Please read these and accept them.')
    await press('I have read them and accept')
    expect(houseRuleService.accept).toHaveBeenCalledWith(8, 2)
    expect(text()).toContain('You accepted these house rules.')
    expect(text()).toContain('In the app')
  })
})
