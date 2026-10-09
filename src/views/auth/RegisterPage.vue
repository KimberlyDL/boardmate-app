<template>
  <auth-layout title="Create an account" back-to="/">
    <form @submit.prevent="submit">
      <p class="muted intro">You start as a boarder. Owners can apply to list a property after signing up.</p>

      <auth-field v-model="form.name" :icon="personOutline" label="Full name" placeholder="Full name" autocomplete="name" :error="errors.name?.[0]" />
      <auth-field v-model="form.email" :icon="mailOutline" label="Email" type="email" placeholder="Email" autocomplete="email" :error="errors.email?.[0]" />
      <auth-field
        v-model="form.phone"
        :icon="callOutline"
        label="Mobile number (optional)"
        type="tel"
        placeholder="Mobile number (optional)"
        autocomplete="tel"
        :error="errors.phone?.[0]"
      />
      <auth-field
        v-model="form.password"
        :icon="lockClosedOutline"
        label="Password"
        type="password"
        placeholder="Password"
        autocomplete="new-password"
        helper="At least 8 characters, with letters and numbers."
        :error="errors.password?.[0]"
      />
      <auth-field
        v-model="form.password_confirmation"
        :icon="lockClosedOutline"
        label="Confirm password"
        type="password"
        placeholder="Confirm password"
        autocomplete="new-password"
      />

      <ion-checkbox v-model="form.consent" label-placement="end" justify="start" class="consent">
        I agree to the <router-link to="/privacy" target="_blank">privacy notice</router-link>.
      </ion-checkbox>
      <ion-note v-if="errors.consent" color="danger" class="block">{{ errors.consent[0] }}</ion-note>

      <ion-button expand="block" type="submit" class="submit" :disabled="busy">
        <ion-spinner v-if="busy" name="crescent" />
        <span v-else>Create account</span>
      </ion-button>

      <google-sign-in-button :consent="form.consent" />

      <p class="center muted foot">Already have an account? <router-link to="/login">Log in</router-link></p>
    </form>
  </auth-layout>
</template>

<script setup lang="ts">
import { IonButton, IonCheckbox, IonNote, IonSpinner } from '@ionic/vue'
import { callOutline, lockClosedOutline, mailOutline, personOutline } from 'ionicons/icons'
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
.intro {
  margin-top: 0;
}
.consent {
  white-space: normal;
}
.submit {
  margin-top: 18px;
}
.foot {
  margin-top: 22px;
}
.block {
  display: block;
  margin-top: 4px;
}
</style>
