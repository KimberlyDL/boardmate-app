<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <BrandLogo slot="start" class="wordmark" />
        <ion-buttons slot="end"><NotificationBell /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="reload" />

      <div class="narrow page">
        <header class="greet">
          <p class="dl-eyebrow">{{ eyebrow }}</p>
          <h1 class="dl-h1">{{ greeting }}, <DlGradientText>{{ firstName }}</DlGradientText></h1>
          <div class="who">
            <span v-if="profile?.business_name" class="dl-small">{{ profile.business_name }}</span>
            <DlStatusTag v-if="status === OwnerVerificationStatus.Verified" status="verified">Verified owner</DlStatusTag>
          </div>
        </header>

        <!-- Verification state (Platform rule: verified before listings go public) -->
        <div v-if="status !== OwnerVerificationStatus.Verified" data-test="owner-status">
          <DlBanner :tone="statusCard.tone" :title="profile?.verification_label ?? 'Owner account'">
            {{ statusCard.text }}
            <template v-if="profile?.review_reason"><br /><strong>Reason:</strong> {{ profile.review_reason }}</template>
          </DlBanner>
          <ion-button v-if="status === OwnerVerificationStatus.Rejected" size="small" class="dl-tonal again" router-link="/apply-owner">
            Update and apply again
          </ion-button>
        </div>

        <!-- Dashboard (A10): totals, what waits, each property at a glance, latest activity -->
        <template v-if="!dashTried">
          <div class="grid2">
            <DlSkeleton :height="100" :radius="18" />
            <DlSkeleton :height="100" :radius="18" tone="brand" />
          </div>
          <DlSkeleton :height="160" :radius="18" />
        </template>

        <template v-else-if="dash?.properties.length">
          <div class="grid2">
            <DlStatCard v-if="totals.collected !== null" label="Collected this month" :value="short(totals.collected)" dark />
            <DlStatCard label="Occupancy" :value="`${totals.occupied}/${totals.places}`" :caption="`${totals.available} available`" />
            <DlStatCard
              v-if="totals.due"
              label="Due this week"
              :value="short(totals.due.centavos)"
              :caption="`${totals.due.bills} bill${totals.due.bills === 1 ? '' : 's'}`"
              tone="butter"
            />
            <DlStatCard
              v-if="totals.overdue"
              label="Overdue"
              :value="short(totals.overdue.centavos)"
              :caption="`${totals.overdue.payers} boarder${totals.overdue.payers === 1 ? '' : 's'}`"
              tone="coral"
            />
          </div>

          <todo-list :items="todo" :show-where="dash.properties.length > 1" />

          <DlSection title="Your places" link-label="All properties" to="/owner/properties">
            <property-glance v-for="d in dash.properties" :key="d.property.id" :d="d" />
          </DlSection>
        </template>

        <DlCard v-else-if="dash">
          <DlEmptyState note="let's get you set up" :icon="Building2" action-label="Add a property" to="/owner/properties/new">
            Add your first property: set up its rooms and prices, then publish the listing to take bookings.
          </DlEmptyState>
        </DlCard>

        <DlSection title="Manage">
          <DlCard padding="4px 16px">
            <DlListRow :icon="FileText" title="Pending applications" to="/owner/applications">
              <template #trailing>
                <DlStatusTag :tone="bookings.pendingCount ? 'brand' : 'neutral'">{{ bookings.pendingCount }}</DlStatusTag>
              </template>
            </DlListRow>
            <DlListRow
              :icon="Wallet"
              title="Business and payment details"
              :subtitle="hasPaymentDetails ? 'GCash / bank details saved' : 'Add how boarders should pay you'"
              to="/owner/business"
              divider
            >
              <template v-if="!hasPaymentDetails" #trailing><DlStatusTag tone="warning">To do</DlStatusTag></template>
            </DlListRow>
            <DlListRow :icon="Users" title="Caretakers" subtitle="Invite people to help run your place" to="/owner/caretakers" divider />
            <DlListRow :icon="Download" title="Reports" subtitle="Spreadsheets of bills, payments and more" to="/reports" divider />
          </DlCard>
        </DlSection>

        <DlSection v-if="dash?.recent_activity?.length" title="Recent activity" link-label="All activity" to="/owner/activity">
          <DlCard class="activity">
            <div v-for="a in dash.recent_activity" :key="a.id" class="event">
              <span class="dl-data when">{{ a.created_at ? when(a.created_at) : '' }}</span>
              <span class="what">
                <span class="dl-small strong">{{ a.description }}</span>
                <span class="dl-small">{{ a.actor.name }}<template v-if="a.note"> · {{ a.note }}</template></span>
              </span>
            </div>
          </DlCard>
        </DlSection>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonToolbar, onIonViewWillEnter } from '@ionic/vue'
