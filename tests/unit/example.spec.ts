import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { IonicVue } from '@ionic/vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import HomePage from '@/views/public/HomePage.vue'
import { systemService } from '@/services/system'

describe('HomePage.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('shows "API connected" when the health check succeeds', async () => {
    vi.spyOn(systemService, 'health').mockResolvedValue({
      app: 'BoardMate',
      api_version: 'v1',
      database: 'ok',
      server_time: '2026-10-03T21:00:00+08:00',
      timezone: 'Asia/Manila',
    })

    const wrapper = mount(HomePage, { global: { plugins: [IonicVue] } })
    await flushPromises()

    expect(wrapper.get('[data-test="api-status"]').text()).toBe('API connected')
    expect(wrapper.text()).toContain('Oct 3, 2026 9:00 PM')
  })

  test('shows an error when the API cannot be reached', async () => {
    vi.spyOn(systemService, 'health').mockRejectedValue(new Error('down'))

    const wrapper = mount(HomePage, { global: { plugins: [IonicVue] } })
    await flushPromises()

    expect(wrapper.get('[data-test="api-status"]').text()).toBe('API not reachable')
  })
})
