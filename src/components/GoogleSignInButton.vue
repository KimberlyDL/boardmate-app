<template>
  <div v-if="googleAuth.isConfigured()" class="google">
    <div class="divider"><span>or</span></div>
    <ion-button v-if="native" expand="block" fill="outline" class="native-button" :disabled="busy" @click="signInNative">
      <svg slot="start" class="g-logo" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      Continue with Google
    </ion-button>
    <div v-else ref="buttonEl" class="button-slot" />
    <ion-spinner v-if="busy" name="crescent" class="spinner" />
  </div>
</template>

<script setup lang="ts">
import { alertController, IonButton, IonSpinner } from '@ionic/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { errorCode, errorMessage, fieldErrors } from '@/services/api'
import { googleAuth } from '@/services/googleAuth'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

/**
 * "Continue with Google". On Sign up, pass the page's consent checkbox value
 * as `consent`; on Login, leave it out and a new person is asked to agree to
 * the privacy notice in a dialog.
 */
const props = defineProps<{ consent?: boolean; redirect?: string }>()

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const buttonEl = ref<HTMLElement | null>(null)
const busy = ref(false)
const native = googleAuth.isNative()

onMounted(async () => {
  if (native || !buttonEl.value) return
  try {
    await googleAuth.renderButton(buttonEl.value, signIn)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Could not load Google sign-in.')
  }
})

/** Android app: native account picker, then the same sign-in as the web button. */
async function signInNative() {
  busy.value = true
  let idToken: string | null
  try {
    idToken = await googleAuth.signInNative()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.')
    return
  } finally {
    busy.value = false
  }
  if (idToken) await signIn(idToken)
}

async function signIn(idToken: string, consent = props.consent ?? false) {
  busy.value = true
  try {
    await auth.loginWithGoogle(idToken, consent)
    await router.replace(await auth.postLoginPath(props.redirect))
  } catch (e) {
    if (errorCode(e) === 'consent_required') {
      if (props.consent === undefined) {
        if (await askConsent()) await signIn(idToken, true)
      } else {
        toast.error('Please tick "I agree to the privacy notice" first.')
      }
      return
    }
    const fields = fieldErrors(e)
    toast.error(fields.id_token?.[0] ?? errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function askConsent(): Promise<boolean> {
  const alert = await alertController.create({
    header: 'Create your DormLink account',
    message: 'You are new to DormLink. Please agree to the privacy notice (see "Privacy notice" on the sign-up page) to continue.',
    inputs: [{ type: 'checkbox', label: 'I agree to the privacy notice', value: 'agree' }],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Create account', role: 'confirm' },
    ],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  const agreed = role === 'confirm' && Array.isArray(data?.values) && data.values.includes('agree')
  if (role === 'confirm' && !agreed) toast.error('You need to agree to the privacy notice to create an account.')
  return agreed
}
</script>

<style scoped>
.google {
  margin-top: 8px;
  text-align: center;
}
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 16px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid var(--border-default);
}
.button-slot {
  display: flex;
  justify-content: center;
  min-height: 44px;
}
.native-button {
  max-width: 400px;
  margin: 0 auto;
}
.g-logo {
  width: 18px;
  height: 18px;
  margin-right: 8px;
}
.spinner {
  margin-top: 8px;
}
</style>