import { Building2, Download, FileText, Users, Wallet } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import BrandLogo from '@/components/BrandLogo.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import PropertyGlance from '@/components/dashboard/PropertyGlance.vue'
import TodoList from '@/components/dashboard/TodoList.vue'
import {
  DlBanner,
  DlCard,
  DlEmptyState,
  DlGradientText,
  DlListRow,
  DlRefresher,
  DlSection,
  DlSkeleton,
  DlStatCard,
  DlStatusTag,
  type StatusTone,
} from '@/components/dl'
import { todoItems } from '@/lib/dashboardTodo'
import { manila } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { dashboardService } from '@/services/dashboard'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/bookings'
import { OwnerVerificationStatus } from '@/types/enums'
import type { MyDashboard, PropertyDashboard } from '@/types/dashboard'

const auth = useAuthStore()
const profile = computed(() => auth.user?.owner_profile)
const status = computed(() => profile.value?.verification_status)
const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')

const greeting = computed(() => {
  const h = manila().hour()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})

const hasPaymentDetails = computed(() => {
  const p = profile.value?.payment
  return !!(p?.gcash_number || p?.bank_account_number)
})

const statusCard = computed<{ tone: StatusTone; text: string }>(() => {
  switch (status.value) {
    case OwnerVerificationStatus.Rejected:
      return { tone: 'warning', text: 'We could not approve your application yet. Fix the details below and apply again.' }
    case OwnerVerificationStatus.Suspended:
      return { tone: 'danger', text: 'Your owner account is suspended and your listings are hidden. Contact DormLink support.' }
    default:
      return {
        tone: 'info',
        text: "We're reviewing your application. You can set things up in the meantime; listings stay hidden until you're verified.",
      }
  }
})

const bookings = useBookingStore()
const dash = ref<MyDashboard | null>(null)
/** The first dashboard request has finished (or failed): stop showing loading bones. */
const dashTried = ref(false)
const todo = computed(() => todoItems(dash.value?.properties ?? [], '/owner/applications'))

const eyebrow = computed(() => {
  const n = dash.value?.properties.length ?? 0
  return [manila().format('ddd D MMM'), n ? `${n} propert${n === 1 ? 'y' : 'ies'}` : null].filter(Boolean).join(' · ')
})

/** ₱38,450 rather than ₱38,450.00 on the big stat cards. */
const short = (centavos: number) => peso(centavos).replace('.00', '')

/** Adds up one figure across properties; null when no property shows it (e.g. a caretaker without money access). */
function sumOf<T>(ps: PropertyDashboard[], pick: (p: PropertyDashboard) => T | null, add: (a: T, b: T) => T): T | null {
  let total: T | null = null
  for (const p of ps) {
    const v = pick(p)
    if (v !== null) total = total === null ? v : add(total, v)
  }
  return total
}

/** Every property added up, for the top stat cards. */
const totals = computed(() => {
  const ps = dash.value?.properties ?? []
  return {
    places: ps.reduce((n, p) => n + p.occupancy.places, 0),
    occupied: ps.reduce((n, p) => n + p.occupancy.occupied, 0),
    available: ps.reduce((n, p) => n + p.occupancy.available, 0),
    collected: sumOf(ps, (p) => p.collected_this_month, (a, b) => a + b),
    due: sumOf(ps, (p) => p.due_this_week, (a, b) => ({ bills: a.bills + b.bills, centavos: a.centavos + b.centavos })),
    overdue: sumOf(ps, (p) => p.overdue, (a, b) => ({ payers: a.payers + b.payers, centavos: a.centavos + b.centavos })),
  }
})

/** "9:12" today, "Yday", or "12 Oct". */
function when(at: string): string {
  const t = manila(at)
  const today = manila()
  if (t.isSame(today, 'day')) return t.format('h:mm')
  if (t.isSame(today.subtract(1, 'day'), 'day')) return 'Yday'
  return t.format('D MMM')
}

function loadDashboard() {
  return dashboardService
    .mine()
    .then((d) => (dash.value = d))
    .catch(() => undefined)
    .finally(() => (dashTried.value = true))
}

function reload() {
  return Promise.all([auth.refresh().catch(() => undefined), bookings.refreshPending(), loadDashboard()])
}

// Pick up review decisions and new applications made while the app was open.
onIonViewWillEnter(() => {
  reload()
})
</script>

<style scoped>
.wordmark {
  margin-left: var(--screen-pad);
  font-size: 20px;
}
.page {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}
.greet {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
.who {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.again {
  margin: 8px 0 0;
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
  margin-bottom: 12px;
}
.activity {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.event {
  display: flex;
  gap: 12px;
}
.when {
  flex-shrink: 0;
  width: 44px;
  color: var(--text-muted);
}
.what {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.strong {
  font-weight: 700;
  color: var(--text-primary);
}
</style>
