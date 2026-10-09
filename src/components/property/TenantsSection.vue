<template>
  <div>
    <p class="muted">The people living here now: who they are, where, and when their rent is next due.</p>

    <ion-button v-if="canMoveIn" expand="block" fill="outline" class="move-in" :disabled="!freeUnits.length" @click="walkIn = true">
      Move in a walk-in
    </ion-button>
    <p v-if="canMoveIn && !freeUnits.length" class="muted small">No unit is free to rent right now.</p>

    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="!items.length" class="muted center">Nobody has moved in yet.</p>

    <ion-card v-for="t in items" :key="t.id" button @click="openId = t.id">
      <ion-card-header>
        <ion-card-subtitle>Room {{ t.room.code }} · {{ t.unit.label }}</ion-card-subtitle>
        <ion-card-title>{{ t.tenant.name }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>
          Moved in {{ manilaDate(t.moved_in_on).format('MMM D, YYYY') }} · next rent
          <strong>{{ manilaDate(t.next_rent_due_on).format('MMM D') }}</strong>
          · {{ peso(t.rent_after_discount_centavos) }} / month
        </p>
        <ion-badge v-if="t.discount" color="tertiary">{{ t.discount.label }}</ion-badge>
        <ion-badge v-if="t.activation_override" color="warning" class="gap">Moved in without full payment</ion-badge>
      </ion-card-content>
    </ion-card>

    <ion-button v-if="page < lastPage" expand="block" fill="clear" @click="more">Show more</ion-button>

    <tenancy-modal :tenancy-id="openId" :can-manage="canMoveIn" @close="openId = null" @changed="changed" />
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
import { IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import MoveInModal, { type MovableUnit } from '@/components/tenancy/MoveInModal.vue'
import TenancyModal from '@/components/tenancy/TenancyModal.vue'
import { manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { firstError } from '@/services/api'
import { tenancyService } from '@/services/tenancies'
import { useToast } from '@/composables/useToast'
import type { Property } from '@/types/property'
import type { Tenancy } from '@/types/tenancy'

const props = defineProps<{ property: Property }>()
const emit = defineEmits<{ changed: [] }>()

const toast = useToast()
const items = ref<Tenancy[]>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(true)
const openId = ref<number | null>(null)
const walkIn = ref(false)

const canMoveIn = computed(() => props.property.abilities.includes('manage_tenancies'))

/** Units that can be rented right now, with their room. */
const freeUnits = computed<MovableUnit[]>(() =>
  props.property.rooms.flatMap((room) =>
    room.units
      .filter((u) => u.status === 'available' && !u.not_ready)
      .map((u) => ({ id: u.id, label: u.label, room_code: room.code, kind: u.kind, rent_centavos: u.rent_centavos })),
  ),
)

async function load(reset = true) {
  loading.value = true
  try {
    const { items: found, meta } = await tenancyService.list(props.property.id, undefined, reset ? 1 : page.value + 1)
    items.value = reset ? found : [...items.value, ...found]
    page.value = meta.current_page
    lastPage.value = meta.last_page
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
const more = () => load(false)

function changed() {
  load()
  emit('changed')
}

function movedIn(message: string) {
  walkIn.value = false
  toast.success(message)
  changed()
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
</style>
