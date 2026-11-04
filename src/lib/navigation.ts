import type { Component } from 'vue'
import {
  Bookmark,
  Building2,
  ChartColumn,
  CircleUser,
  Download,
  FileText,
  HandCoins,
  House,
  Receipt,
  School,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-vue-next'
import { ROLE_HOME } from './roles'
import { UserRole } from '@/types/enums'

/**
 * Where each role can go (W1): the bottom tabs on phones and the sidebar on desktops come from here,
 * so both always list the same places. The router adds each tab's screen (router/index.ts).
 */
export interface NavItem {
  /** The tab's id inside the role area (`/<role>/<tab>`); not set for a link outside the tabs. */
  tab?: string
  href: string
  label: string
  /** A Lucide icon component. */
  icon: Component
  /** Shows the pending-applications count. */
  badge?: 'applications'
}

const tab = (role: UserRole, id: string, label: string, icon: Component, badge?: NavItem['badge']): NavItem =>
  ({ tab: id, href: `${ROLE_HOME[role]}/${id}`, label, icon, badge })

/** The bottom tabs of each role, in order. Account is last on every role. */
export const ROLE_TABS: Record<UserRole, NavItem[]> = {
  [UserRole.Boarder]: [
    tab(UserRole.Boarder, 'home', 'Home', House),
    tab(UserRole.Boarder, 'bookings', 'Bookings', Bookmark),
    tab(UserRole.Boarder, 'bills', 'Bills', Receipt),
    tab(UserRole.Boarder, 'account', 'Account', CircleUser),
  ],
  [UserRole.Owner]: [
    tab(UserRole.Owner, 'home', 'Home', House),
    tab(UserRole.Owner, 'properties', 'Properties', Building2),
    tab(UserRole.Owner, 'applications', 'Applications', FileText, 'applications'),
    tab(UserRole.Owner, 'caretakers', 'Caretakers', Users),
    tab(UserRole.Owner, 'account', 'Account', CircleUser),
  ],
  [UserRole.Caretaker]: [
    tab(UserRole.Caretaker, 'home', 'Home', House),
    tab(UserRole.Caretaker, 'properties', 'Properties', Building2),
    tab(UserRole.Caretaker, 'applications', 'Applications', FileText, 'applications'),
    tab(UserRole.Caretaker, 'account', 'Account', CircleUser),
  ],
  [UserRole.PlatformAdmin]: [
    tab(UserRole.PlatformAdmin, 'overview', 'Overview', ChartColumn),
    tab(UserRole.PlatformAdmin, 'owners', 'Owners', ShieldCheck),
    tab(UserRole.PlatformAdmin, 'users', 'Accounts', Users),
    tab(UserRole.PlatformAdmin, 'campuses', 'Campuses', School),
    tab(UserRole.PlatformAdmin, 'account', 'Account', CircleUser),
  ],
}

/**
 * Extra places the sidebar lists under the tabs: screens a phone reaches from a home card.
 * Insights is left out for caretakers because a Collector may not open it; Managers reach it from their home.
 */
export const SIDEBAR_MORE: Record<UserRole, NavItem[]> = {
  [UserRole.Boarder]: [
    { href: '/stay', label: 'My stay', icon: House },
    { href: '/groups', label: 'Room groups', icon: UsersRound },
    { href: '/spending', label: 'My spending', icon: Wallet },
  ],
  [UserRole.Owner]: [
    { href: '/insights', label: 'Insights', icon: ChartColumn },
    { href: '/collections', label: 'Collections', icon: HandCoins },
    { href: '/reports', label: 'Reports', icon: Download },
  ],
  [UserRole.Caretaker]: [
    { href: '/collections', label: 'Collections', icon: HandCoins },
    { href: '/reports', label: 'Reports', icon: Download },
  ],
  [UserRole.PlatformAdmin]: [],
}

/** Whether a menu item is the page being shown (its own path or a page under it). */
export function isActive(item: NavItem, path: string): boolean {
  return path === item.href || path.startsWith(`${item.href}/`)
}
