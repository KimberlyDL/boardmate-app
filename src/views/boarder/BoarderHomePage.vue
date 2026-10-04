<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>BoardMate</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <h2>Hi, {{ firstName }}</h2>

        <!-- Active reservation -->
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
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { computed, ref } from 'vue'
import { manilaDate } from '@/lib/dayjs'
import { bookingService } from '@/services/bookings'
import { useAuthStore } from '@/stores/auth'
import type { BookingApplication } from '@/types/booking'

const auth = useAuthStore()
const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')
const reservation = ref<BookingApplication | null>(null)
const pending = ref(0)

onIonViewWillEnter(async () => {
  try {
    const { items } = await bookingService.mine()
    reservation.value = items.find((a) => a.status === 'approved') ?? null
    pending.value = items.filter((a) => a.status === 'pending').length
  } catch {
    // Home still works without it.
  }
})
</script>
