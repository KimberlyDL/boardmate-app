import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { IonicVue } from '@ionic/vue'
import { describe, expect, test, vi } from 'vitest'
import HomePage from '@/views/public/HomePage.vue'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const mountHome = () => mount(HomePage, { global: { plugins: [IonicVue, createPinia()], stubs: { 'router-link': true } } })

describe('HomePage.vue (onboarding)', () => {
  test('introduces BoardMate in five slides, then the sign-in screen', () => {
    const wrapper = mountHome()
    const text = wrapper.text()
    for (const heading of [
      'Find a place that fits.',
      'Apply when you find the right one.',
      'Know what you owe.',
      'Split shared expenses fairly.',
      'More than just a rental app.',
      'Ready to get started?',
    ]) {
      expect(text).toContain(heading)
    }
    expect(wrapper.findAll('.slide')).toHaveLength(6)
    expect(wrapper.findAll('.dot')).toHaveLength(5)
  })

  test('offers sign up, sign in and browsing', () => {
    const text = mountHome().text()
    expect(text).toContain('Create an account')
    expect(text).toContain('Sign in to your account')
    expect(text).toContain('Already have an account?')
    expect(text).toContain('Explore available places')
  })

  test('Get started moves to the next slide', async () => {
    const wrapper = mountHome()
    expect(wrapper.find('.foot').text()).toContain('Get started')
    await wrapper.find('.foot ion-button').trigger('click')
    expect(wrapper.find('.dot.on').attributes('aria-label')).toContain('Slide 2')
  })
})
