<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`${auth.homePath}/account`" /></ion-buttons>
        <ion-title>My profile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="auth.user" class="narrow">
        <!-- Photo -->
        <div class="center">
          <ion-avatar class="avatar">
            <img v-if="auth.user.photo_url" :src="auth.user.photo_url" alt="Profile photo" />
            <ion-icon v-else :icon="personCircleOutline" class="placeholder" />
          </ion-avatar>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="uploadPhoto" />
          <ion-button size="small" fill="outline" :disabled="photoBusy" @click="fileInput?.click()">
            {{ auth.user.photo_url ? 'Change photo' : 'Add photo' }}
          </ion-button>
          <ion-button v-if="auth.user.photo_url" size="small" fill="clear" color="medium" :disabled="photoBusy" @click="removePhoto">
            Remove
          </ion-button>
          <p class="muted">JPG, PNG or WebP, up to 5 MB.</p>
        </div>

        <!-- Details -->
        <h3>Details</h3>
        <form @submit.prevent="saveProfile">
          <ion-input
            v-model="profile.name"
            label="Full name"
            label-placement="stacked"
            fill="outline"
            :class="{ 'ion-invalid ion-touched': profileErrors.name }"
            :error-text="profileErrors.name?.[0]"
          />
          <ion-input
            v-model="profile.phone"
            type="tel"
            label="Mobile number"
            label-placement="stacked"
            fill="outline"
            class="ion-margin-top"
            :class="{ 'ion-invalid ion-touched': profileErrors.phone }"
            :error-text="profileErrors.phone?.[0]"
          />
          <ion-button type="submit" expand="block" class="form-actions" :disabled="profileBusy">Save details</ion-button>
        </form>

        <!-- Email -->
        <h3>Email</h3>
        <p>
          <strong>{{ auth.user.email }}</strong>
          <ion-chip v-if="auth.user.google_linked" class="chip">Linked to Google</ion-chip>
        </p>

        <ion-card v-if="auth.user.pending_email" color="light">
          <ion-card-content>
            <p>
              Waiting for confirmation at <strong>{{ auth.user.pending_email }}</strong>. Open the link we sent there to
              finish the change.
            </p>
            <ion-button size="small" fill="outline" :disabled="emailBusy" @click="resendEmailChange">Resend link</ion-button>
            <ion-button size="small" fill="clear" color="medium" :disabled="emailBusy" @click="cancelEmailChange">
              Cancel change
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-button v-else-if="!showEmailForm" size="small" fill="outline" @click="showEmailForm = true">Change email</ion-button>

        <form v-if="showEmailForm && !auth.user.pending_email" @submit.prevent="changeEmail">
          <ion-input
            v-model="emailForm.email"
            type="email"
            label="New email"
            label-placement="stacked"
            fill="outline"
            autocomplete="email"
            :class="{ 'ion-invalid ion-touched': emailErrors.email }"
            :error-text="emailErrors.email?.[0]"
          />
          <ion-input
            v-if="auth.user.has_password"
            v-model="emailForm.current_password"
            type="password"
            label="Current password"
            label-placement="stacked"
            fill="outline"
            autocomplete="current-password"
            class="ion-margin-top"
            :class="{ 'ion-invalid ion-touched': emailErrors.current_password }"
            :error-text="emailErrors.current_password?.[0]"
          />
          <p class="muted">We'll send a link to the new address. Your current email stays until you open it.</p>
          <ion-button type="submit" expand="block" :disabled="emailBusy">Send confirmation link</ion-button>
          <ion-button expand="block" fill="clear" color="medium" @click="showEmailForm = false">Cancel</ion-button>
        </form>

        <!-- Emergency contact (boarders) -->
        <template v-if="isBoarder">
          <h3>Emergency contact</h3>
          <p class="muted">Who your boarding house should call if something happens to you.</p>
          <form @submit.prevent="saveEmergency">
            <ion-input
              v-model="emergency.emergency_contact_name"
              label="Name"
              label-placement="stacked"
              fill="outline"
              :class="{ 'ion-invalid ion-touched': emergencyErrors.emergency_contact_name }"
              :error-text="emergencyErrors.emergency_contact_name?.[0]"
            />
            <ion-input
              v-model="emergency.emergency_contact_phone"
              type="tel"
              label="Phone"
              label-placement="stacked"
              fill="outline"
              class="ion-margin-top"
              :class="{ 'ion-invalid ion-touched': emergencyErrors.emergency_contact_phone }"
              :error-text="emergencyErrors.emergency_contact_phone?.[0]"
            />
            <ion-input
              v-model="emergency.emergency_contact_relationship"
              label="Relationship"
              label-placement="stacked"
              fill="outline"
              placeholder="e.g. Mother"
              class="ion-margin-top"
            />
            <ion-button type="submit" expand="block" class="form-actions" :disabled="emergencyBusy">Save emergency contact</ion-button>
          </form>
        </template>

        <!-- Password -->
        <h3>{{ auth.user.has_password ? 'Change password' : 'Set a password' }}</h3>
        <p v-if="!auth.user.has_password" class="muted">
          You signed up with Google. Set a password if you also want to log in with your email.
        </p>
        <form @submit.prevent="savePassword">
          <ion-input
            v-if="auth.user.has_password"
            v-model="passwords.current_password"
            type="password"
            label="Current password"
            label-placement="stacked"
            fill="outline"
            autocomplete="current-password"
            :class="{ 'ion-invalid ion-touched': passwordErrors.current_password }"
            :error-text="passwordErrors.current_password?.[0]"
          />
          <ion-input
            v-model="passwords.password"
            type="password"
            label="New password"
            label-placement="stacked"
            fill="outline"
            autocomplete="new-password"
            class="ion-margin-top"
            :class="{ 'ion-invalid ion-touched': passwordErrors.password }"
            :error-text="passwordErrors.password?.[0]"
          />
          <ion-input
            v-model="passwords.password_confirmation"
            type="password"
            label="Confirm new password"
            label-placement="stacked"
            fill="outline"
            autocomplete="new-password"
            class="ion-margin-top"
          />
          <p class="muted">This signs you out on your other devices.</p>
          <ion-button type="submit" expand="block" fill="outline" :disabled="passwordBusy">
            {{ auth.user.has_password ? 'Change password' : 'Set password' }}
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAvatar,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { personCircleOutline } from 'ionicons/icons'
import { computed, reactive, ref } from 'vue'
import { errorMessage, fieldErrors } from '@/services/api'
import { accountService } from '@/services/account'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { UserRole } from '@/types/enums'

