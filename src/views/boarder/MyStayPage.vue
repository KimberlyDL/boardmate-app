<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/boarder/home" /></ion-buttons>
        <ion-title>My stay</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <p v-if="loading" class="muted">Loading…</p>
        <p v-else-if="!stay" class="muted center">You are not moved in anywhere yet.</p>

        <template v-else>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>Room {{ stay.room.code }} · {{ stay.unit.label }}</ion-card-subtitle>
              <ion-card-title>{{ stay.property.name }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>
                Moved in <strong>{{ manilaDate(stay.moved_in_on).format('MMM D, YYYY') }}</strong>.<br />
                Your rent is due every month on the <strong>{{ stay.anchor_day }}</strong>. Next:
                <strong>{{ manilaDate(stay.next_rent_due_on).format('MMM D, YYYY') }}</strong>.
              </p>
              <p>
                Rent <strong>{{ peso(stay.rent_after_discount_centavos) }}</strong> / month
                <template v-if="stay.discount"> (agreed rate: {{ peso(stay.discount.amount_centavos) }} off {{ peso(stay.rent_centavos) }})</template>
              </p>
              <p v-if="stay.scheduled_discount" class="muted">
                From {{ manilaDate(stay.scheduled_discount.effective_from).format('MMM D, YYYY') }} your agreed rate changes.
              </p>
              <p class="muted small">Utilities are billed after each month, for what you used.</p>
            </ion-card-content>
          </ion-card>

          <ion-card v-if="stay.is_leader">
            <ion-card-content>
              <strong>You are the leader of this room.</strong>
              <p>You are billed for the room's shared bills.</p>
              <ion-button v-if="stay.room.rental_mode === 'whole'" size="small" fill="outline" @click="people = true">Who stays in the room</ion-button>
            </ion-card-content>
          </ion-card>

          <h3>Emergency contact</h3>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <h2>{{ stay.emergency_contact.name }}</h2>
              <p>{{ stay.emergency_contact.relationship ?? '—' }} · {{ stay.emergency_contact.phone }}</p>
            </ion-label>
            <ion-button slot="end" size="small" fill="outline" @click="editContact">Edit</ion-button>
          </ion-item>
        </template>
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
  type RefresherCustomEvent,
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { ref } from 'vue'
import RoomPeopleModal from '@/components/tenancy/RoomPeopleModal.vue'
import { manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { firstError } from '@/services/api'
import { tenancyService } from '@/services/tenancies'
import { useToast } from '@/composables/useToast'
import type { Tenancy } from '@/types/tenancy'

/** The boarder's current stay: where, what they pay and when, and their emergency contact. Leaders also manage who stays. */
const toast = useToast()
const stay = ref<Tenancy | null>(null)
const loading = ref(true)
const people = ref(false)

async function load() {
  try {
    stay.value = (await tenancyService.mine())[0] ?? null
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
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
.small {
  font-size: 0.85rem;
}
</style>
