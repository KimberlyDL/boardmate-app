<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/login" /></ion-buttons>
        <ion-title>Forgot password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <template v-if="sentMessage">
          <p>{{ sentMessage }}</p>
          <p class="muted">The link works for 60 minutes. Check your spam folder if you don't see it.</p>
          <ion-button expand="block" fill="outline" router-link="/login">Back to log in</ion-button>
        </template>

        <form v-else @submit.prevent="submit">
          <p>Enter the email you signed up with. We'll send you a link to set a new password.</p>
          <ion-input
            v-model="email"
            type="email"
            label="Email"
            label-placement="stacked"
            fill="outline"
            autocomplete="email"
            :class="{ 'ion-invalid ion-touched': errors.email }"
            :error-text="errors.email?.[0]"
          />
          <ion-button expand="block" type="submit" class="form-actions" :disabled="busy">
            <ion-spinner v-if="busy" name="crescent" />
            <span v-else>Send reset link</span>
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { ref } from 'vue'
import { errorMessage, fieldErrors } from '@/services/api'
import { authService } from '@/services/auth'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const email = ref('')
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)
const sentMessage = ref('')

async function submit() {
  busy.value = true
  errors.value = {}
  try {
    sentMessage.value = await authService.forgotPassword(email.value)
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>
