<template>
  <auth-layout title="Forgot password" back-to="/login" back-label="Back to log in">
    <template v-if="sentMessage">
      <p>{{ sentMessage }}</p>
      <p class="muted">The link works for 60 minutes. Check your spam folder if you don't see it.</p>
      <ion-button expand="block" fill="outline" router-link="/login">Back to log in</ion-button>
    </template>

    <form v-else @submit.prevent="submit">
      <p>Enter the email you signed up with. We'll send you a link to set a new password.</p>
      <auth-field v-model="email" :icon="mailOutline" label="Email" type="email" placeholder="Email" autocomplete="email" :error="errors.email?.[0]" />
      <ion-button expand="block" type="submit" :disabled="busy">
        <ion-spinner v-if="busy" name="crescent" />
        <span v-else>Send reset link</span>
      </ion-button>
    </form>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton, IonSpinner } from '@ionic/vue'
import { mailOutline } from 'ionicons/icons'
import { ref } from 'vue'
import AuthField from '@/components/AuthField.vue'
import AuthLayout from '@/components/AuthLayout.vue'
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
