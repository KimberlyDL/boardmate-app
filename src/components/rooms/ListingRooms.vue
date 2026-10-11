<template>
  <div>
    <rooms-stack :tiles="tiles" @select="selectedId = $event" />

    <ion-modal :is-open="!!room" :initial-breakpoint="0.6" :breakpoints="[0, 0.6, 1]" @did-dismiss="selectedId = null">
      <ion-content v-if="room" class="ion-padding">
        <h2 class="name">Room {{ room.label }}</h2>
        <p class="muted">
          {{ room.floor === null ? 'No floor set' : `Floor ${room.floor}` }}
          <span v-if="room.door_no"> · code {{ room.code }}</span> · {{ room.rental_mode_label }}
        </p>
        <p>
          <ion-badge :color="badge[room.status].color">{{ badge[room.status].text }}</ion-badge>
          <ion-chip v-if="room.who_can_stay !== 'any'" class="chip">{{ room.who_can_stay_label }}</ion-chip>
        </p>
        <p class="price">
          <strong>{{ room.rent_from_centavos !== null ? peso(room.rent_from_centavos) : 'Price on request' }}</strong>
          / month{{ room.rental_mode === 'bedspaces' ? ' per bedspace' : '' }}
        </p>
        <p>{{ room.availability_label }}</p>
        <p class="muted small">Shared spaces such as the CR and kitchen are described in the place's details.</p>
        <p v-if="room.whole_option" class="whole">
          Also rented as one room for up to {{ room.whole_option.capacity }}:
          <strong>{{ room.whole_option.rent_centavos !== null ? peso(room.whole_option.rent_centavos) : 'ask the owner' }}</strong> / month
          <span v-if="!room.whole_option.available" class="muted"> (only while every bedspace is free)</span>
        </p>
        <template v-if="applyHref">
          <ion-button v-if="room.available > 0" expand="block" :router-link="`${applyHref}?room=${room.id}`" @click="selectedId = null">
            {{ room.whole_option ? 'Rent a bedspace' : 'Apply' }}
          </ion-button>
          <ion-button
            v-if="room.whole_option?.available"
            expand="block"
            :fill="room.available > 0 ? 'outline' : 'solid'"
            :router-link="`${applyHref}?room=${room.id}&whole=1`"
            @click="selectedId = null"
          >
            Rent the whole room
          </ion-button>
        </template>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonChip, IonContent, IonModal } from '@ionic/vue'
import { computed, ref } from 'vue'
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
  available: { text: 'Available', color: 'success' },
  full: { text: 'Full', color: 'medium' },
  not_ready: { text: 'Not ready', color: 'warning' },
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
.name {
  margin: 8px 0 2px;
}
.price {
  font-size: 1.05rem;
}
.chip {
  height: 22px;
  font-size: 0.75rem;
  margin-left: 6px;
}
.small {
  font-size: 0.8rem;
}
.whole {
  margin-top: 4px;
}
</style>
