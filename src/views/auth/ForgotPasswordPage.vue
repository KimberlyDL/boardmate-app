<template>
  <auth-layout
    title="Forgot your"
    highlight="password?"
    subtitle="Enter the email you signed up with and we'll send a link to set a new password."
    back-to="/login"
    back-label="Back to sign in"
  >
    <template v-if="sentMessage">
      <DlBanner tone="success" title="Link sent">{{ sentMessage }} The link works for 60 minutes. Check your spam folder too.</DlBanner>
      <ion-button expand="block" fill="outline" router-link="/login">Back to sign in</ion-button>
    </template>
    <form v-else class="form" @submit.prevent="submit">
      <auth-field v-model="email" label="Email" type="email" inputmode="email" placeholder="you@email.com" autocomplete="email" :error="errors.email?.[0]" />
      <ion-button expand="block" type="submit" :disabled="busy">
        <ion-spinner v-if="busy" name="crescent" />
        <span v-else>Send reset link</span>
      </ion-button>
    </form>

    <template #footer>Remembered it? <router-link to="/login">Back to sign in</router-link></template>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton, IonSpinner } from '@ionic/vue'
import { ref } from 'vue'
import AuthField from '@/components/AuthField.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import DlBanner from '@/components/dl/DlBanner.vue'
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

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
