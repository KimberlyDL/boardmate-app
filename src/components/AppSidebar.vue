<template>
  <nav class="app-sidebar" aria-label="Main">
    <a class="brand-link" :href="home" @click.prevent="go(home)"><BrandLogo /></a>

    <ul class="items">
      <li v-for="item in main" :key="item.href">
        <a :href="item.href" class="item" :class="{ on: isActive(item, route.path) }" :aria-current="isActive(item, route.path) ? 'page' : undefined" @click.prevent="go(item.href)">
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span class="label">{{ item.label }}</span>
          <span v-if="item.badge === 'applications' && bookings.pendingCount" class="count">{{ bookings.pendingCount }}</span>
        </a>
      </li>
    </ul>

    <template v-if="more.length">
      <p class="dl-eyebrow heading">More</p>
      <ul class="items">
        <li v-for="item in more" :key="item.href">
          <a :href="item.href" class="item" :class="{ on: isActive(item, route.path) }" :aria-current="isActive(item, route.path) ? 'page' : undefined" @click.prevent="go(item.href)">
            <component :is="item.icon" :size="20" aria-hidden="true" />
            <span class="label">{{ item.label }}</span>
          </a>
        </li>
      </ul>
    </template>

    <div class="bottom">
      <a :href="`${home}/notifications`" class="item" :class="{ on: route.path === `${home}/notifications` }" @click.prevent="go(`${home}/notifications`)">
        <Bell :size="20" aria-hidden="true" />
        <span class="label">Notifications</span>
        <span v-if="notifications.unreadCount" class="count">{{ notifications.unreadCount }}</span>
      </a>
      <a :href="`${home}/account`" class="me" :class="{ on: route.path === `${home}/account` }" @click.prevent="go(`${home}/account`)">
        <DlAvatar :name="auth.user?.name ?? '?'" :src="auth.user?.photo_url" :size="36" />
        <span class="who">
          <span class="name">{{ auth.user?.name }}</span>
          <span class="role">{{ roleLabel }}</span>
        </span>
      </a>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useIonRouter } from '@ionic/vue'
import { Bell } from 'lucide-vue-next'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import { DlAvatar } from '@/components/dl'
import { isActive, ROLE_TABS, SIDEBAR_MORE } from '@/lib/navigation'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/bookings'
import { useNotificationStore } from '@/stores/notifications'
import { UserRole, UserRoleLabels } from '@/types/enums'

/**
 * The desktop sidebar (W1, 992 px and up): the role's tabs, then the places a phone reaches from
 * home cards, then notifications and the account. It stays on every signed-in screen, including
 * screens opened over the tabs (a property, Insights). Phones keep the bottom tabs instead.
 */
const auth = useAuthStore()
const route = useRoute()
const ionRouter = useIonRouter()
const bookings = useBookingStore()
const notifications = useNotificationStore()

const role = computed(() => auth.user?.active_role ?? UserRole.Boarder)
const home = computed(() => auth.homePath)
const main = computed(() => ROLE_TABS[role.value].filter((t) => t.tab !== 'account'))
const more = computed(() => SIDEBAR_MORE[role.value])
const roleLabel = computed(() => UserRoleLabels[role.value])

/**
 * Opens a page the way a side menu should in Ionic: as a fresh start ("root"), like tapping a
 * bottom tab, so the page stack never mixes the tabs with the screens opened over them.
 */
function go(href: string) {
  if (route.path !== href) ionRouter.navigate(href, 'root', 'replace')
}

onMounted(() => {
  notifications.refreshCount()
  if (main.value.some((t) => t.badge === 'applications')) bookings.refreshPending()
})
</script>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: var(--sidebar-width);
  height: 100%;
  box-sizing: border-box;
  padding: 20px 12px 16px;
  overflow-y: auto;
  border-right: 1px solid var(--border-default);
  background: var(--bg-surface);
}
.brand-link {
  display: block;
  padding: 4px 12px 20px;
  text-decoration: none;
}
.items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.heading {
  margin: 20px 12px 6px;
}
.item,
.me {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--tap-min);
  padding: 0 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 600;
  text-decoration: none;
  transition: background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out);
}
.item:hover,
.me:hover {
  background: var(--bg-muted);
  color: var(--text-primary);
}
.item:focus-visible,
.me:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.item.on,
.me.on {
  background: var(--brand-primary-subtle);
  color: var(--brand-primary);
}
.label {
  flex: 1;
  min-width: 0;
}
.count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--brand-primary);
  color: var(--text-on-primary);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.bottom {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-default);
}
.me {
  min-height: 56px;
}
.who {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.role {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
}
</style>
