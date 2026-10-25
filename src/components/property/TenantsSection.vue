<template>
  <div>
    <p class="muted">The people living here now: who they are, where, and when their rent is next due.</p>

    <ion-button v-if="canMoveIn" expand="block" fill="outline" class="move-in" :disabled="!freeUnits.length" @click="walkIn = true">
      Move in a walk-in
    </ion-button>
    <p v-if="canMoveIn && !freeUnits.length" class="muted small">No unit is free to rent right now.</p>

    <!-- Notices waiting for approval (C1) -->
    <ion-card v-if="notices.length" class="notices">
      <ion-card-header>
        <ion-card-title>Notices to approve ({{ notices.length }})</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div v-for="n in notices" :key="n.id" class="notice">
          <p>
            <strong>{{ n.tenancy?.tenant.name }}</strong> · Room {{ n.tenancy?.room_label }} · last day
            <strong>{{ manilaDate(n.end_on).format('MMM D, YYYY') }}</strong>
            <ion-badge v-if="n.is_short_notice" color="warning" class="gap">Short notice</ion-badge>
          </p>
          <div class="actions">
            <ion-button size="small" :disabled="busy" @click="approve(n)">Approve</ion-button>
            <ion-button size="small" fill="outline" color="danger" :disabled="busy" @click="decline(n)">Decline</ion-button>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <ion-segment :value="view" @ion-change="switchView(String($event.detail.value))">
      <ion-segment-button value="current"><ion-label>Living here</ion-label></ion-segment-button>
      <ion-segment-button value="ended"><ion-label>Moved out</ion-label></ion-segment-button>
    </ion-segment>

    <DlSkeleton v-if="loading" :height="120" :radius="18" />
    <p v-else-if="!items.length" class="muted center">{{ view === 'current' ? 'Nobody has moved in yet.' : 'No deposits waiting to be settled.' }}</p>

    <ion-card v-for="t in items" :key="t.id" button @click="openId = t.id">
      <ion-card-header>
        <ion-card-subtitle>Room {{ t.room.label }} · {{ t.unit.label }}</ion-card-subtitle>
        <ion-card-title>{{ t.tenant.name }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p v-if="view === 'ended'">
          Moved out {{ manilaDate(t.moved_out_on!).format('MMM D, YYYY') }} · <strong>deposit to settle</strong>
        </p>
        <p v-else>
          Moved in {{ manilaDate(t.moved_in_on).format('MMM D, YYYY') }} · next rent
          <strong>{{ manilaDate(t.next_rent_due_on).format('MMM D') }}</strong>
          · {{ peso(t.rent_after_discount_centavos) }} / month
        </p>
        <ion-badge v-if="t.is_overstaying" color="danger">Past the last day ({{ manilaDate(t.end_on!).format('MMM D') }})</ion-badge>
        <ion-badge v-else-if="t.end_on && view === 'current'" color="warning">Leaving · last day {{ manilaDate(t.end_on).format('MMM D') }}</ion-badge>
        <ion-badge v-if="t.pending_notice" color="tertiary" class="gap">Notice waiting</ion-badge>
        <ion-badge v-if="t.discount" color="tertiary" class="gap">{{ t.discount.label }}</ion-badge>
        <ion-badge v-if="t.activation_override" color="warning" class="gap">Moved in without full payment</ion-badge>
      </ion-card-content>
    </ion-card>

    <ion-button v-if="page < lastPage" expand="block" fill="clear" @click="more">Show more</ion-button>

    <tenancy-modal
      :tenancy-id="openId"
      :can-manage="canMoveIn"
      :can-approve-move-out="can('approve_move_out')"
      :can-settle="can('manage_settlements')"
      @close="openId = null"
      @changed="changed"
    />
    <move-in-modal
      :open="walkIn"
      :property="{ id: property.id, name: property.name }"
      :units="freeUnits"
      @close="walkIn = false"
      @done="movedIn"
    />
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonLabel, IonSegment, IonSegmentButton } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import MoveInModal, { type MovableUnit } from '@/components/tenancy/MoveInModal.vue'
import TenancyModal from '@/components/tenancy/TenancyModal.vue'
import { manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { firstError } from '@/services/api'
import { tenancyService } from '@/services/tenancies'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { Property } from '@/types/property'
import type { Tenancy, TenancyNotice } from '@/types/tenancy'
import DlSkeleton from '@/components/dl/DlSkeleton.vue'

const props = defineProps<{ property: Property }>()
const emit = defineEmits<{ changed: [] }>()

const toast = useToast()
const prompt = usePrompt()
const items = ref<Tenancy[]>([])
const notices = ref<TenancyNotice[]>([])
const view = ref<'current' | 'ended'>('current')
const page = ref(1)
const lastPage = ref(1)
const loading = ref(true)
const busy = ref(false)
const openId = ref<number | null>(null)
const walkIn = ref(false)

const can = (ability: string) => props.property.abilities.includes(ability as never)
const canMoveIn = computed(() => can('manage_tenancies'))

/** Units that can be rented right now, with their room. */
const freeUnits = computed<MovableUnit[]>(() =>
  props.property.rooms.flatMap((room) =>
    room.units
      .filter((u) => u.status === 'available' && !u.not_ready)
      .map((u) => ({ id: u.id, label: u.label, room_code: room.code, room_label: room.label, kind: u.kind, rent_centavos: u.rent_centavos })),
  ),
)

async function load(reset = true) {
  loading.value = true
  try {
    const { items: found, meta } = await tenancyService.list(props.property.id, undefined, reset ? 1 : page.value + 1, view.value)
    items.value = reset ? found : [...items.value, ...found]
    page.value = meta.current_page
    lastPage.value = meta.last_page
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

async function loadNotices() {
  if (!can('approve_move_out')) return
  try {
    notices.value = await tenancyService.pendingNotices(props.property.id)
  } catch (e) {
    toast.error(firstError(e))
  }
}

onMounted(() => {
  load()
  loadNotices()
})
const more = () => load(false)

function switchView(next: string) {
  view.value = next as 'current' | 'ended'
  load()
}

function changed() {
  load()
  loadNotices()
  emit('changed')
}

function movedIn(message: string) {
  walkIn.value = false
  toast.success(message)
  changed()
}

async function act(action: () => Promise<string>) {
  busy.value = true
  try {
    toast.success(await action())
    changed()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function approve(n: TenancyNotice) {
  const name = n.tenancy?.tenant.name ?? 'This boarder'
  const ok = await prompt.confirm('Approve this notice?', `${name}'s last day will be ${manilaDate(n.end_on).format('MMM D, YYYY')}. No rent period starts after it.`, 'Approve')
  if (ok) await act(async () => (await tenancyService.approveNotice(n.tenancy!.id)).message)
}

async function decline(n: TenancyNotice) {
  const reason = await prompt.reason('Decline this notice?', 'The boarder is told the reason and stays on, month to month.', 'Decline', 'Reason (shown to the boarder)')
  if (reason) await act(() => tenancyService.declineNotice(n.tenancy!.id, reason))
}
</script>

<style scoped>
.move-in {
  margin: 8px 0;
}
.gap {
  margin-left: 4px;
}
.small {
  font-size: 0.85rem;
}
.notices {
  border-left: 4px solid var(--ion-color-warning);
}
.notice + .notice {
  border-top: 1px solid var(--ion-color-light);
  padding-top: 8px;
  margin-top: 8px;
}
.actions {
  display: flex;
  gap: 8px;
}
</style>