const auth = useAuthStore()
const toast = useToast()

const isBoarder = computed(() => auth.user?.roles.includes(UserRole.Boarder) ?? false)

/** Runs a save: shows field errors inline, other errors as a toast. */
async function run(busy: { value: boolean }, errors: { value: Record<string, string[]> }, action: () => Promise<void>) {
  busy.value = true
  errors.value = {}
  try {
    await action()
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}

// Photo
const fileInput = ref<HTMLInputElement | null>(null)
const photoBusy = ref(false)
const photoErrors = ref<Record<string, string[]>>({})

async function uploadPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  await run(photoBusy, photoErrors, async () => {
    auth.setUser(await accountService.uploadPhoto(file))
    toast.success('Photo updated.')
  })
  if (photoErrors.value.photo) toast.error(photoErrors.value.photo[0])
  if (fileInput.value) fileInput.value.value = ''
}

async function removePhoto() {
  await run(photoBusy, photoErrors, async () => {
    auth.setUser(await accountService.removePhoto())
  })
}

// Details
const profile = reactive({ name: auth.user?.name ?? '', phone: auth.user?.phone ?? '' })
const profileBusy = ref(false)
const profileErrors = ref<Record<string, string[]>>({})

function saveProfile() {
  return run(profileBusy, profileErrors, async () => {
    auth.setUser(await accountService.updateProfile({ name: profile.name, phone: profile.phone || null }))
    toast.success('Profile saved.')
  })
}

// Emergency contact
const bp = auth.user?.boarder_profile
const emergency = reactive({
  emergency_contact_name: bp?.emergency_contact_name ?? '',
  emergency_contact_phone: bp?.emergency_contact_phone ?? '',
  emergency_contact_relationship: bp?.emergency_contact_relationship ?? '',
})
const emergencyBusy = ref(false)
const emergencyErrors = ref<Record<string, string[]>>({})

function saveEmergency() {
  return run(emergencyBusy, emergencyErrors, async () => {
    auth.setUser(
      await accountService.updateBoarderProfile({
        emergency_contact_name: emergency.emergency_contact_name || null,
        emergency_contact_phone: emergency.emergency_contact_phone || null,
        emergency_contact_relationship: emergency.emergency_contact_relationship || null,
      }),
    )
    toast.success('Emergency contact saved.')
  })
}

// Password
const passwords = reactive({ current_password: '', password: '', password_confirmation: '' })
const passwordBusy = ref(false)
const passwordErrors = ref<Record<string, string[]>>({})

function savePassword() {
  return run(passwordBusy, passwordErrors, async () => {
    const hadPassword = auth.user?.has_password
    toast.success(
      await accountService.changePassword({
        current_password: hadPassword ? passwords.current_password : undefined,
        password: passwords.password,
        password_confirmation: passwords.password_confirmation,
      }),
    )
    Object.assign(passwords, { current_password: '', password: '', password_confirmation: '' })
    if (!hadPassword) await auth.refresh()
  })
}

// Email change
const showEmailForm = ref(false)
const emailForm = reactive({ email: '', current_password: '' })
const emailBusy = ref(false)
const emailErrors = ref<Record<string, string[]>>({})

function changeEmail() {
  return run(emailBusy, emailErrors, async () => {
    const { user, message } = await accountService.changeEmail(
      emailForm.email,
      auth.user?.has_password ? emailForm.current_password : undefined,
    )
    auth.setUser(user)
    toast.success(message)
    Object.assign(emailForm, { email: '', current_password: '' })
    showEmailForm.value = false
  })
}

function resendEmailChange() {
  return run(emailBusy, emailErrors, async () => {
    toast.success(await accountService.resendEmailChange())
  })
}

function cancelEmailChange() {
  return run(emailBusy, emailErrors, async () => {
    auth.setUser(await accountService.cancelEmailChange())
    toast.info('Email change cancelled.')
  })
}
</script>

<style scoped>
.avatar {
  width: 96px;
  height: 96px;
  margin: 0 auto 8px;
}
.placeholder {
  width: 96px;
  height: 96px;
  color: var(--ion-color-medium);
}
h3 {
  margin-top: 28px;
}
.chip {
  margin-left: 8px;
  vertical-align: middle;
}
</style>
