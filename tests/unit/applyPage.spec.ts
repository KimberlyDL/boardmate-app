import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { AxiosError, type AxiosResponse } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ApplyPage from '@/views/boarder/ApplyPage.vue'
import { bookingService } from '@/services/bookings'
import { listingService } from '@/services/listings'

vi.mock('@/services/bookings', () => ({ bookingService: { apply: vi.fn() } }))
vi.mock('@/services/listings', () => ({ listingService: { get: vi.fn() } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRoute: () => ({ params: { id: '7' }, query: {} }),
  useRouter: () => router,
}))

/** A 422 refusal as the API sends it: a message and a code, no field errors. */
function refused(message: string, code: string) {
  return new AxiosError(message, 'ERR_BAD_REQUEST', undefined, undefined, { status: 422, data: { message, code } } as AxiosResponse)
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(listingService.get).mockResolvedValue({
    listing: { name: 'Reyes Dorm', rooms: [{ id: 1, label: '01', status: 'available', available: 1, whole_option: null }], house_rules: null },
  } as never)
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('ApplyPage', () => {
  test('a boarder who is staying somewhere gets a clear toast and stays on the page', async () => {
    const message = 'You are staying at Santos House. To book for someone else, they need their own DormLink account. To move yourself, give notice first.'
    vi.mocked(bookingService.apply).mockRejectedValue(refused(message, 'has_stay'))
    mount(ApplyPage, { global: { plugins: [IonicVue], stubs: { IonBackButton: true } }, attachTo: document.body })
    await flushPromises()

    document.querySelector('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(bookingService.apply).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith(message)
    expect(router.replace).not.toHaveBeenCalled()
  })
})
