<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="backHref" /></ion-buttons>
        <ion-title>Reports</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p class="muted small">Spreadsheet files (CSV) that open in Excel or Google Sheets. Amounts are in pesos.</p>
        <p v-if="loading" class="muted">Loading…</p>
        <p v-else-if="!reports.length" class="muted center">No reports for you yet. They come with the properties you own or look after.</p>
        <ion-list v-else lines="full">
          <ion-item v-for="r in reports" :key="r.key" button :detail="true" @click="choose(r)">
            <ion-label class="ion-text-wrap">
              <h2>{{ r.label }}</h2>
              <p>{{ r.description }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>

      <ion-modal :is-open="chosen !== null" @did-dismiss="chosen = null">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ chosen?.label }}</ion-title>
            <ion-buttons slot="end"><ion-button @click="chosen = null">Cancel</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="chosen" class="narrow">
            <p class="muted small">{{ chosen.description }}</p>
            <ion-select v-model="propertyId" label="Property" label-placement="stacked" fill="outline" interface="popover">
              <ion-select-option v-if="chosen.properties.length > 1" :value="0">All my properties</ion-select-option>
              <ion-select-option v-for="p in chosen.properties" :key="p.id" :value="p.id">{{ p.name }}</ion-select-option>
            </ion-select>

            <template v-if="chosen.uses_dates">
              <div class="row">
                <ion-input v-model="from" type="date" label="From" label-placement="stacked" fill="outline" />
                <ion-input v-model="to" type="date" :min="from || undefined" label="To" label-placement="stacked" fill="outline" />
              </div>
              <p class="muted small">Leave the dates empty for {{ chosen.key === 'move_outs' ? 'the next 30 days' : 'this month' }}.</p>
            </template>
            <p v-else class="muted small">As of today.</p>

            <ion-button expand="block" class="form-actions" :disabled="busy" @click="download">Download</ion-button>
          </div>
        </ion-content>
      </ion-modal>
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
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { computed, ref } from 'vue'
import { openDocument } from '@/lib/documents'
import { firstError } from '@/services/api'
import { reportService, type ReportInfo } from '@/services/reports'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

/** CSV reports (A10): pick one, a property (or all) and dates, then download through a short-lived link. */
const toast = useToast()
const auth = useAuthStore()
const reports = ref<ReportInfo[]>([])
const loading = ref(true)
const busy = ref(false)
const chosen = ref<ReportInfo | null>(null)
const propertyId = ref(0)
const from = ref('')
const to = ref('')

const backHref = computed(() => (auth.user?.active_role === 'caretaker' ? '/caretaker/home' : '/owner/home'))

onIonViewWillEnter(async () => {
  try {
    reports.value = await reportService.list()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
})

function choose(r: ReportInfo) {
  chosen.value = r
  propertyId.value = r.properties.length > 1 ? 0 : r.properties[0].id
  from.value = ''
  to.value = ''
}

async function download() {
  const r = chosen.value!
  if ((from.value && !to.value) || (!from.value && to.value)) return toast.error('Choose both dates, or neither.')
  busy.value = true
  try {
    await openDocument(() => reportService.link(r.key, propertyId.value || null, from.value || null, to.value || null))
    chosen.value = null
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.small {
  font-size: 0.85rem;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
</style>
