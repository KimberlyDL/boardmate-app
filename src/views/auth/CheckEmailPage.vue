<template>
  <auth-layout title="Check your email" back-to="/register">
    <div class="center">
      <ion-icon :icon="mailOutline" class="icon" />
      <h3>Confirm your email</h3>
      <p v-if="auth.pendingConfirmationEmail">
        We sent a link to <strong>{{ auth.pendingConfirmationEmail }}</strong>. Open it to confirm your address, then
        log in.
      </p>
      <p v-else>We sent a confirmation link to your email. Open it to confirm your address, then log in.</p>
      <p class="muted">The link works for 24 hours. Check your spam folder if you don't see it.</p>

      <ion-button expand="block" router-link="/login">Go to log in</ion-button>

      <h3 class="resend-title">Didn't get it?</h3>
      <form @submit.prevent="resend">
        <auth-field
          v-if="!auth.pendingConfirmationEmail"
          v-model="email"
          :icon="mailOutline"
          label="Email"
          type="email"
          placeholder="Email"
          autocomplete="email"
        />
        <ion-button type="submit" expand="block" fill="outline" :disabled="busy || !targetEmail">Resend email</ion-button>
      </form>
    </div>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue'
import { mailOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import AuthField from '@/components/AuthField.vue'
import AuthLayout from '@/components/AuthLayout.vue'
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
  font-size: 56px;
  color: var(--ion-color-primary);
}
.resend-title {
  margin-top: 32px;
  font-size: 1rem;
}
</style>
