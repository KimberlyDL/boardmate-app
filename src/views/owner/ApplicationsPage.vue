<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Applications</ion-title>
        <ion-buttons slot="end"><NotificationBell /></ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="status" :scrollable="true" @ion-change="setStatus(String($event.detail.value))">
          <ion-segment-button value="pending"><ion-label>Pending ({{ store.pendingCount }})</ion-label></ion-segment-button>
          <ion-segment-button value="approved"><ion-label>Reserved</ion-label></ion-segment-button>
          <ion-segment-button value="moved_in"><ion-label>Moved in</ion-label></ion-segment-button>
          <ion-segment-button value="declined"><ion-label>Declined</ion-label></ion-segment-button>
          <ion-segment-button value="cancelled"><ion-label>Cancelled</ion-label></ion-segment-button>
          <ion-segment-button value="expired"><ion-label>Expired</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="narrow page">
        <template v-if="loading && !items.length">
          <DlSkeleton v-for="n in 2" :key="n" :height="170" :radius="18" />
        </template>
        <DlCard v-else-if="!items.length">
          <DlEmptyState note="nothing here" :icon="FileText">No applications in this list.</DlEmptyState>
        </DlCard>

        <DlCard v-for="a in items" :key="a.id" class="app">
          <div class="head">
            <DlAvatar :name="a.applicant?.name ?? '?'" :src="a.applicant?.photo_url" :size="44" />
            <span class="who">
              <span class="dl-title">{{ a.applicant?.name }}</span>
              <span class="dl-data upper">
                {{ a.property.name }}
                <template v-if="a.unit"> · {{ a.unit.room_label ? `Room ${a.unit.room_label} · ` : '' }}{{ a.unit.label }}</template>
                <template v-else-if="a.room"> · wants {{ a.wants_whole ? 'the whole of ' : '' }}room {{ a.room.label }}</template>
              </span>
            </span>
            <DlStatusTag :tone="statusTone[a.status] ?? 'neutral'">{{ a.status_label }}</DlStatusTag>
          </div>

          <div class="facts">
            <span class="fact"><Phone :size="14" aria-hidden="true" /> {{ a.applicant?.phone }} · {{ a.applicant?.email }}</span>
            <span class="fact">
              <Calendar :size="14" aria-hidden="true" />
              <span>Move-in <strong>{{ manilaDate(a.planned_move_in_on).format('MMM D, YYYY') }}</strong> · applied {{ manila(a.created_at).format('MMM D') }}</span>
            </span>
          </div>

          <p v-if="a.message" class="message">“{{ a.message }}”</p>
          <a v-if="a.id_document_url" :href="a.id_document_url" target="_blank" rel="noopener" class="id-link"><FileText :size="16" aria-hidden="true" /> View ID</a>
          <p v-else-if="a.id_document_purged" class="dl-small">ID deleted (30 days after closing)</p>

          <p v-if="a.status === 'approved'" class="line">
            Reserved until <strong>{{ manilaDate(a.reserved_until!).format('MMM D, YYYY') }}</strong>
            <span v-if="a.decided_by"> · approved by {{ a.decided_by }}</span>
          </p>
          <p v-if="a.status === 'approved' && a.leader_on_move_in" class="dl-small">Will be the leader of their room.</p>
          <p v-if="a.status === 'approved' && a.planned_occupants?.length" class="dl-small">
            Also staying: {{ a.planned_occupants.map((o) => o.name).join(', ') }}
          </p>
          <p v-if="a.closed_reason" class="dl-small">{{ a.closed_reason }}</p>

          <div v-if="a.status === 'pending' || a.status === 'approved'" class="actions">
            <template v-if="a.status === 'pending'">
              <ion-button @click="approve(a)">Approve</ion-button>
              <ion-button class="dl-tonal" @click="decline(a)">Decline</ion-button>
            </template>
            <template v-if="a.status === 'approved'">
              <ion-button @click="movingIn = a"><KeyRound slot="start" :size="18" aria-hidden="true" /> Move in</ion-button>
              <ion-button fill="outline" color="danger" @click="cancel(a)">Cancel reservation</ion-button>
            </template>
          </div>
        </DlCard>

        <ion-infinite-scroll :disabled="page >= lastPage" @ion-infinite="more">
          <ion-infinite-scroll-content />
        </ion-infinite-scroll>
      </div>

      <approve-modal :application="approving?.application ?? null" :units="approving?.units ?? []" @close="approving = null" @approved="approved" />
      <move-in-modal
        :open="!!movingIn"
        :property="{ id: movingIn?.property.id ?? 0, name: movingIn?.property.name ?? '' }"
        :application="movingIn"
        @close="movingIn = null"
        @done="movedIn"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type InfiniteScrollCustomEvent,
  alertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Calendar, FileText, KeyRound, Phone } from 'lucide-vue-next'
