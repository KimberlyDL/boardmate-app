import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'
import PropertyDetailsForm from '@/components/property/PropertyDetailsForm.vue'
import type { PropertyDetailsInput } from '@/services/properties'
import { searchKey } from '@/services/places'

vi.mock('@/components/MapPicker.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/services/places', async (original) => ({
  ...(await original<typeof import('@/services/places')>()),
  placeService: {
    provinces: vi.fn(async () => [
      { code: '1', name: 'Metro Manila', cities: [{ code: '11', name: 'Las Piñas City', is_city: true }, { code: '12', name: 'Pateros', is_city: false }] },
      { code: '2', name: 'Oriental Mindoro', cities: [{ code: '21', name: 'Calapan City', is_city: true }, { code: '22', name: 'Naujan', is_city: false }] },
    ]),
  },
}))

afterEach(() => {
  document.body.innerHTML = ''
})

function mountForm(model: PropertyDetailsInput) {
  const state = reactive(model)
  const wrapper = mount(PropertyDetailsForm, {
    props: { modelValue: state, 'onUpdate:modelValue': (v: PropertyDetailsInput) => Object.assign(state, v), part: 'location', errors: {} },
    global: { plugins: [IonicVue] },
    attachTo: document.body,
  })
  return { wrapper, state }
}

const pickers = (wrapper: ReturnType<typeof mountForm>['wrapper']) => wrapper.findAllComponents({ name: 'PlaceSelect' })

describe('location pickers', () => {
  test('lists provinces, then only the chosen province\'s cities', async () => {
    const { wrapper, state } = mountForm({ name: 'Santos House' })
    await flushPromises()
    const [province, city] = pickers(wrapper)

    expect(province.props('options')).toEqual(['Metro Manila', 'Oriental Mindoro'])
    expect(city.props('disabled')).toBe(true)

    province.vm.$emit('update:modelValue', 'Oriental Mindoro')
    await flushPromises()
    expect(state.province).toBe('Oriental Mindoro')
    expect(pickers(wrapper)[1].props('options')).toEqual(['Calapan City', 'Naujan'])
    expect(pickers(wrapper)[1].props('disabled')).toBe(false)
  })

  test('keeps an old saved city when the form opens, and clears it only when the province changes', async () => {
    const { wrapper, state } = mountForm({ name: 'Santos House', province: 'Oriental Mindoro', city: 'Calapan' })
    await flushPromises()

    expect(state.city).toBe('Calapan')
    const cityField = pickers(wrapper)[1].find('ion-input').element as HTMLElement & { helperText?: string }
    expect(cityField.helperText).toBe('Not on the official list. Tap to pick it again.')

    pickers(wrapper)[0].vm.$emit('update:modelValue', 'Metro Manila')
    await flushPromises()
    expect(state.city).toBeNull()
  })
})

describe('searchKey', () => {
  test('ignores case and accents', () => {
    expect(searchKey('Las Piñas City')).toContain(searchKey('las pinas'))
    expect(searchKey(' MUÑOZ ')).toBe('munoz')
  })
})
