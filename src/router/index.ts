import { createRouter, createWebHistory } from '@ionic/vue-router'
import { RouteRecordRaw } from 'vue-router'
import { markRaw } from 'vue'
import RoleTabsLayout from '@/layouts/RoleTabsLayout.vue'
import { ROLE_TABS } from '@/lib/navigation'
import { ROLE_HOME } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth'
import { UserRole } from '@/types/enums'

declare module 'vue-router' {
  interface RouteMeta {
    /** Only for signed-in users; others go to /login. */
    requiresAuth?: boolean
    /** Only for signed-out users (login, sign-up); others go to their home. */
    guestOnly?: boolean
    /** Only for accounts holding this role; others go to their own home. */
    role?: UserRole
  }
}

const NotificationsPage = () => import('@/views/account/NotificationsPage.vue')
const PropertiesListPage = () => import('@/views/properties/PropertiesListPage.vue')
const ApplicationsPage = () => import('@/views/owner/ApplicationsPage.vue')
const AccountPage = () => import('@/views/account/AccountPage.vue')

/**
 * Builds one role's tab area: /<base>/<tab>, with the tabs from lib/navigation.ts (the same list
 * the desktop sidebar shows) and the screen of each. Account is on every role.
 * Notifications lives in the area too (/<base>/notifications) but has no tab: the bell opens it.
 */
function roleArea(role: UserRole, screens: Record<string, () => Promise<unknown>>): RouteRecordRaw {
  const tabs = ROLE_TABS[role]
  const component = (tab: string) => (tab === 'account' ? AccountPage : screens[tab])

  return {
    path: `${ROLE_HOME[role]}/`,
    component: RoleTabsLayout,
    props: { tabs: tabs.map((t) => ({ ...t, icon: markRaw(t.icon) })) },
    meta: { requiresAuth: true, role },
    children: [
      { path: '', redirect: tabs[0].href },
      ...tabs.map((t) => ({ path: t.tab!, component: component(t.tab!) })),
      { path: 'notifications', component: NotificationsPage },
    ],
  }
}

/** A path that sends the signed-in user to a role-dependent page. */
function roleLink(path: string, target: (auth: ReturnType<typeof useAuthStore>) => string): RouteRecordRaw {
  return {
    path,
    component: () => import('@/views/public/HomePage.vue'), // never shown
    meta: { requiresAuth: true },
    beforeEnter: async () => {
      const auth = useAuthStore()
      await auth.init()
      return target(auth)
    },
  }
}

