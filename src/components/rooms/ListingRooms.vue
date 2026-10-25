<template>
  <div>
    <rooms-stack :tiles="tiles" @select="selectedId = $event" />

    <ion-modal :is-open="!!room" :initial-breakpoint="0.6" :breakpoints="[0, 0.6, 1]" @did-dismiss="selectedId = null">
      <ion-content v-if="room" class="ion-padding">
        <div class="sheet">
          <div class="head">
            <div class="who">
              <h2 class="dl-title name">Room {{ room.label }}</h2>
              <span class="dl-data meta">
                {{ room.floor === null ? 'No floor set' : `Floor ${room.floor}` }}<template v-if="room.door_no"> · {{ room.code }}</template> ·
                {{ room.rental_mode_label }}
              </span>
            </div>
            <span class="price">{{ room.rent_from_centavos !== null ? peso(room.rent_from_centavos).replace('.00', '') : 'Ask' }}</span>
          </div>

          <div class="tags">
            <DlStatusTag :tone="badge[room.status].tone">{{ badge[room.status].text }}</DlStatusTag>
            <DlStatusTag v-if="room.who_can_stay !== 'any'" tone="info">{{ room.who_can_stay_label }}</DlStatusTag>
          </div>

          <p class="dl-body line">
            <strong>{{ room.rent_from_centavos !== null ? peso(room.rent_from_centavos) : 'Price on request' }}</strong>
            / month{{ room.rental_mode === 'bedspaces' ? ' per bedspace' : '' }} · {{ room.availability_label }}
          </p>

          <DlCard v-if="room.whole_option" tone="muted" :padding="14" class="whole">
            <span class="dl-eyebrow">WHOLE ROOM</span>
            <p class="dl-small whole-copy">
              Also rented as one room for up to {{ room.whole_option.capacity }}:
              <strong>{{ room.whole_option.rent_centavos !== null ? peso(room.whole_option.rent_centavos) : 'ask the owner' }}</strong> / month<template
                v-if="!room.whole_option.available"
              >, only while every bedspace is free</template>.
            </p>
          </DlCard>

          <p class="dl-small">Shared spaces such as the CR and kitchen are described in the place's details.</p>

          <div v-if="applyHref" class="actions">
            <ion-button v-if="room.available > 0" expand="block" :router-link="`${applyHref}?room=${room.id}`" @click="selectedId = null">
              {{ room.whole_option ? 'Rent a bedspace' : `Apply for Room ${room.label}` }}
            </ion-button>
            <ion-button
              v-if="room.whole_option?.available"
              expand="block"
              :class="{ 'dl-tonal': room.available > 0 }"
              :router-link="`${applyHref}?room=${room.id}&whole=1`"
              @click="selectedId = null"
            >
              Rent the whole room
            </ion-button>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonModal } from '@ionic/vue'
import { computed, ref } from 'vue'
import DlCard from '@/components/dl/DlCard.vue'
import DlStatusTag from '@/components/dl/DlStatusTag.vue'
import RoomsStack, { type StackTile } from '@/components/rooms/RoomsStack.vue'
import { peso } from '@/lib/money'
import type { PublicRoom } from '@/types/booking'

/**
 * Public "Rooms & availability": the stacked floors of one place. Tapping a
 * room opens its details, with Apply for that room when it has a free
 * place and `applyHref` is given (left out when the viewer already applied).
 */
const props = defineProps<{ rooms: PublicRoom[]; applyHref?: string | null }>()

const selectedId = ref<number | null>(null)
const room = computed(() => props.rooms.find((r) => r.id === selectedId.value) ?? null)

const badge = {
  available: { text: 'Available', tone: 'success' },
  full: { text: 'Full', tone: 'neutral' },
  not_ready: { text: 'Not ready', tone: 'warning' },
} as const

const tiles = computed<StackTile[]>(() =>
  props.rooms.map((r) => ({
    id: r.id,
    floor: r.floor,
    title: r.label,
    status: r.status,
    line1: r.status === 'available' && r.rent_from_centavos !== null ? peso(r.rent_from_centavos).replace('.00', '') : badge[r.status].text,
    line2:
      r.rental_mode === 'bedspaces'
        ? `${r.available}/${r.total} beds free${r.whole_option?.available ? ' · or whole' : ''}`
        : `Whole · ${r.capacity} max`,
  })),
)
</script>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 8px;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.who {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.name {
  margin: 0;
}
.meta {
  color: var(--text-muted);
  text-transform: uppercase;
}
.price {
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-primary);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.line {
  color: var(--text-secondary);
}
.whole {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.whole-copy {
  color: var(--text-secondary);
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.actions ion-button {
  margin: 0;
}
</style>
