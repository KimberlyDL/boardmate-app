<template>
  <div v-if="googleAuth.isConfigured()" class="google">
    <div class="divider"><span>or</span></div>
    <div ref="buttonEl" class="button-slot" />
    <ion-spinner v-if="busy" name="crescent" class="spinner" />
  </div>
</template>

<script setup lang="ts">
import { alertController, IonSpinner } from '@ionic/vue'
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

onMounted(async () => {
  if (!buttonEl.value) return
  try {
    await googleAuth.renderButton(buttonEl.value, signIn)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Could not load Google sign-in.')
  }
})

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
    header: 'Create your BoardMate account',
    message: 'You are new to BoardMate. Please agree to the privacy notice (see "Privacy notice" on the sign-up page) to continue.',
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
  margin-top: 20px;
  text-align: center;
}
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
  margin-bottom: 16px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid var(--ion-color-step-200, #ccc);
}
.button-slot {
  display: flex;
  justify-content: center;
  min-height: 44px;
}
.spinner {
  margin-top: 8px;
}
</style>
