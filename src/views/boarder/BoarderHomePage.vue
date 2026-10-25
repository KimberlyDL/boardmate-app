<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <BrandLogo slot="start" class="wordmark" />
        <ion-buttons slot="end"><NotificationBell /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="narrow page">
        <header class="greet">
          <p class="dl-eyebrow">{{ eyebrow }}</p>
          <h1 class="dl-h1">{{ greeting }}, <DlGradientText>{{ firstName }}</DlGradientText></h1>
        </header>

        <!-- Loading: bones in the shape of the cards -->
        <template v-if="!loaded">
          <DlSkeleton :height="190" :radius="18" />
          <div class="grid2"><DlSkeleton :height="96" :radius="18" tone="brand" /><DlSkeleton :height="96" :radius="18" /></div>
          <DlSkeleton :height="120" :radius="18" />
        </template>

        <template v-else-if="home?.stay">
          <!-- Money: the one ink card -->
          <DlCard v-if="home.money" tone="ink" :padding="20" class="bill" to="/boarder/bills">
            <div class="row">
              <span class="dl-eyebrow on-ink">{{ home.money.next_bill ? `BILL ${home.money.next_bill.number}` : 'MY BILLS' }}</span>
              <DlStatusTag v-if="home.money.overdue_centavos" status="overdue" />
              <DlStatusTag v-else-if="home.money.next_bill" status="due">Due {{ manilaDate(home.money.next_bill.due_on).format('D MMM') }}</DlStatusTag>
              <DlStatusTag v-else status="paid">All paid</DlStatusTag>
            </div>
            <template v-if="home.money.owed_centavos > 0">
              <span class="dl-small on-ink">Amount due</span>
              <span class="big">{{ peso(home.money.next_bill?.balance_centavos ?? home.money.owed_centavos) }}</span>
              <span class="dl-small on-ink-strong">
                You owe {{ peso(home.money.owed_centavos) }} in total<template v-if="home.money.overdue_centavos"> · {{ peso(home.money.overdue_centavos) }} is overdue</template>.
              </span>
            </template>
            <template v-else>
              <span class="big">All paid</span>
              <span class="dl-small on-ink-strong">Nothing to pay right now.</span>
            </template>
          </DlCard>

          <div v-if="home.money?.credit_centavos || home.group" class="grid2">
            <DlStatCard v-if="home.money" label="Credit" :value="peso(home.money.credit_centavos)" caption="Applied to your next bills" />
            <DlStatCard
              v-if="home.group"
              :label="home.group.owe_centavos ? 'Group · you owe' : 'Group · owed to you'"
              :value="peso(home.group.owe_centavos || home.group.owed_to_me_centavos)"
              :caption="home.group.owe_centavos || home.group.owed_to_me_centavos ? 'In your room group' : 'Everyone is even'"
              tone="butter"
              :to="`/groups/${home.group.id}`"
            />
          </div>

          <!-- Quick actions -->
          <nav class="quick" aria-label="Quick actions">
            <router-link v-for="a in quickActions" :key="a.label" :to="a.to" class="quick-item">
              <DlIconTile :icon="a.icon" />
              <span>{{ a.label }}</span>
            </router-link>
          </nav>

          <!-- What needs me -->
          <DlSection v-if="needs.length" title="Needs your attention">
            <DlCard padding="4px 16px" class="needs">
              <DlListRow
                v-for="(n, i) in needs"
                :key="n.text"
                :icon="n.icon"
                :title="n.text"
                :to="n.link"
                :divider="i > 0"
                :class="{ urgent: n.urgent }"
              />
            </DlCard>
          </DlSection>

          <!-- My stay -->
          <DlSection title="My unit" link-label="Details" to="/stay">
            <DlCard tone="pine" class="unit">
              <div class="row top">
                <div class="stack">
                  <span class="dl-title">Room {{ home.stay.room_label }}<template v-if="home.stay.unit_label"> · {{ home.stay.unit_label }}</template></span>
                  <span class="dl-data upper">{{ home.stay.property.name }}</span>
                  <span v-if="home.stay.leaving" class="dl-small leaving">
                    Last day {{ manilaDate(home.stay.leaving.end_on).format('MMM D, YYYY') }}{{ home.stay.leaving.approved ? '' : ' (waiting for approval)' }}
                  </span>
                </div>
                <DlIconTile :icon="BedSingle" tone="pine" :size="40" />
              </div>
              <div v-if="home.stay.emergency_numbers" class="emergency">
                <span class="dl-eyebrow">EMERGENCY NUMBERS</span>
                <p class="pre">{{ home.stay.emergency_numbers }}</p>
              </div>
            </DlCard>
          </DlSection>

          <!-- Room group (D5) -->
          <DlSection v-if="home.group" :title="home.group.is_leader ? 'My room group · leader' : 'My room group'" link-label="Open group" :to="`/groups/${home.group.id}`">
            <DlCard class="group">
              <p class="dl-body">
                <template v-if="home.group.owe_centavos">You owe {{ peso(home.group.owe_centavos) }}.</template>
                <template v-if="home.group.owed_to_me_centavos"> Others owe you {{ peso(home.group.owed_to_me_centavos) }}.</template>
                <template v-if="!home.group.owe_centavos && !home.group.owed_to_me_centavos">Everyone is even.</template>
              </p>
              <div v-if="home.group.members_owing_me?.length" class="owing">
                <div v-for="m in home.group.members_owing_me" :key="m.name ?? ''" class="owing-row">
                  <DlAvatar :name="m.name ?? '?'" :size="32" />
                  <span>{{ m.name }}: {{ peso(m.amount_centavos) }}</span>
                </div>
              </div>
            </DlCard>
          </DlSection>
        </template>

        <!-- Not staying anywhere: the reservation, or finding a place -->
        <template v-else>
          <DlCard v-if="reservation" tone="pine" class="reserve" to="/boarder/bookings">
            <span class="dl-eyebrow">YOUR RESERVATION</span>
            <span class="dl-title">{{ reservation.property.name }}</span>
            <span class="dl-small ink">{{ reservation.unit?.label }} · move in by {{ manilaDate(reservation.reserved_until!).format('MMM D, YYYY') }}</span>
          </DlCard>

          <DlCard v-else class="find">
            <DlIconTile :icon="Search" />
            <h2 class="dl-h2">Find a place to stay</h2>
            <p class="dl-body find-copy">Search dorms, boarding houses and bedspaces by area, price and what is included.</p>
            <p v-if="pending" class="dl-small">You have {{ pending }} application{{ pending > 1 ? 's' : '' }} waiting.</p>
            <ion-button router-link="/find">Browse places</ion-button>
          </DlCard>
        </template>

        <!-- Always: messages and the emergency contact -->
        <DlCard v-if="loaded && (home?.unread_notifications || !auth.user?.boarder_profile?.emergency_contact_phone)" padding="4px 16px">
          <DlListRow
            v-if="home?.unread_notifications"
            :icon="Bell"
            :title="`${home.unread_notifications} new message${home.unread_notifications === 1 ? '' : 's'}`"
            to="/boarder/notifications"
          />
          <DlListRow
            v-if="!auth.user?.boarder_profile?.emergency_contact_phone"
            :icon="Phone"
            title="Add an emergency contact"
            subtitle="So your boarding house can reach someone if something happens."
            to="/profile"
            :divider="!!home?.unread_notifications"
          />
        </DlCard>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonToolbar, onIonViewWillEnter } from '@ionic/vue'
