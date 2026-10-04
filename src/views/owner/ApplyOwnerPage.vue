<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`${auth.homePath}/account`" /></ion-buttons>
        <ion-title>List your property</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form class="narrow" @submit.prevent="submit">
        <p>
          Owners are checked by the BoardMate team before their listings go public. You can start setting up while we
          review your application.
        </p>
        <p v-if="previousReason" class="reason"><strong>Last review:</strong> {{ previousReason }}</p>

        <ion-input
          v-model="form.business_name"
          label="Business name (optional)"
          label-placement="stacked"
          fill="outline"
          placeholder="e.g. Santos Boarding House"
          :class="{ 'ion-invalid ion-touched': errors.business_name }"
          :error-text="errors.business_name?.[0]"
        />
        <ion-textarea
          v-model="form.application_notes"
          label="About your property"
          label-placement="stacked"
          fill="outline"
          :auto-grow="true"
          :rows="4"
          :counter="true"
          :maxlength="2000"
          helper-text="Where it is, what kind of place it is, and how many rooms or bedspaces it has."
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.application_notes }"
          :error-text="errors.application_notes?.[0]"
        />
        <ion-input
          v-if="!auth.user?.phone"
          v-model="form.phone"
          type="tel"
          label="Mobile number"
          label-placement="stacked"
          fill="outline"
          helper-text="So we can reach you about your application."
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.phone }"
          :error-text="errors.phone?.[0]"
        />

        <ion-button expand="block" type="submit" class="form-actions" :disabled="busy">
          <ion-spinner v-if="busy" name="crescent" />
          <span v-else>Send application</span>
        </ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { errorMessage, fieldErrors } from '@/services/api'
import { ownerService } from '@/services/owner'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const profile = auth.user?.owner_profile
const previousReason = computed(() => auth.user?.owner_profile?.review_reason)
const form = reactive({
  business_name: profile?.business_name ?? '',
  application_notes: profile?.application_notes ?? '',
  phone: '',
})
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)

async function submit() {
  busy.value = true
  errors.value = {}
  try {
    const { user, message } = await ownerService.apply({
      business_name: form.business_name || undefined,
      application_notes: form.application_notes,
      phone: form.phone || undefined,
    })
    auth.setUser(user)
    toast.success(message)
    await router.replace('/owner')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.reason {
  background: var(--ion-color-warning-tint, #fff4d6);
  padding: 8px 12px;
  border-radius: 8px;
}
</style>