import { ref } from 'vue'
import NotificationBell from '@/components/NotificationBell.vue'
import { manila, manilaDate } from '@/lib/dayjs'
import ApproveModal from '@/components/tenancy/ApproveModal.vue'
import MoveInModal from '@/components/tenancy/MoveInModal.vue'
import { DlAvatar, DlCard, DlEmptyState, DlRefresher, DlSkeleton, DlStatusTag } from '@/components/dl'
import type { TagTone } from '@/lib/tones'
import { errorMessage, firstError } from '@/services/api'
import { bookingService } from '@/services/bookings'
import { useBookingStore } from '@/stores/bookings'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { BookableUnit, BookingApplication } from '@/types/booking'

/** Owner and Manager caretakers: review applications for the properties they run. */

const statusTone: Record<string, TagTone> = {
  pending: 'warning',
  approved: 'success',
  moved_in: 'brand',
  declined: 'danger',
  cancelled: 'neutral',
  expired: 'neutral',
}
const toast = useToast()
const prompt = usePrompt()
const store = useBookingStore()

const status = ref('pending')
const items = ref<BookingApplication[]>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)
const approving = ref<{ application: BookingApplication; units: BookableUnit[] } | null>(null)
const movingIn = ref<BookingApplication | null>(null)

async function load(reset = true) {
  loading.value = true
  try {
    const { items: found, meta } = await bookingService.list(status.value, undefined, reset ? 1 : page.value + 1)
    items.value = reset ? found : [...items.value, ...found]
    page.value = meta.current_page
    lastPage.value = meta.last_page
    store.pendingCount = meta.pending_count
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(() => load())

function setStatus(value: string) {
  status.value = value
  load()
}


async function more(event: InfiniteScrollCustomEvent) {
  await load(false)
  event.target.complete()
}

async function approve(a: BookingApplication) {
  try {
    const { units } = await bookingService.get(a.id)
    if (!units.length) return toast.error('No unit is free right now. Free one up or decline.')
    approving.value = { application: a, units }
  } catch (e) {
    toast.error(firstError(e))
  }
}

async function approved(message: string) {
  approving.value = null
  toast.success(message)
  await load()
}

async function movedIn(message: string) {
  movingIn.value = null
  toast.success(message)
  await load()
}

async function decline(a: BookingApplication) {
  const alert = await alertController.create({
    header: 'Decline application',
    message: `${a.applicant?.name} will be told. A reason is optional.`,
    inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Reason (optional)' }],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Decline', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  try {
    await bookingService.decline(a.id, (data?.values?.reason ?? '').trim() || undefined)
    toast.info('Declined.')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function cancel(a: BookingApplication) {
  const reason = await prompt.reason('Cancel reservation', `${a.unit?.label} becomes available again. ${a.applicant?.name} will be told why.`, 'Cancel reservation')
  if (!reason) return
  try {
    await bookingService.cancelReservation(a.id, reason)
    toast.info('Reservation cancelled.')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}
.app {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.who {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.upper {
  text-transform: uppercase;
  color: var(--text-muted);
}
.facts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fact {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}
.message {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  font-size: 14px;
  color: var(--text-secondary);
}
.id-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-primary);
  text-decoration: none;
}
.line {
  margin: 0;
  font-size: 14px;
}
.dl-small {
  margin: 0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.actions ion-button {
  margin: 0;
}
</style>