import { BedSingle, Bell, CircleAlert, CircleCheck, DoorOpen, Phone, ScrollText, Search, Users, Wallet, Wrench } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import BrandLogo from '@/components/BrandLogo.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import {
  DlAvatar,
  DlCard,
  DlGradientText,
  DlIconTile,
  DlListRow,
  DlRefresher,
  DlSection,
  DlSkeleton,
  DlStatCard,
  DlStatusTag,
  type IconComponent,
} from '@/components/dl'
import { manila, manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { bookingService } from '@/services/bookings'
import { dashboardService } from '@/services/dashboard'
import { useAuthStore } from '@/stores/auth'
import type { BookingApplication } from '@/types/booking'
import type { TenantHome } from '@/types/dashboard'

/** The boarder's home (A10): what needs them, their stay and money, their room group, and emergency numbers. */
const auth = useAuthStore()
const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')
const home = ref<TenantHome | null>(null)
const reservation = ref<BookingApplication | null>(null)
const pending = ref(0)
const loaded = ref(false)

const greeting = computed(() => {
  const h = manila().hour()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})

/** "SANTOS HOUSE · ROOM 203" while staying, else today's date. */
const eyebrow = computed(() => {
  const stay = home.value?.stay
  if (stay) return [stay.property.name, stay.room_label ? `Room ${stay.room_label}` : null].filter(Boolean).join(' · ')
  return manila().format('ddd D MMM')
})

const quickActions: { label: string; to: string; icon: IconComponent }[] = [
  { label: 'Report issue', to: '/stay/maintenance', icon: Wrench },
  { label: 'Visitor', to: '/stay/visits', icon: Users },
  { label: 'Late entry', to: '/stay/visits', icon: DoorOpen },
  { label: 'House rules', to: '/stay/house-rules', icon: ScrollText },
]

/** Things waiting on me, overdue money first. */
const needs = computed(() => {
  const h = home.value
  if (!h?.stay) return []
  const rows: { text: string; link: string; icon: IconComponent; urgent?: boolean }[] = []
  if (h.money?.overdue_centavos) rows.push({ text: `${peso(h.money.overdue_centavos)} overdue`, link: '/boarder/bills', icon: Wallet, urgent: true })
  if (h.house_rules_to_accept) rows.push({ text: 'New house rules to accept', link: '/stay/house-rules', icon: ScrollText })
  if (h.requests?.repairs_to_confirm) rows.push({ text: `Is it fixed? ${h.requests.repairs_to_confirm} repair${h.requests.repairs_to_confirm === 1 ? '' : 's'} to confirm`, link: '/stay/maintenance', icon: CircleCheck })
  const waiting = (h.requests?.late_entries_waiting ?? 0) + (h.requests?.visitors_waiting ?? 0)
  if (waiting) rows.push({ text: `${waiting} request${waiting === 1 ? '' : 's'} waiting for the owner`, link: '/stay/visits', icon: Users })
  if (h.requests?.repairs_open) rows.push({ text: `${h.requests.repairs_open} repair${h.requests.repairs_open === 1 ? '' : 's'} in progress`, link: '/stay/maintenance', icon: CircleAlert })
  return rows
})

async function load() {
  try {
    home.value = await dashboardService.home()
  } catch {
    // The cards below still work without it.
  }
  if (!home.value?.stay) {
    try {
      const { items } = await bookingService.mine()
      reservation.value = items.find((a) => a.status === 'approved') ?? null
      pending.value = items.filter((a) => a.status === 'pending').length
    } catch {
      // Same.
    }
  }
  loaded.value = true
}

onIonViewWillEnter(load)
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
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.row.top {
  align-items: flex-start;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}
.grid2 > :only-child {
  grid-column: 1 / -1;
}
.bill {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.on-ink {
  color: var(--text-on-ink-muted);
}
.on-ink-strong {
  color: var(--text-on-ink);
}
.big {
  font-family: var(--font-display);
  font-size: 40px;
  line-height: 44px;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.quick {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 4px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
}
.quick-item:active {
  transform: scale(0.97);
}
.needs .urgent :deep(.dl-icon-tile) {
  background: var(--danger-subtle);
  color: var(--danger-text);
}
.unit {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.upper {
  text-transform: uppercase;
}
.leaving {
  color: inherit;
}
.emergency {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.emergency .dl-eyebrow {
  color: inherit;
  opacity: 0.8;
}
.pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 14px;
}
.group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.group p {
  margin: 0;
}
.owing {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.owing-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
}
.reserve {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ink {
  color: inherit;
}
.find {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.find h2,
.find p {
  margin: 0;
}
.find-copy {
  color: var(--text-secondary);
}
.find ion-button {
  margin: 4px 0 0;
}
</style>
