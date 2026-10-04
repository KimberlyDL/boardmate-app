<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Check your email</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow center">
        <ion-icon :icon="mailOutline" class="icon" />
        <h2>Confirm your email</h2>
        <p v-if="auth.pendingConfirmationEmail">
          We sent a link to <strong>{{ auth.pendingConfirmationEmail }}</strong>. Open it to confirm your address, then
          log in.
        </p>
        <p v-else>We sent a confirmation link to your email. Open it to confirm your address, then log in.</p>
        <p class="muted">The link works for 24 hours. Check your spam folder if you don't see it.</p>

        <ion-button expand="block" router-link="/login">Go to log in</ion-button>

        <h3 class="resend-title">Didn't get it?</h3>
        <form @submit.prevent="resend">
          <ion-input
            v-if="!auth.pendingConfirmationEmail"
            v-model="email"
            type="email"
            label="Email"
            label-placement="stacked"
            fill="outline"
            autocomplete="email"
          />
          <ion-button type="submit" expand="block" fill="outline" class="form-actions" :disabled="busy || !targetEmail">
            Resend email
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonInput, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { mailOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { errorMessage } from '@/services/api'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
const toast = useToast()
const busy = ref(false)
const email = ref('')
const targetEmail = computed(() => auth.pendingConfirmationEmail || email.value.trim())

async function resend() {
  busy.value = true
  try {
    toast.success(await authService.resendConfirmation(targetEmail.value))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.icon {
  font-size: 64px;
  color: var(--ion-color-primary);
  margin-top: 24px;
}
.resend-title {
  margin-top: 32px;
  font-size: 1rem;
}
</style>
