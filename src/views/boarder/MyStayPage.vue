<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/boarder/home" /></ion-buttons>
        <ion-title>My stay</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="narrow page">
        <template v-if="loading">
          <DlSkeleton :height="200" :radius="18" tone="brand" />
          <DlSkeleton :height="140" :radius="18" />
        </template>
        <DlCard v-else-if="!stay">
          <DlEmptyState note="no stay yet" :icon="House" action-label="Find a place" to="/find">You are not moved in anywhere yet.</DlEmptyState>
        </DlCard>

        <template v-else>
          <!-- The stay -->
          <DlCard tone="pine" :padding="20" class="stay">
            <div class="row top">
              <div class="stack">
                <span class="dl-eyebrow inherit">Room {{ stay.room.label }} · {{ stay.unit.label }}</span>
                <h1 class="dl-h2 name">{{ stay.property.name }}</h1>
              </div>
              <DlIconTile :icon="BedSingle" tone="pine" :size="40" />
            </div>
            <span class="rent">
              {{ peso(stay.rent_after_discount_centavos) }} / month<template v-if="stay.discount">
                <span class="dl-small inherit"> (agreed rate: {{ peso(stay.discount.amount_centavos) }} off {{ peso(stay.rent_centavos) }})</span></template>
            </span>
            <p class="dl-small inherit">
              Moved in <strong>{{ manilaDate(stay.moved_in_on).format('MMM D, YYYY') }}</strong>. Your rent is due every month on the
              <strong>{{ stay.anchor_day }}</strong>. Next: <strong>{{ manilaDate(stay.next_rent_due_on).format('MMM D, YYYY') }}</strong>.
              <template v-if="stay.scheduled_discount">
                From {{ manilaDate(stay.scheduled_discount.effective_from).format('MMM D, YYYY') }} your agreed rate changes.
              </template>
              Utilities are billed after each month, for what you used.
            </p>
          </DlCard>

          <!-- A sample 3D model of the room -->
          <DlSection v-if="can3d && roomShape" :title="`Room ${stay.room.label} in 3D`">
            <DlCard :padding="12">
              <Room3D :room="roomShape" />
            </DlCard>
          </DlSection>

          <!-- New house rules to accept (D3) -->
          <DlBanner v-if="rules?.needs_acceptance" tone="info" :title="`New house rules (version ${rules.current?.version})`" action-label="Review" to="/stay/house-rules">
            Please read and accept them.
          </DlBanner>

          <DlCard padding="4px 16px">
            <DlListRow :icon="Receipt" title="My bills and payments" to="/boarder/bills" />
            <DlListRow v-if="groupId" :icon="Users" title="Room group" subtitle="Shared costs" :to="`/groups/${groupId}`" divider />
            <DlListRow v-if="rules?.current" :icon="ScrollText" title="House rules" to="/stay/house-rules" divider />
            <DlListRow :icon="Wrench" title="Repairs" to="/stay/maintenance" divider />
            <DlListRow :icon="UserPlus" title="Visitors and late entry" to="/stay/visits" divider />
          </DlCard>

          <!-- Curfew (D2): the time, the reminder switch, and late entry -->
          <DlCard v-if="stay.curfew?.time" class="block">
            <div class="row">
              <span class="dl-title">Curfew: {{ clockTime(stay.curfew.time) }}</span>
              <DlIconTile :icon="Moon" tone="lilac" />
            </div>
            <ion-toggle :checked="!stay.curfew.reminders_muted" :disabled="busy" @ion-change="setReminders($event.detail.checked)">
              <span class="ion-text-wrap">Remind me {{ stay.curfew.reminder_minutes }} minutes before</span>
            </ion-toggle>
            <ion-button size="small" class="dl-tonal" router-link="/stay/visits?tab=late">Coming back late?</ion-button>
          </DlCard>

          <!-- Leaving (C1) -->
          <DlCard :tone="stay.status === 'notice_given' || stay.pending_notice ? 'butter' : 'muted'" class="block">
            <template v-if="stay.status === 'notice_given'">
              <strong class="dl-title">Your last day: {{ manilaDate(stay.end_on!).format('MMM D, YYYY') }}.</strong>
              <p v-if="stay.is_overstaying" class="copy warn">That day has passed. Talk to the owner to record your move-out or change the date.</p>
              <p v-else class="copy">The owner records your move-out, then settles your deposit. To change the date, talk to the owner.</p>
            </template>
            <template v-else-if="stay.pending_notice">
              <strong class="dl-title">Notice sent: last day {{ manilaDate(stay.pending_notice.end_on).format('MMM D, YYYY') }}.</strong>
              <p class="copy">Waiting for the owner to approve it.</p>
              <ion-button size="small" fill="outline" :disabled="busy" @click="withdraw">Withdraw notice</ion-button>
            </template>
            <template v-else>
              <span class="row">
                <strong class="dl-title">Planning to leave?</strong>
                <LogOut :size="20" aria-hidden="true" class="soft-icon" />
              </span>
              <p class="copy">
                Tell the owner your last day.
                <template v-if="stay.notice_rules?.suggested_days">They ask for {{ stay.notice_rules.suggested_days }} days' notice.</template>
              </p>
              <ion-button size="small" fill="outline" :disabled="busy" @click="giveNotice">Give notice</ion-button>
            </template>
          </DlCard>

          <DlCard v-if="stay.is_leader" tone="sky" class="block">
            <strong class="dl-title">You are the leader of this room.</strong>
            <p class="copy">You are billed for the room's shared bills.</p>
            <ion-button v-if="stay.room.let_whole" size="small" class="dl-tonal" @click="people = true">Who stays in the room</ion-button>
          </DlCard>

          <DlSection title="Emergency contact">
            <DlCard padding="4px 16px">
              <DlListRow :title="stay.emergency_contact.name" :subtitle="`${stay.emergency_contact.relationship ?? '—'} · ${stay.emergency_contact.phone}`" :chevron="false">
                <template #leading><DlAvatar :name="stay.emergency_contact.name" /></template>
                <template #trailing><ion-button size="small" class="dl-tonal" @click="editContact">Edit</ion-button></template>
              </DlListRow>
            </DlCard>
          </DlSection>
        </template>

        <!-- Past stays and their deposit (C8) -->
        <DlSection v-if="past.length" title="Past stays">
          <DlCard v-for="p in past" :key="p.id" class="block">
            <span class="dl-data upper">Room {{ p.room.label }} · {{ manilaDate(p.moved_in_on).format('D MMM YYYY') }} – {{ manilaDate(p.moved_out_on!).format('D MMM YYYY') }}</span>
            <strong class="dl-title">{{ p.property.name }}</strong>
            <template v-if="p.is_settled">
              <p class="copy">Your deposit is settled.</p>
              <ion-button size="small" class="dl-tonal" @click="summary(p)">Settlement summary (PDF)</ion-button>
            </template>
            <p v-else class="copy">Moved out. The owner will settle your deposit soon.</p>
          </DlCard>
        </DlSection>
      </div>

      <room-people-modal
        :room="people && stay ? stay.room : null"
        :property-id="stay?.property.id ?? 0"
        :staff="false"
        :can-manage="true"
        @close="people = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { BedSingle, House, LogOut, Moon, Receipt, ScrollText, UserPlus, Users, Wrench } from 'lucide-vue-next'