const routes: Array<RouteRecordRaw> = [
  // Public
  // The installed app gets the onboarding slides, a browser the website landing page (StartPage.vue).
  { path: '/', name: 'home', component: () => import('@/views/public/StartPage.vue'), meta: { guestOnly: true } },
  { path: '/about', name: 'about', component: () => import('@/views/public/AboutPage.vue') },
  { path: '/contact', name: 'contact', component: () => import('@/views/public/ContactPage.vue') },
  { path: '/privacy', name: 'privacy', component: () => import('@/views/public/PrivacyPage.vue') },
  { path: '/invitations/:token', name: 'invitation', component: () => import('@/views/caretaker/InvitationPage.vue') },
  // Dorm Finder (F1): anyone, signed in or not.
  { path: '/find', name: 'find', component: () => import('@/views/public/FinderPage.vue') },
  { path: '/listings/:id(\\d+)', name: 'listing', component: () => import('@/views/public/ListingPage.vue') },
  { path: '/listings/:id(\\d+)/apply', name: 'apply', component: () => import('@/views/boarder/ApplyPage.vue'), meta: { requiresAuth: true } },

  // Auth
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginPage.vue'), meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: () => import('@/views/auth/RegisterPage.vue'), meta: { guestOnly: true } },
  { path: '/check-email', name: 'check-email', component: () => import('@/views/auth/CheckEmailPage.vue'), meta: { guestOnly: true } },
  { path: '/forgot-password', name: 'forgot-password', component: () => import('@/views/auth/ForgotPasswordPage.vue'), meta: { guestOnly: true } },
  { path: '/reset-password', name: 'reset-password', component: () => import('@/views/auth/ResetPasswordPage.vue') },
  { path: '/email-verified', name: 'email-verified', component: () => import('@/views/auth/EmailVerifiedPage.vue') },
  // Confirmation links in emails land here (website or app), then go on to /email-verified.
  { path: '/verify-email/:id(\\d+)/:hash', name: 'verify-email', component: () => import('@/views/auth/ConfirmEmailPage.vue'), props: { kind: 'verify' } },
  { path: '/confirm-new-email/:id(\\d+)/:hash', name: 'confirm-new-email', component: () => import('@/views/auth/ConfirmEmailPage.vue'), props: { kind: 'change' } },

  // Any signed-in user (pushed over the tabs)
  { path: '/profile', name: 'profile', component: () => import('@/views/account/ProfilePage.vue'), meta: { requiresAuth: true } },
  { path: '/stay', name: 'stay', component: () => import('@/views/boarder/MyStayPage.vue'), meta: { requiresAuth: true, role: UserRole.Boarder } },
  { path: '/stay/house-rules', name: 'stay-house-rules', component: () => import('@/views/boarder/HouseRulesPage.vue'), meta: { requiresAuth: true, role: UserRole.Boarder } },
  { path: '/stay/visits', name: 'stay-visits', component: () => import('@/views/boarder/VisitsPage.vue'), meta: { requiresAuth: true, role: UserRole.Boarder } },
  { path: '/spending', name: 'spending', component: () => import('@/views/boarder/MySpendingPage.vue'), meta: { requiresAuth: true, role: UserRole.Boarder } },
  { path: '/stay/maintenance', name: 'stay-maintenance', component: () => import('@/views/boarder/MyRequestsPage.vue'), meta: { requiresAuth: true, role: UserRole.Boarder } },
  { path: '/groups', name: 'groups', component: () => import('@/views/groups/GroupsPage.vue'), meta: { requiresAuth: true } },
  { path: '/groups/:id(\\d+)', name: 'group', component: () => import('@/views/groups/GroupPage.vue'), meta: { requiresAuth: true } },
  { path: '/apply-owner', name: 'apply-owner', component: () => import('@/views/owner/ApplyOwnerPage.vue'), meta: { requiresAuth: true } },
  { path: '/owner/business', name: 'owner-business', component: () => import('@/views/owner/OwnerBusinessPage.vue'), meta: { requiresAuth: true, role: UserRole.Owner } },
  { path: '/owner/properties/new', name: 'property-new', component: () => import('@/views/owner/PropertyWizardPage.vue'), meta: { requiresAuth: true, role: UserRole.Owner } },
  // Owners and assigned caretakers; the API decides what each may see and do.
  { path: '/properties/:id(\\d+)', name: 'property', component: () => import('@/views/properties/PropertyPage.vue'), meta: { requiresAuth: true } },
  { path: '/reports', name: 'reports', component: () => import('@/views/account/ReportsPage.vue'), meta: { requiresAuth: true } },
  // Owner and Managers; the API refuses others and the screen says so.
  { path: '/insights', name: 'insights', component: () => import('@/views/account/InsightsPage.vue'), meta: { requiresAuth: true } },
  { path: '/insights/properties/:id(\\d+)', name: 'insights-property', component: () => import('@/views/account/PropertyInsightsPage.vue'), meta: { requiresAuth: true } },
  { path: '/insights/rooms/:id(\\d+)', name: 'insights-room', component: () => import('@/views/account/RoomInsightsPage.vue'), meta: { requiresAuth: true } },
  { path: '/insights/stays/:id(\\d+)', name: 'insights-stay', component: () => import('@/views/account/StayInsightsPage.vue'), meta: { requiresAuth: true } },
  // Owner and every caretaker (Collectors included); the API decides which properties.
  { path: '/collections', name: 'collections', component: () => import('@/views/account/CollectionsPage.vue'), meta: { requiresAuth: true } },
  { path: '/owner/activity', name: 'owner-activity', component: () => import('@/views/account/ActivityLogPage.vue'), props: { scope: 'owner' }, meta: { requiresAuth: true, role: UserRole.Owner } },
  { path: '/admin/activity', name: 'admin-activity', component: () => import('@/views/account/ActivityLogPage.vue'), props: { scope: 'admin' }, meta: { requiresAuth: true, role: UserRole.PlatformAdmin } },

  // Role areas
  roleArea(UserRole.Boarder, {
    home: () => import('@/views/boarder/BoarderHomePage.vue'),
    bookings: () => import('@/views/boarder/MyBookingsPage.vue'),
    bills: () => import('@/views/boarder/MyBillsPage.vue'),
  }),
  roleArea(UserRole.Owner, {
    home: () => import('@/views/owner/OwnerHomePage.vue'),
    properties: PropertiesListPage,
    applications: ApplicationsPage,
    caretakers: () => import('@/views/owner/OwnerCaretakersPage.vue'),
  }),
  roleArea(UserRole.Caretaker, {
    home: () => import('@/views/caretaker/CaretakerHomePage.vue'),
    properties: PropertiesListPage,
    applications: ApplicationsPage,
  }),
  roleArea(UserRole.PlatformAdmin, {
    overview: () => import('@/views/admin/AdminOverviewPage.vue'),
    owners: () => import('@/views/admin/AdminOwnersPage.vue'),
    users: () => import('@/views/admin/AdminUsersPage.vue'),
    campuses: () => import('@/views/admin/AdminCampusesPage.vue'),
  }),

  // Role-neutral links (emails, notifications) → the right role's area,
  // after the session is restored (a fresh page load from an email link).
  roleLink('/account', (auth) => `${auth.homePath}/account`),
  roleLink('/notifications', (auth) => `${auth.homePath}/notifications`),
  roleLink('/applications', (auth) => (auth.hasRole(UserRole.Owner) ? '/owner/applications' : '/caretaker/applications')),

  // Dev only (`vite dev`): a gallery of the DormLink components. Left out of production builds.
  ...(import.meta.env.DEV ? [{ path: '/dev/ui', component: () => import('@/views/dev/UiGalleryPage.vue') }] : []),

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return auth.homePath
  }
  if (to.meta.role && !auth.hasRole(to.meta.role)) {
    return auth.homePath
  }
  return true
})

export default router
