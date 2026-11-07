import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import UtilitiesSection from '@/components/property/UtilitiesSection.vue'
import { propertyService } from '@/services/properties'
import type { Property } from '@/types/property'

vi.mock('@/services/billing', () => ({ billingService: { utilityBills: vi.fn(async () => []) } }))
vi.mock('@/services/properties', () => ({ propertyService: { addUtility: vi.fn(async () => ({})) } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

const text = () => document.body.textContent ?? ''

const account = (id: number, type: string, name: string, room: { id: number; label: string } | null) => ({
  id, type, name, room, method: 'fixed_per_bedspace', method_label: 'Fixed per bedspace', billed_by: 'owner',
  has_fixed_amount: true, amount_centavos: 15000, upcoming_amount: null,
})

const property = {
  id: 3,
  abilities: ['manage_prices'],
  rooms: [{ id: 9, label: '02' }, { id: 10, label: '03' }],
  utility_accounts: [
    account(2, 'water', 'Room 02 water', { id: 9, label: '02' }),
    account(1, 'water', 'Water', null),
    account(3, 'other', 'LPG', { id: 10, label: '03' }),
  ],
} as unknown as Property

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  document.body.innerHTML = ''
})

function mountSection(roomId: number | null = null) {
  return mount(UtilitiesSection, { props: { property, roomId }, global: { plugins: [IonicVue] }, attachTo: document.body })
}

describe('UtilitiesSection room settings', () => {
  test('lists the property\'s utilities first and says what a room\'s own setting replaces', async () => {
    mountSection()
    await flushPromises()

    const names = [...document.querySelectorAll('ion-item h2')].map((h) => h.textContent?.trim())
    expect(names[0]).toBe('Water')
    expect(names[1]).toContain('Room 02 only')
    expect(text()).toContain("Room 02 follows this instead of the property's Water.")
    expect(text()).toContain('Only room 03 has this.')
  })

  test('opened from a room\'s menu, adds the utility to that room', async () => {
    const wrapper = mountSection(9)
    await flushPromises()
    // The form starts on Electricity, which the property has no setting for.
    expect(text()).toContain('Only room 02 gets this electricity.')

    const chip = [...document.querySelectorAll('ion-chip')].find((c) => c.textContent?.trim() === 'Water') as HTMLElement
    chip.click()
    await flushPromises()
    expect(text()).toContain("Room 02 will follow this instead of the property's Water. Other rooms keep the property's setting.")

    await wrapper.findComponent({ name: 'IonSelect' }).vm.$emit('update:modelValue', 9)
    const selects = wrapper.findAllComponents({ name: 'IonSelect' })
    await selects[1].vm.$emit('update:modelValue', 'fixed_per_bedspace')
    await flushPromises()
    await wrapper.findComponent({ name: 'IonInput' }).vm.$emit('update:modelValue', '200')
    const add = [...document.querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === 'Add') as HTMLElement
    add.click()
    await flushPromises()

    expect(propertyService.addUtility).toHaveBeenCalledWith(3, expect.objectContaining({ type: 'water', room_id: 9, amount_centavos: 20000 }))
  })
})
