<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" /></ion-buttons>
        <ion-title>Log in</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form class="narrow" @submit.prevent="submit">
        <ion-card v-if="unverified" color="warning" class="notice">
          <ion-card-content>
            <p>{{ unverified }}</p>
            <ion-button size="small" fill="outline" color="dark" :disabled="resending" @click="resend">
              Resend confirmation email
            </ion-button>
          </ion-card-content>
        </ion-card>

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
        <ion-input
          v-model="password"
          type="password"
          label="Password"
          label-placement="stacked"
          fill="outline"
          autocomplete="current-password"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.password }"
          :error-text="errors.password?.[0]"
        >
          <ion-input-password-toggle slot="end" />
        </ion-input>

        <ion-button expand="block" type="submit" class="form-actions" :disabled="busy">
          <ion-spinner v-if="busy" name="crescent" />
          <span v-else>Log in</span>
        </ion-button>

        <p class="center"><router-link to="/forgot-password">Forgot your password?</router-link></p>

        <google-sign-in-button :redirect="redirect" />

        <p class="center muted">No account yet? <router-link to="/register">Create one</router-link></p>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonInputPasswordToggle,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
}
</style>
