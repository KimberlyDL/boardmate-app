import { createRouter, createWebHistory } from '@ionic/vue-router'
import { RouteRecordRaw } from 'vue-router'
import { Bookmark, Building2, CircleUser, FileText, House, Receipt, School, ShieldCheck, Users } from 'lucide-vue-next'
import { markRaw } from 'vue'
import RoleTabsLayout, { type RoleTab } from '@/layouts/RoleTabsLayout.vue'
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
 * Builds one role's bottom-tab area: /<base>/<tab>, with Account on every role.
 * Notifications lives in the area too (/<base>/notifications) but has no tab: the bell opens it.
 */
function roleArea(base: string, role: UserRole, tabs: (RoleTab & { component: () => Promise<unknown> })[]): RouteRecordRaw {
  const all = [...tabs, { tab: 'account', href: `${base}/account`, label: 'Account', icon: CircleUser, component: AccountPage }]

  return {
    path: `${base}/`,
    component: RoleTabsLayout,
    props: { tabs: all.map(({ tab, href, label, icon }) => ({ tab, href, label, icon: markRaw(icon) })) },
    meta: { requiresAuth: true, role },
    children: [
      { path: '', redirect: all[0].href },
      ...all.map((t) => ({ path: t.tab, component: t.component })),
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
  { path: '/', name: 'home', component: () => import('@/views/public/HomePage.vue'), meta: { guestOnly: true } },
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

  // Any signed-in user (pushed over the tabs)
  { path: '/profile', name: 'profile', component: () => import('@/views/account/ProfilePage.vue'), meta: { requiresAuth: true } },
  { path: '/stay', name: 'stay', component: () => import('@/views/boarder/MyStayPage.vue'), meta: { requiresAuth: true, role: UserRole.Boarder } },
  { path: '/stay/house-rules', name: 'stay-house-rules', component: () => import('@/views/boarder/HouseRulesPage.vue'), meta: { requiresAuth: true, role: UserRole.Boarder } },
  { path: '/stay/visits', name: 'stay-visits', component: () => import('@/views/boarder/VisitsPage.vue'), meta: { requiresAuth: true, role: UserRole.Boarder } },
  { path: '/stay/maintenance', name: 'stay-maintenance', component: () => import('@/views/boarder/MyRequestsPage.vue'), meta: { requiresAuth: true, role: UserRole.Boarder } },
  { path: '/groups', name: 'groups', component: () => import('@/views/groups/GroupsPage.vue'), meta: { requiresAuth: true } },
  { path: '/groups/:id(\\d+)', name: 'group', component: () => import('@/views/groups/GroupPage.vue'), meta: { requiresAuth: true } },
  { path: '/apply-owner', name: 'apply-owner', component: () => import('@/views/owner/ApplyOwnerPage.vue'), meta: { requiresAuth: true } },
  { path: '/owner/business', name: 'owner-business', component: () => import('@/views/owner/OwnerBusinessPage.vue'), meta: { requiresAuth: true, role: UserRole.Owner } },
  { path: '/owner/properties/new', name: 'property-new', component: () => import('@/views/owner/PropertyWizardPage.vue'), meta: { requiresAuth: true, role: UserRole.Owner } },
  // Owners and assigned caretakers; the API decides what each may see and do.
  { path: '/properties/:id(\\d+)', name: 'property', component: () => import('@/views/properties/PropertyPage.vue'), meta: { requiresAuth: true } },
  { path: '/reports', name: 'reports', component: () => import('@/views/account/ReportsPage.vue'), meta: { requiresAuth: true } },
  { path: '/owner/activity', name: 'owner-activity', component: () => import('@/views/account/ActivityLogPage.vue'), props: { scope: 'owner' }, meta: { requiresAuth: true, role: UserRole.Owner } },
  { path: '/admin/activity', name: 'admin-activity', component: () => import('@/views/account/ActivityLogPage.vue'), props: { scope: 'admin' }, meta: { requiresAuth: true, role: UserRole.PlatformAdmin } },

  // Role areas
  roleArea('/boarder', UserRole.Boarder, [
    { tab: 'home', href: '/boarder/home', label: 'Home', icon: House, component: () => import('@/views/boarder/BoarderHomePage.vue') },
    { tab: 'bookings', href: '/boarder/bookings', label: 'Bookings', icon: Bookmark, component: () => import('@/views/boarder/MyBookingsPage.vue') },
    { tab: 'bills', href: '/boarder/bills', label: 'Bills', icon: Receipt, component: () => import('@/views/boarder/MyBillsPage.vue') },
  ]),
  roleArea('/owner', UserRole.Owner, [
    { tab: 'home', href: '/owner/home', label: 'Home', icon: House, component: () => import('@/views/owner/OwnerHomePage.vue') },
    { tab: 'properties', href: '/owner/properties', label: 'Properties', icon: Building2, component: PropertiesListPage },
    { tab: 'applications', href: '/owner/applications', label: 'Applications', icon: FileText, component: ApplicationsPage },
    { tab: 'caretakers', href: '/owner/caretakers', label: 'Caretakers', icon: Users, component: () => import('@/views/owner/OwnerCaretakersPage.vue') },
  ]),
  roleArea('/caretaker', UserRole.Caretaker, [
    { tab: 'home', href: '/caretaker/home', label: 'Home', icon: House, component: () => import('@/views/caretaker/CaretakerHomePage.vue') },
    { tab: 'properties', href: '/caretaker/properties', label: 'Properties', icon: Building2, component: PropertiesListPage },
    { tab: 'applications', href: '/caretaker/applications', label: 'Applications', icon: FileText, component: ApplicationsPage },
  ]),
  roleArea('/admin', UserRole.PlatformAdmin, [
    { tab: 'owners', href: '/admin/owners', label: 'Owners', icon: ShieldCheck, component: () => import('@/views/admin/AdminOwnersPage.vue') },
    { tab: 'users', href: '/admin/users', label: 'Accounts', icon: Users, component: () => import('@/views/admin/AdminUsersPage.vue') },
    { tab: 'campuses', href: '/admin/campuses', label: 'Campuses', icon: School, component: () => import('@/views/admin/AdminCampusesPage.vue') },
  ]),

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
