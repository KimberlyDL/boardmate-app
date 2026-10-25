<template>
  <auth-layout title="Check your email" back-to="/register">
    <div class="center-block">
      <span class="art" aria-hidden="true"><Mail :size="40" :stroke-width="1.75" /></span>
      <p v-if="auth.pendingConfirmationEmail" class="dl-body copy">
        We sent a link to <strong>{{ auth.pendingConfirmationEmail }}</strong>. Open it to confirm your address, then sign in.
      </p>
      <p v-else class="dl-body copy">We sent a confirmation link to your email. Open it to confirm your address, then sign in.</p>
      <p class="dl-small">The link works for 24 hours. Check your spam folder if you don't see it.</p>
      <span class="dl-note">almost there!</span>
    </div>

    <ion-button expand="block" router-link="/login">I've confirmed, sign in</ion-button>

    <form class="resend" @submit.prevent="resend">
      <auth-field
        v-if="!auth.pendingConfirmationEmail"
        v-model="email"
        label="Didn't get it? Your email"
        type="email"
        inputmode="email"
        placeholder="you@email.com"
        autocomplete="email"
      />
      <ion-button type="submit" expand="block" fill="clear" :disabled="busy || !targetEmail">Resend link</ion-button>
    </form>

    <template #footer>Wrong email? <router-link to="/register">Change it</router-link></template>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton } from '@ionic/vue'
import { Mail } from 'lucide-vue-next'
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
.center-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 8px 0;
  text-align: center;
}
.art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-full);
  background: var(--card-butter-tint);
  color: var(--card-butter-ink);
}
.copy {
  margin: 0;
  color: var(--text-secondary);
}
.resend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