import { computed, defineAsyncComponent, ref } from 'vue'
import { DlAvatar, DlBanner, DlCard, DlEmptyState, DlIconTile, DlListRow, DlRefresher, DlSection, DlSkeleton } from '@/components/dl'
import RoomPeopleModal from '@/components/tenancy/RoomPeopleModal.vue'
import { clockTime, manila, manilaDate } from '@/lib/dayjs'
import { openDocument } from '@/lib/documents'
import { peso } from '@/lib/money'
import { type RoomShape, supports3d } from '@/lib/room3d/model'
import { firstError } from '@/services/api'
import { groupService } from '@/services/groups'
import { houseOpsService } from '@/services/houseOps'
import { houseRuleService } from '@/services/houseRules'
import { tenancyService } from '@/services/tenancies'
import { useToast } from '@/composables/useToast'
import type { StayHouseRules } from '@/types/houseRules'
import type { Tenancy } from '@/types/tenancy'

/** The boarder's current stay: where, what they pay and when, and their emergency contact. Leaders also manage who stays. */
const toast = useToast()
const stay = ref<Tenancy | null>(null)
const past = ref<Tenancy[]>([])
const loading = ref(true)
const busy = ref(false)
const people = ref(false)
const groupId = ref<number | null>(null)
const rules = ref<StayHouseRules | null>(null)

