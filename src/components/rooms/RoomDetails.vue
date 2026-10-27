<template>
  <div class="preview" aria-live="polite">
    <div class="head">
      <p class="preview-name">
        Room {{ room.label }} · {{ roomType(room) }}
        <ion-chip v-if="room.who_can_stay !== 'any'" class="chip">{{ room.who_can_stay_label }}</ion-chip>
      </p>
      <ion-button v-if="closable" fill="clear" size="small" class="close" @click="emit('close')">Close</ion-button>
    </div>
    <p class="status">
      <ion-badge :color="badge[room.status].color">{{ badge[room.status].text }}</ion-badge>
      <span class="muted">{{ roomStatusText(room) }}</span>
    </p>

    <Room3D v-if="show3d" :room="room" />

    <p class="price">
      <strong>{{ room.rent_from_centavos !== null ? peso(room.rent_from_centavos) : 'Price on request' }}</strong>
      / month{{ room.rental_mode === 'bedspaces' ? ' per bedspace' : '' }}
    </p>
    <p v-if="room.whole_option?.available" class="small">
      Or the whole room for up to {{ room.whole_option.capacity }}:
      <strong>{{ room.whole_option.rent_centavos !== null ? peso(room.whole_option.rent_centavos) : 'ask the owner' }}</strong> / month
    </p>

    <div v-if="applyHref" class="actions">
      <ion-button v-if="room.available > 0" expand="block" :router-link="`${applyHref}?room=${room.id}`">
        {{ room.whole_option ? 'Rent a bedspace' : 'Apply' }}
      </ion-button>
      <ion-button
        v-if="room.whole_option?.available"
        expand="block"
        :fill="room.available > 0 ? 'outline' : 'solid'"
        :router-link="`${applyHref}?room=${room.id}&whole=1`"
      >
        Rent the whole room
      </ion-button>
    </div>

    <dl class="facts">
      <dt>Floor</dt>
      <dd>{{ room.floor === null ? 'No floor set' : `Floor ${room.floor}` }}<template v-if="room.door_no"> · code {{ room.code }}</template></dd>
      <dt>Rented as</dt>
      <dd>{{ room.rental_mode_label }}</dd>
      <dt>Available</dt>
      <dd>{{ room.availability_label }}</dd>
    </dl>
    <p v-if="room.whole_option && !room.whole_option.available" class="muted small">
      Also rented as one room for up to {{ room.whole_option.capacity }}, only while every bedspace is free.
    </p>
    <p class="muted small">Shared spaces such as the CR and kitchen are described in the place's details.</p>
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonChip } from '@ionic/vue'
import { defineAsyncComponent } from 'vue'
import { roomStatusText, roomType } from '@/lib/floors'
import { peso } from '@/lib/money'
import type { PublicRoom } from '@/types/booking'

/** Everything about one room, shown in the side panel or the bottom sheet */
defineProps<{ room: PublicRoom; applyHref?: string | null; show3d: boolean; closable?: boolean }>()
const emit = defineEmits<{ close: [] }>()

// Loaded only when needed, because three.js is big
const Room3D = defineAsyncComponent(() => import('@/components/rooms/Room3D.vue'))

const badge = {
  available: { text: 'Available', color: 'success' },
  full: { text: 'Full', color: 'medium' },
  not_ready: { text: 'Not ready', color: 'warning' },
} as const
</script>

<style scoped>
.preview p {
  margin: 2px 0;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.preview-name {
  font-weight: 700;
  font-size: 1.05rem;
}
.close {
  flex: none;
  margin: -4px -8px 0 0;
}
.status {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price {
  font-size: 1.05rem;
  margin-top: 6px !important;
}
.chip {
  height: 22px;
  font-size: 0.75rem;
  margin-left: 6px;
}
.small {
  font-size: 0.8rem;
}
.actions {
  display: grid;
  gap: 4px;
  margin: 8px 0 4px;
}
.facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 14px;
  margin: 10px 0 6px;
  font-size: 0.85rem;
}
.facts dt {
  color: var(--ion-color-medium);
}
.facts dd {
  margin: 0;
}
</style>
