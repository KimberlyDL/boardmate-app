import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import DlLoader from '@/components/dl/DlLoader.vue'
import { requestFinished, requestStarted, requestsInFlight } from '@/lib/activity'
import { installBusyButtons } from '@/lib/busyButtons'

const settle = async () => {
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function button(label: string): HTMLElement {
  const el = document.createElement('ion-button')
  el.textContent = label
  document.body.appendChild(el)
  return el
}

beforeAll(() => installBusyButtons())
afterEach(() => {
  while (requestsInFlight.value > 0) requestFinished()
  document.body.innerHTML = ''
})

describe('busy buttons', () => {
  test('only the tapped button shows the ring, until the request is done', async () => {
    const save = button('Save')
    const remove = button('Remove')

    save.click()
    save.setAttribute('disabled', '')
    remove.setAttribute('disabled', '')
    requestStarted()
    await settle()

    expect(save.querySelector('.dl-busy-ring')).not.toBeNull()
    expect(save.getAttribute('aria-busy')).toBe('true')
    expect(remove.querySelector('.dl-busy-ring')).toBeNull()

    requestFinished()
    await settle()
    expect(save.querySelector('.dl-busy-ring')).toBeNull()
    expect(save.classList.contains('dl-busy')).toBe(false)
  })

  test('leaves a button alone when it is disabled without a request, or shows its own loader', async () => {
    const markRead = button('Mark all read')
    markRead.click()
    markRead.setAttribute('disabled', '')
    await settle()
    expect(markRead.querySelector('.dl-busy-ring')).toBeNull()

    const signIn = button('')
    signIn.innerHTML = '<span class="dl-loader"></span>'
    signIn.click()
    signIn.setAttribute('disabled', '')
    requestStarted()
    await settle()
    expect(signIn.querySelector('.dl-busy-ring')).toBeNull()
  })
})

describe('DlLoader', () => {
  test('draws the house with a label for page waits, and a ring for buttons', () => {
    const page = mount(DlLoader, { props: { label: 'Loading reports' } })
    expect(page.attributes('role')).toBe('status')
    expect(page.attributes('aria-label')).toBe('Loading reports')
    expect(page.find('.trace').exists()).toBe(true)
    expect(page.text()).toBe('Loading reports')

    const ring = mount(DlLoader, { props: { variant: 'ring' } })
    expect(ring.find('.arc').exists()).toBe(true)
    expect(ring.attributes('aria-label')).toBe('Loading')
  })
})
