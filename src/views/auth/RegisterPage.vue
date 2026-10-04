<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" /></ion-buttons>
        <ion-title>Create an account</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form class="narrow" @submit.prevent="submit">
        <p class="muted">You start as a boarder. Owners can apply to list a property after signing up.</p>

        <ion-input
          v-model="form.name"
          label="Full name"
          label-placement="stacked"
          fill="outline"
          autocomplete="name"
          :class="{ 'ion-invalid ion-touched': errors.name }"
          :error-text="errors.name?.[0]"
        />
        <ion-input
          v-model="form.email"
          type="email"
          label="Email"
          label-placement="stacked"
          fill="outline"
          autocomplete="email"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.email }"
          :error-text="errors.email?.[0]"
        />
        <ion-input
          v-model="form.phone"
          type="tel"
          label="Mobile number (optional)"
          label-placement="stacked"
          fill="outline"
          autocomplete="tel"
          placeholder="0917 123 4567"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.phone }"
          :error-text="errors.phone?.[0]"
        />
        <ion-input
          v-model="form.password"
          type="password"
          label="Password"
          label-placement="stacked"
          fill="outline"
          autocomplete="new-password"
          helper-text="At least 8 characters, with letters and numbers."
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.password }"
          :error-text="errors.password?.[0]"
        >
          <ion-input-password-toggle slot="end" />
        </ion-input>
        <ion-input
          v-model="form.password_confirmation"
          type="password"
          label="Confirm password"
          label-placement="stacked"
          fill="outline"
          autocomplete="new-password"
          class="ion-margin-top"
        />

        <ion-checkbox v-model="form.consent" label-placement="end" justify="start" class="ion-margin-top consent">
          I agree to the <router-link to="/privacy" target="_blank">privacy notice</router-link>.
        </ion-checkbox>
        <ion-note v-if="errors.consent" color="danger" class="block">{{ errors.consent[0] }}</ion-note>

        <ion-button expand="block" type="submit" class="form-actions" :disabled="busy">
          <ion-spinner v-if="busy" name="crescent" />
          <span v-else>Create account</span>
        </ion-button>

        <google-sign-in-button :consent="form.consent" />

        <p class="center muted">Already have an account? <router-link to="/login">Log in</router-link></p>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonInputPasswordToggle,
  IonNote,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import { errorMessage, fieldErrors } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
  consent: false,
})
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)

async function submit() {
  busy.value = true
  errors.value = {}
  try {
    await auth.register({ ...form, phone: form.phone || undefined })
    await router.replace('/check-email')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.consent {
  white-space: normal;
}
.block {
  display: block;
  margin-top: 4px;
}
</style>
