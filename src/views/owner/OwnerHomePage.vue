<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Owner</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <h2>{{ profile?.business_name || auth.user?.name }}</h2>

        <!-- Verification state (Platform rule: verified before listings go public) -->
        <ion-card :color="statusCard.color" data-test="owner-status">
          <ion-card-header>
            <ion-card-subtitle>Owner account</ion-card-subtitle>
            <ion-card-title>{{ profile?.verification_label }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ statusCard.text }}</p>
            <p v-if="profile?.review_reason"><strong>Reason:</strong> {{ profile.review_reason }}</p>
            <ion-button
              v-if="status === OwnerVerificationStatus.Rejected"
              size="small"
              fill="outline"
              color="dark"
              router-link="/apply-owner"
            >
              Update and apply again
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-list inset>
          <ion-item button router-link="/owner/business" detail>
            <ion-icon slot="start" :icon="walletOutline" />
            <ion-label>
              <h3>Business and payment details</h3>
              <p>{{ hasPaymentDetails ? 'GCash / bank details saved' : 'Add how boarders should pay you' }}</p>
            </ion-label>
            <ion-badge v-if="!hasPaymentDetails" slot="end" color="warning">To do</ion-badge>
          </ion-item>
          <ion-item button router-link="/owner/caretakers" detail>
            <ion-icon slot="start" :icon="peopleOutline" />
            <ion-label>
              <h3>Caretakers</h3>
              <p>Invite people to help run your place</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-item button router-link="/owner/applications" detail>
            <ion-icon slot="start" :icon="documentTextOutline" />
            <ion-label>Pending applications</ion-label>
            <ion-badge slot="end" :color="bookings.pendingCount ? 'primary' : 'medium'">{{ bookings.pendingCount }}</ion-badge>
          </ion-item>
          <ion-item button router-link="/owner/properties" detail>
            <ion-icon slot="start" :icon="businessOutline" />
            <ion-label>Properties</ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type RefresherCustomEvent,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
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
import { businessOutline, documentTextOutline, peopleOutline, walletOutline } from 'ionicons/icons'
import { useBookingStore } from '@/stores/bookings'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { OwnerVerificationStatus } from '@/types/enums'

const auth = useAuthStore()
const profile = computed(() => auth.user?.owner_profile)
const status = computed(() => profile.value?.verification_status)

const hasPaymentDetails = computed(() => {
  const p = profile.value?.payment
  return !!(p?.gcash_number || p?.bank_account_number)
})

const statusCard = computed(() => {
  switch (status.value) {
    case OwnerVerificationStatus.Verified:
      return { color: 'success', text: 'You are verified. Your listings can be shown to the public once you publish them.' }
    case OwnerVerificationStatus.Rejected:
      return { color: 'warning', text: 'We could not approve your application yet. Fix the details below and apply again.' }
    case OwnerVerificationStatus.Suspended:
      return { color: 'danger', text: 'Your owner account is suspended and your listings are hidden. Contact BoardMate support.' }
    default:
      return {
        color: 'light',
        text: "We're reviewing your application. You can set things up in the meantime; listings stay hidden until you're verified.",
      }
  }
})

const bookings = useBookingStore()

// Pick up review decisions and new applications made while the app was open.
onIonViewWillEnter(() => {
  auth.refresh().catch(() => undefined)
  bookings.refreshPending()
})

async function refresh(event: RefresherCustomEvent) {
  await auth.refresh().catch(() => undefined)
  event.target.complete()
}
</script>
