import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import AppSidebar from '@/components/AppSidebar.vue'
import { isActive, ROLE_TABS, SIDEBAR_MORE } from '@/lib/navigation'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/bookings'
import { useNotificationStore } from '@/stores/notifications'
import { UserRole } from '@/types/enums'
import type { User } from '@/types/user'

const nav = vi.hoisted(() => ({ navigate: vi.fn(), route: { path: '/owner/home' } }))
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), useIonRouter: () => ({ navigate: nav.navigate }) }))
vi.mock('vue-router', async (original) => ({ ...(await original<typeof import('vue-router')>()), useRoute: () => nav.route }))

describe('menu list (W1)', () => {
  test('every role has its tabs with Account last, under the role home', () => {
    for (const [role, tabs] of Object.entries(ROLE_TABS)) {
      expect(tabs.at(-1)?.tab).toBe('account')
      for (const t of tabs) expect(t.href).toBe(`${role === UserRole.PlatformAdmin ? '/admin' : `/${role}`}/${t.tab}`)
    }
    expect(ROLE_TABS[UserRole.Owner].map((t) => t.label)).toEqual(['Home', 'Properties', 'Applications', 'Caretakers', 'Account'])
  })

  test('a Collector is never sent to Insights from the sidebar', () => {
    expect(SIDEBAR_MORE[UserRole.Caretaker].map((i) => i.href)).not.toContain('/insights')
    expect(SIDEBAR_MORE[UserRole.Owner].map((i) => i.href)).toContain('/insights')
  })

  test('marks a page and the pages under it as active, not look-alike paths', () => {
    const item = { href: '/insights', label: 'Insights', icon: {} }
    expect(isActive(item, '/insights')).toBe(true)
    expect(isActive(item, '/insights/properties/3')).toBe(true)
    expect(isActive(item, '/insights-old')).toBe(false)
  })
})

describe('desktop sidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    nav.route = { path: '/owner/home' }
    useAuthStore().user = { id: 1, name: 'Leynard Chequito', roles: ['owner', 'boarder'], active_role: 'owner', photo_url: null } as unknown as User
    const bookings = useBookingStore()
    bookings.refreshPending = vi.fn(async () => {})
    bookings.pendingCount = 2
    const notifications = useNotificationStore()
    notifications.refreshCount = vi.fn(async () => {})
    notifications.unreadCount = 3
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test("lists the role's places, counts, and who is signed in", async () => {
    mount(AppSidebar, { global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()
    const links = [...document.querySelectorAll('.app-sidebar a')].map((a) => a.textContent?.replace(/\s+/g, ' ').trim())

    expect(links).toEqual(['DormLink', 'Home', 'Properties', 'Applications, 2 waiting', 'Caretakers', 'Insights', 'Collections', 'Reports', 'Notifications, 3 unread', 'LCLeynard ChequitoOwner'])
    expect(document.querySelector('.app-sidebar a.on')?.textContent?.trim()).toBe('Home')
    expect(document.querySelector('.app-sidebar a.on')?.getAttribute('aria-current')).toBe('page')
  })

  test('opens a place as a fresh start, like a bottom tab', async () => {
    mount(AppSidebar, { global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()
    ;([...document.querySelectorAll('.app-sidebar a')].find((a) => a.textContent?.includes('Collections')) as HTMLElement).click()
    ;([...document.querySelectorAll('.app-sidebar a')].find((a) => a.textContent?.trim() === 'Home') as HTMLElement).click()   // already here

    expect(nav.navigate).toHaveBeenCalledTimes(1)
    expect(nav.navigate).toHaveBeenCalledWith('/collections', 'root', 'replace')
  })
})
