<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/listings/${id}`" /></ion-buttons>
        <ion-title>Apply</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form class="narrow" @submit.prevent="submit">
        <p v-if="listingName">Applying for <strong>{{ listingName }}</strong>. No reservation fee.</p>

        <ion-input :value="auth.user?.name" label="Name" label-placement="stacked" fill="outline" readonly />
        <ion-input
          v-model="form.contact_phone"
          type="tel"
          label="Mobile number"
          label-placement="stacked"
          fill="outline"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.contact_phone }"
          :error-text="errors.contact_phone?.[0]"
        />
        <ion-input
          v-model="form.planned_move_in_on"
          type="date"
          :min="today"
          label="Planned move-in date"
          label-placement="stacked"
          fill="outline"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.planned_move_in_on }"
          :error-text="errors.planned_move_in_on?.[0]"
        />
        <ion-textarea
          v-model="form.message"
          label="Message to the owner"
          label-placement="stacked"
          fill="outline"
          :rows="3"
          :auto-grow="true"
          :counter="true"
          :maxlength="1000"
          placeholder="e.g. Student at UST, quiet, non-smoker."
          class="ion-margin-top"
        />

        <p class="label">ID (optional)</p>
        <p class="muted small">
          Only the owner and their managers can see it. It is deleted 30 days after your application closes.
        </p>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden @change="pickFile" />
        <ion-button size="small" fill="outline" @click="fileInput?.click()">{{ idFile ? 'Change file' : 'Attach ID' }}</ion-button>
        <span v-if="idFile" class="muted small"> {{ idFile.name }}</span>
        <ion-note v-if="errors.id_document" color="danger" class="block">{{ errors.id_document[0] }}</ion-note>

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
  IonNote,
  IonPage,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { manila } from '@/lib/dayjs'
import { errorCode, errorMessage, fieldErrors } from '@/services/api'
import { bookingService } from '@/services/bookings'
import { listingService } from '@/services/listings'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const id = Number(route.params.id)
const today = manila().format('YYYY-MM-DD')
const listingName = ref('')
const form = reactive({ contact_phone: auth.user?.phone ?? '', planned_move_in_on: today, message: '' })
const idFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)

onMounted(async () => {
  try {
    listingName.value = (await listingService.get(id)).listing.name
  } catch {
    // The submit will explain if the listing is gone.
  }
})

function pickFile(e: Event) {
  idFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function submit() {
  busy.value = true
  errors.value = {}
  try {
    const { message } = await bookingService.apply(id, { ...form, id_document: idFile.value })
    toast.success(message)
    await router.replace('/boarder/bookings')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
    if (errorCode(e) === 'has_reservation') await router.replace('/boarder/bookings')
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.label {
  margin: 18px 0 4px;
  font-weight: 500;
}
.small {
  font-size: 0.85rem;
}
.block {
  display: block;
}
</style>
