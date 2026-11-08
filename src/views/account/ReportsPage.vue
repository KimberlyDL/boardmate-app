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
        <p class="muted small">Download as Excel, PDF or CSV, or preview first. Amounts are in pesos.</p>
        <DlLoader v-if="loading" label="Loading reports" />
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

            <FormatPicker v-model="format" />

            <div class="actions">
              <ion-button fill="outline" :disabled="busy !== null" @click="showPreview">
                <Eye slot="start" :size="18" aria-hidden="true" />Preview
              </ion-button>
              <ion-button :disabled="busy !== null" @click="download(format)">
                <Download slot="start" :size="18" aria-hidden="true" />Download
              </ion-button>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <TablePreviewSheet :open="previewOpen" :preview="preview" :busy="busy" :preferred="format" @close="closePreview" @download="download" />
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
import { Download, Eye } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import FormatPicker from '@/components/reports/FormatPicker.vue'
import TablePreviewSheet from '@/components/reports/TablePreviewSheet.vue'
import DlLoader from '@/components/dl/DlLoader.vue'
import { downloadFile, openDocument } from '@/lib/documents'
import { firstError } from '@/services/api'
import { reportService, type ReportChoice, type ReportInfo, type TableFormat, type TablePreview } from '@/services/reports'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

/**
 * Reports (A10): pick one, a property (or all), dates and a file type (Excel, PDF or CSV), then
 * download through a short-lived link, or preview first: a PDF opens in the viewer, Excel and CSV
 * as a table over the page with the first rows.
 */
const toast = useToast()
const auth = useAuthStore()
const reports = ref<ReportInfo[]>([])
const loading = ref(true)
const busy = ref<TableFormat | null>(null)
const format = ref<TableFormat>('xlsx')
const previewOpen = ref(false)
const preview = ref<TablePreview | null>(null)
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

/** The choice in the form, or null (with a message) when only one date is filled in. */
function currentChoice(): ReportChoice | null {
  if ((from.value && !to.value) || (!from.value && to.value)) {
    toast.error('Choose both dates, or neither.')
    return null
  }
  return { propertyId: propertyId.value || null, from: from.value || null, to: to.value || null }
}

async function download(as: TableFormat) {
  const r = chosen.value
  const choice = currentChoice()
  if (!r || !choice) return
  busy.value = as
  try {
    await downloadFile(() => reportService.link(r.key, choice, as))
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = null
  }
}

/** PDF: the real file in the viewer. Excel and CSV: the first rows as a table over the page. */
async function showPreview() {
  const r = chosen.value
  const choice = currentChoice()
  if (!r || !choice) return
  if (format.value === 'pdf') {
    busy.value = 'pdf'
    try {
      await openDocument(() => reportService.link(r.key, choice, 'pdf'), r.label)
    } catch (e) {
      toast.error(firstError(e))
    } finally {
      busy.value = null
    }
    return
  }
  preview.value = null
  previewOpen.value = true
  try {
    preview.value = await reportService.preview(r.key, choice)
  } catch (e) {
    previewOpen.value = false
    toast.error(firstError(e))
  }
}

function closePreview() {
  previewOpen.value = false
}
</script>

<style scoped>
.small {
  font-size: 0.85rem;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
</style>
