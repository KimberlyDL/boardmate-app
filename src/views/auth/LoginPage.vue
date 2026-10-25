<template>
  <auth-layout title="Welcome" highlight="back" subtitle="Sign in to manage your stay or your properties." back-to="/">
    <form class="form" @submit.prevent="submit">
      <auth-field
        v-model="email"
        label="Email"
        type="email"
        inputmode="email"
        placeholder="you@email.com"
        autocomplete="email"
        :error="errors.email?.[0]"
      />
      <auth-field
        v-model="password"
        label="Password"
        type="password"
        autocomplete="current-password"
        :error="errors.password?.[0]"
      />
      <router-link to="/forgot-password" class="forgot">Forgot password?</router-link>

      <ion-button expand="block" type="submit" :disabled="busy">
        <ion-spinner v-if="busy" name="crescent" />
        <span v-else>Sign in</span>
      </ion-button>
    </form>

    <DlBanner v-if="unverified" tone="warning" title="Verify your email first" :icon="Mail" :action-label="resending ? 'Sending…' : 'Resend link'" @action="resend">
      {{ unverified }}
    </DlBanner>

    <google-sign-in-button :redirect="redirect" />

    <template #footer>New here? <router-link to="/register">Create an account</router-link></template>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton, IonSpinner } from '@ionic/vue'
import { Mail } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthField from '@/components/AuthField.vue'
import AuthLayout from '@/components/AuthLayout.vue'
import DlBanner from '@/components/dl/DlBanner.vue'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import { errorCode, errorMessage, fieldErrors } from '@/services/api'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const email = ref('')
const password = ref('')
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)
/** Message shown when the account exists but the email is not confirmed yet. */
const unverified = ref('')
const resending = ref(false)

const redirect = computed(() => (typeof route.query.redirect === 'string' ? route.query.redirect : undefined))

async function submit() {
  busy.value = true
  errors.value = {}
  unverified.value = ''
  try {
    await auth.login(email.value, password.value)
    await router.replace(await auth.postLoginPath(redirect.value))
  } catch (e) {
    if (errorCode(e) === 'email_unverified') {
      unverified.value = errorMessage(e)
      return
    }
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function resend() {
  if (resending.value) return
  resending.value = true
  try {
    toast.success(await authService.resendConfirmation(email.value))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    resending.value = false
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.forgot {
  align-self: flex-end;
  margin-top: -6px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  color: var(--brand-primary);
}
</style>