// Loaded only when shown, so the 3D library stays out of the page's first load
const Room3D = defineAsyncComponent(() => import('@/components/rooms/Room3D.vue'))
const can3d = supports3d()
/** The room's type and size, when the server sends them */
const roomShape = computed<RoomShape | null>(() => {
  const room = stay.value?.room
  if (!room || room.total === undefined || room.capacity === undefined) return null
  return { rental_mode: room.rental_mode, total: room.total, capacity: room.capacity }
})

async function load() {
  try {
    const [current, before, groups] = await Promise.all([tenancyService.mine(), tenancyService.mine(true), groupService.mine().catch(() => [])])
    stay.value = current[0] ?? null
    past.value = before
    groupId.value = groups.find((g) => g.is_current)?.id ?? null
    rules.value = stay.value ? await houseRuleService.forStay(stay.value.id).catch(() => null) : null
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)


/** Ask for the last day of stay and send the notice. */
async function giveNotice() {
  if (!stay.value) return
  const rules = stay.value.notice_rules
  const suggested = manila().add(rules?.suggested_days ?? 0, 'day').format('YYYY-MM-DD')
  const alert = await alertController.create({
    header: 'Give notice',
    message: `Your last day of stay. The owner approves it.${rules?.minimum_days ? ` Less than ${rules.minimum_days} days is short notice (no fee, but the owner is told).` : ''}`,
    inputs: [{ name: 'end_on', type: 'date', value: suggested, min: manila().format('YYYY-MM-DD') }],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Send notice', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm' || !data?.values?.end_on) return
  busy.value = true
  try {
    toast.success((await tenancyService.giveNotice(stay.value.id, data.values.end_on)).message)
    await load()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

/** Turn the curfew reminder on or off for this stay. */
async function setReminders(on: boolean) {
  if (!stay.value?.curfew) return
  busy.value = true
  try {
    toast.success(await houseOpsService.muteReminders(stay.value.id, !on))
    stay.value.curfew.reminders_muted = !on
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function withdraw() {
  if (!stay.value) return
  busy.value = true
  try {
    toast.success(await tenancyService.withdrawNotice(stay.value.id))
    await load()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function summary(p: Tenancy) {
  try {
    await openDocument(() => tenancyService.settlementSummaryLink(p.id))
  } catch (e) {
    toast.error(firstError(e))
  }
}

async function editContact() {
  if (!stay.value) return
  const c = stay.value.emergency_contact
  const alert = await alertController.create({
    header: 'Emergency contact',
    inputs: [
      { name: 'name', type: 'text', placeholder: 'Name', value: c.name },
      { name: 'relationship', type: 'text', placeholder: 'Relationship', value: c.relationship ?? '' },
      { name: 'phone', type: 'tel', placeholder: 'Phone', value: c.phone },
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  const v = data?.values ?? {}
  if (!String(v.name ?? '').trim() || !String(v.phone ?? '').trim()) return toast.error('Enter a name and a phone number.')
  try {
    stay.value = await tenancyService.updateEmergencyContact(stay.value.id, {
      name: String(v.name).trim(),
      relationship: String(v.relationship ?? '').trim() || null,
      phone: String(v.phone).trim(),
    })
    toast.success('Emergency contact saved.')
    await load()
  } catch (e) {
    toast.error(firstError(e))
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
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
.inherit {
  color: inherit;
}
.name {
  margin: 0;
}
.stay {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.rent {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
}
.rent .dl-small {
  font-family: var(--font-body);
  font-weight: 400;
}
.stay p {
  margin: 0;
}
.block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.block > .row {
  width: 100%;
}
.block ion-button {
  margin: 0;
}
.block ion-toggle {
  width: 100%;
  font-size: 14px;
}
.copy {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}
.warn {
  color: var(--danger-text);
  font-weight: 700;
}
.soft-icon {
  color: var(--text-muted);
}
.upper {
  text-transform: uppercase;
  color: var(--text-muted);
}
</style>
