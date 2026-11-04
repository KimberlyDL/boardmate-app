import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, h } from 'vue'

const platform = vi.hoisted(() => ({ installed: false }))
vi.mock('@/lib/platform', () => ({ isInstalledApp: () => platform.installed }))
vi.mock('@/views/public/HomePage.vue', () => ({ __esModule: true, default: defineComponent({ render: () => h('div', { class: 'slides' }, 'onboarding slides') }) }))
const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', async (original) => ({ ...(await original<typeof import('vue-router')>()), useRouter: () => ({ push: nav.push }) }))

const text = () => document.body.textContent ?? ''

async function mountStart() {
  vi.resetModules()
  const StartPage = (await import('@/views/public/StartPage.vue')).default
  mount(StartPage, { global: { plugins: [IonicVue], stubs: { RouterLink: { template: '<a><slot /></a>' } } }, attachTo: document.body })
  // Only the chosen half is loaded, lazily: wait until it shows.
  await vi.waitFor(() => expect(text()).not.toBe(''), { timeout: 5000 })
  await flushPromises()
}

describe('front page (W1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('a browser tab gets the website, with search, owners and sign-up', async () => {
    platform.installed = false
    await mountStart()

    expect(text()).toContain('Find a place near your')
    expect(text()).toContain('Run your boarding house without the notebook')
    expect(text()).toContain('Create an account')
    expect(text()).not.toContain('onboarding slides')

    const input = document.querySelector('.search input') as HTMLInputElement
    input.value = '  Calapan '
    input.dispatchEvent(new Event('input'))
    document.querySelector('.search')!.dispatchEvent(new Event('submit'))
    expect(nav.push).toHaveBeenCalledWith({ path: '/find', query: { q: 'Calapan' } })
  })

  test('an empty search opens the Finder as it is', async () => {
    platform.installed = false
    await mountStart()
    document.querySelector('.search')!.dispatchEvent(new Event('submit'))

    expect(nav.push).toHaveBeenCalledWith({ path: '/find', query: {} })
  })

  test('the installed app keeps the onboarding slides', async () => {
    platform.installed = true
    await mountStart()

    expect(text()).toContain('onboarding slides')
    expect(text()).not.toContain('Find a place near your')
  })
})
