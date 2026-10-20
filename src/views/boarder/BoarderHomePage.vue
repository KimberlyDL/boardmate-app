<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>DormLink</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <h2>Hi, {{ firstName }}</h2>

        <template v-if="home?.stay">
          <!-- Things that need me -->
          <ion-list v-if="needs.length" inset class="needs">
            <ion-item v-for="n in needs" :key="n.link" button :router-link="n.link" detail>
              <ion-label class="ion-text-wrap" :class="{ warn: n.urgent }">{{ n.text }}</ion-label>
            </ion-item>
          </ion-list>

          <!-- My stay -->
          <ion-card color="success" button router-link="/stay">
            <ion-card-header>
              <ion-card-subtitle>Your stay</ion-card-subtitle>
              <ion-card-title>{{ home.stay.property.name }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              Room {{ home.stay.room_label }}<template v-if="home.stay.unit_label"> · {{ home.stay.unit_label }}</template>
              <template v-if="home.stay.leaving">
                <br />Last day {{ manilaDate(home.stay.leaving.end_on).format('MMM D, YYYY') }}{{ home.stay.leaving.approved ? '' : ' (waiting for approval)' }}
              </template>
            </ion-card-content>
          </ion-card>

          <!-- Money -->
          <ion-card v-if="home.money" button router-link="/boarder/bills">
            <ion-card-content>
              <template v-if="home.money.owed_centavos > 0">
                <strong>You owe {{ peso(home.money.owed_centavos) }}</strong>
                <p v-if="home.money.overdue_centavos" class="warn">{{ peso(home.money.overdue_centavos) }} is overdue.</p>
                <p v-if="home.money.next_bill">
                  Next: {{ home.money.next_bill.number }}, {{ peso(home.money.next_bill.balance_centavos) }} due
                  {{ manilaDate(home.money.next_bill.due_on).format('MMM D') }}.
                </p>
              </template>
              <strong v-else>All paid</strong>
              <p v-if="home.money.credit_centavos">You have {{ peso(home.money.credit_centavos) }} credit for your next bills.</p>
            </ion-card-content>
          </ion-card>

          <!-- Room group (D5) -->
          <ion-card v-if="home.group" button :router-link="`/groups/${home.group.id}`">
            <ion-card-content>
              <strong>Room group</strong>
              <p>
                <template v-if="home.group.owe_centavos">You owe {{ peso(home.group.owe_centavos) }}.</template>
                <template v-if="home.group.owed_to_me_centavos"> Others owe you {{ peso(home.group.owed_to_me_centavos) }}.</template>
                <template v-if="!home.group.owe_centavos && !home.group.owed_to_me_centavos">Everyone is even.</template>
              </p>
              <ul v-if="home.group.members_owing_me?.length" class="owing">
                <li v-for="m in home.group.members_owing_me" :key="m.name ?? ''">{{ m.name }}: {{ peso(m.amount_centavos) }}</li>
              </ul>
            </ion-card-content>
          </ion-card>

          <!-- Emergency numbers -->
          <ion-card v-if="home.stay.emergency_numbers">
            <ion-card-content>
              <strong>Emergency numbers</strong>
              <p class="pre">{{ home.stay.emergency_numbers }}</p>
            </ion-card-content>
          </ion-card>
        </template>

        <!-- Not staying anywhere: the reservation, or finding a place -->
        <template v-else-if="loaded">
          <ion-card v-if="reservation" color="success" button router-link="/boarder/bookings">
            <ion-card-header>
              <ion-card-subtitle>Your reservation</ion-card-subtitle>
              <ion-card-title>{{ reservation.property.name }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              {{ reservation.unit?.label }} · move in by {{ manilaDate(reservation.reserved_until!).format('MMM D, YYYY') }}
            </ion-card-content>
          </ion-card>

          <ion-card v-else button router-link="/find">
            <ion-card-header>
              <ion-card-title>Find a place to stay</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>Search dorms, boarding houses and bedspaces by area, price and what is included.</p>
              <p v-if="pending" class="muted">You have {{ pending }} application{{ pending > 1 ? 's' : '' }} waiting.</p>
            </ion-card-content>
          </ion-card>
        </template>

        <ion-card v-if="home?.unread_notifications" button router-link="/boarder/notifications">
          <ion-card-content>
            <strong>{{ home.unread_notifications }} new message{{ home.unread_notifications === 1 ? '' : 's' }}</strong>
          </ion-card-content>
        </ion-card>

        <ion-card v-if="!auth.user?.boarder_profile?.emergency_contact_phone" button router-link="/profile">
          <ion-card-content>
            <strong>Add an emergency contact</strong>
            <p>So your boarding house can reach someone if something happens.</p>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type RefresherCustomEvent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { computed, ref } from 'vue'
import { manilaDate } from '@/lib/dayjs'
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

/** Things waiting on me, overdue money first. */
const needs = computed(() => {
  const h = home.value
  if (!h?.stay) return []
  const rows: { text: string; link: string; urgent?: boolean }[] = []
  if (h.money?.overdue_centavos) rows.push({ text: `${peso(h.money.overdue_centavos)} overdue`, link: '/boarder/bills', urgent: true })
  if (h.house_rules_to_accept) rows.push({ text: 'New house rules to accept', link: '/stay/house-rules' })
  if (h.requests?.repairs_to_confirm) rows.push({ text: `Is it fixed? ${h.requests.repairs_to_confirm} repair${h.requests.repairs_to_confirm === 1 ? '' : 's'} to confirm`, link: '/stay/maintenance' })
  const waiting = (h.requests?.late_entries_waiting ?? 0) + (h.requests?.visitors_waiting ?? 0)
  if (waiting) rows.push({ text: `${waiting} request${waiting === 1 ? '' : 's'} waiting for the owner`, link: '/stay/visits' })
  if (h.requests?.repairs_open) rows.push({ text: `${h.requests.repairs_open} repair${h.requests.repairs_open === 1 ? '' : 's'} in progress`, link: '/stay/maintenance' })
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

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
}
</script>

<style scoped>
.warn {
  color: var(--ion-color-danger);
}
.pre {
  white-space: pre-wrap;
}
.owing {
  margin: 4px 0 0;
  padding-left: 20px;
}
</style>
