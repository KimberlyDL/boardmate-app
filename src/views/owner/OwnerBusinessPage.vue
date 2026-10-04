<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/owner" /></ion-buttons>
        <ion-title>Business and payment</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form class="narrow" @submit.prevent="save">
        <ion-input
          v-model="form.business_name"
          label="Business name"
          label-placement="stacked"
          fill="outline"
          :class="{ 'ion-invalid ion-touched': errors.business_name }"
          :error-text="errors.business_name?.[0]"
        />

        <h3>GCash</h3>
        <p class="muted">Boarders see this when they pay by transfer. Only you can change it, not your caretakers.</p>
        <ion-input v-model="form.gcash_name" label="Account name" label-placement="stacked" fill="outline" />
        <ion-input
          v-model="form.gcash_number"
          type="tel"
          label="GCash number"
          label-placement="stacked"
          fill="outline"
          placeholder="0917 123 4567"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.gcash_number }"
          :error-text="errors.gcash_number?.[0]"
        />

        <h3>Bank (optional)</h3>
        <ion-input v-model="form.bank_name" label="Bank" label-placement="stacked" fill="outline" placeholder="e.g. BPI" />
        <ion-input
          v-model="form.bank_account_name"
          label="Account name"
          label-placement="stacked"
          fill="outline"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.bank_account_name }"
          :error-text="errors.bank_account_name?.[0]"
        />
        <ion-input
          v-model="form.bank_account_number"
          label="Account number"
          label-placement="stacked"
          fill="outline"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.bank_account_number }"
          :error-text="errors.bank_account_number?.[0]"
        />

        <ion-button expand="block" type="submit" class="form-actions" :disabled="busy">Save</ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { reactive, ref } from 'vue'
import { errorMessage, fieldErrors } from '@/services/api'
import { ownerService } from '@/services/owner'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
const toast = useToast()

const p = auth.user?.owner_profile
const form = reactive({
  business_name: p?.business_name ?? '',
  gcash_name: p?.payment.gcash_name ?? '',
  gcash_number: p?.payment.gcash_number ?? '',
  bank_name: p?.payment.bank_name ?? '',
  bank_account_name: p?.payment.bank_account_name ?? '',
  bank_account_number: p?.payment.bank_account_number ?? '',
})
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)

async function save() {
  busy.value = true
  errors.value = {}
  try {
    // Empty fields are sent as null so they can be cleared.
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]))
    auth.setUser(await ownerService.updateProfile(payload))
    toast.success('Saved.')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
h3 {
  margin-top: 24px;
}
</style>
