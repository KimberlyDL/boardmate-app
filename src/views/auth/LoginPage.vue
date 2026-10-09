<template>
  <auth-layout title="Login" greeting="Hello!" subtitle="Welcome to BoardMate" back-to="/">
    <form @submit.prevent="submit">
      <div v-if="unverified" class="notice">
        <p>{{ unverified }}</p>
        <ion-button size="small" fill="outline" color="dark" :disabled="resending" @click="resend">
          Resend confirmation email
        </ion-button>
      </div>

      <auth-field
        v-model="email"
        :icon="mailOutline"
        label="Email"
        type="email"
        placeholder="Email"
        autocomplete="email"
        :error="errors.email?.[0]"
      />
      <auth-field
        v-model="password"
        :icon="lockClosedOutline"
        label="Password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
        :error="errors.password?.[0]"
      />
      <p class="forgot"><router-link to="/forgot-password">Forgot password?</router-link></p>

      <ion-button expand="block" type="submit" :disabled="busy">
        <ion-spinner v-if="busy" name="crescent" />
        <span v-else>Log in</span>
      </ion-button>

      <google-sign-in-button :redirect="redirect" />

      <p class="center muted foot">Don't have an account? <router-link to="/register">Sign up</router-link></p>
    </form>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton, IonSpinner } from '@ionic/vue'
import { lockClosedOutline, mailOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthField from '@/components/AuthField.vue'
import AuthLayout from '@/components/AuthLayout.vue'
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
.notice {
  margin: 0 0 16px;
  padding: 12px 16px;
  border-radius: 18px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.notice p {
  margin: 0 0 8px;
}
.forgot {
  margin: -4px 4px 16px;
  text-align: right;
  font-size: 0.9rem;
}
.foot {
  margin-top: 22px;
}
</style>
