<template>
  <auth-layout
    title="Create your"
    highlight="account"
    subtitle="You start as a boarder. Owners can apply to list a property after signing up."
    back-to="/"
  >
    <form class="form" @submit.prevent="submit">
      <auth-field v-model="form.name" label="Full name" autocomplete="name" :error="errors.name?.[0]" />
      <auth-field v-model="form.email" label="Email" type="email" inputmode="email" placeholder="you@email.com" autocomplete="email" :error="errors.email?.[0]" />
      <auth-field
        v-model="form.phone"
        label="Mobile number (optional)"
        type="tel"
        inputmode="tel"
        placeholder="09XX XXX XXXX"
        autocomplete="tel"
        :error="errors.phone?.[0]"
      />
      <auth-field
        v-model="form.password"
        label="Password"
        type="password"
        autocomplete="new-password"
        helper="At least 8 characters, with letters and numbers."
        :error="errors.password?.[0]"
      />
      <auth-field v-model="form.password_confirmation" label="Confirm password" type="password" autocomplete="new-password" />

      <div class="consent-card">
        <span class="dl-eyebrow">YOUR CONSENT</span>
        <p class="dl-small consent-copy">We only collect what's needed to run your stay: your name, contact details and payment records.</p>
        <ion-checkbox v-model="form.consent" label-placement="end" justify="start" class="consent">
          I agree to the <router-link to="/privacy" target="_blank">privacy notice</router-link>.
        </ion-checkbox>
        <small v-if="errors.consent" class="error" role="alert">{{ errors.consent[0] }}</small>
      </div>

      <ion-button expand="block" type="submit" :disabled="busy">
        <ion-spinner v-if="busy" name="crescent" />
        <span v-else>Create account</span>
      </ion-button>
    </form>

    <google-sign-in-button :consent="form.consent" />

    <template #footer>Already have an account? <router-link to="/login">Sign in</router-link></template>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton, IonCheckbox, IonSpinner } from '@ionic/vue'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthField from '@/components/AuthField.vue'
import AuthLayout from '@/components/AuthLayout.vue'
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
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.consent-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}
.consent-copy {
  color: var(--text-secondary);
}
.consent {
  white-space: normal;
  font-size: 14px;
}
.consent a {
  color: var(--brand-primary);
  font-weight: 700;
}
.error {
  font-size: 12px;
  color: var(--danger-text);
}
</style>
