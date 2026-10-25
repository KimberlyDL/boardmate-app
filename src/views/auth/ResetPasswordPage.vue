<template>
  <auth-layout title="Set a new" highlight="password" :subtitle="token && email ? `For ${email}` : undefined" back-to="/login" back-label="Back to sign in">
    <template v-if="!token || !email">
      <DlBanner tone="warning" title="This link is incomplete">Open the link from your email again, or ask for a new one.</DlBanner>
      <ion-button expand="block" router-link="/forgot-password">Request a new link</ion-button>
    </template>
    <form v-else class="form" @submit.prevent="submit">
      <auth-field
        v-model="password"
        label="New password"
        type="password"
        autocomplete="new-password"
        helper="At least 8 characters, with letters and numbers."
        :error="(errors.password ?? errors.email)?.[0]"
      />
      <auth-field v-model="passwordConfirmation" label="Confirm new password" type="password" autocomplete="new-password" />
      <ion-button expand="block" type="submit" :disabled="busy">
        <ion-spinner v-if="busy" name="crescent" />
        <span v-else>Save new password</span>
      </ion-button>
      <router-link v-if="errors.email" to="/forgot-password" class="again">Request a new link</router-link>
    </form>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton, IonSpinner } from '@ionic/vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthField from '@/components/AuthField.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import DlBanner from '@/components/dl/DlBanner.vue'
import { errorMessage, fieldErrors } from '@/services/api'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const email = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''))
const password = ref('')
const passwordConfirmation = ref('')
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)

async function submit() {
  busy.value = true
  errors.value = {}
  try {
    const message = await authService.resetPassword({
      token: token.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    // The reset signs out every device, including this one.
    await auth.clearSession()
    toast.success(message)
    await router.replace('/login')
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
.again {
  align-self: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-primary);
  text-decoration: none;
}
</style>
