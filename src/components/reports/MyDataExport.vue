<template>
  <DlCard padding="16px">
    <div class="head">
      <DlIconTile :icon="Download" />
      <div>
        <h2 class="dl-h2 title">Download my data</h2>
        <p class="dl-small soft">Your spending, bills and payments as Excel, PDF or CSV. Only you can download these.</p>
      </div>
    </div>
    <ion-list lines="full" class="list">
      <ion-item v-for="e in exports" :key="e.key" button :detail="true" @click="chosen = e">
        <ion-label class="ion-text-wrap">
          <h3>{{ e.label }}</h3>
          <p>{{ e.description }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

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

    <TablePreviewSheet :open="previewOpen" :preview="preview" :busy="busy" :preferred="format" @close="previewOpen = false" @download="download" />
  </DlCard>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonModal, IonTitle, IonToolbar } from '@ionic/vue'
import { Download, Eye } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { DlCard, DlIconTile } from '@/components/dl'
import FormatPicker from '@/components/reports/FormatPicker.vue'
import TablePreviewSheet from '@/components/reports/TablePreviewSheet.vue'
import { useToast } from '@/composables/useToast'
import { downloadFile, openDocument } from '@/lib/documents'
import { firstError } from '@/services/api'
import { myExportService, type MyExportInfo, type TableFormat, type TablePreview } from '@/services/reports'

/** A boarder's own spending, bills and payments as files (same formats and preview as the owner's reports). */
const toast = useToast()
const exports = ref<MyExportInfo[]>([])
const chosen = ref<MyExportInfo | null>(null)
const format = ref<TableFormat>('xlsx')
const busy = ref<TableFormat | null>(null)
const previewOpen = ref(false)
const preview = ref<TablePreview | null>(null)

onMounted(async () => {
  try {
    exports.value = await myExportService.list()
  } catch {
    // Not critical: the card just shows no choices.
  }
})

async function download(as: TableFormat) {
  if (!chosen.value) return
  const key = chosen.value.key
  busy.value = as
  try {
    await downloadFile(() => myExportService.link(key, as))
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = null
  }
}

/** PDF: the real file in the viewer. Excel and CSV: the first rows as a table. */
async function showPreview() {
  if (!chosen.value) return
  const { key, label } = chosen.value
  if (format.value === 'pdf') {
    busy.value = 'pdf'
    try {
      await openDocument(() => myExportService.link(key, 'pdf'), label)
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
    preview.value = await myExportService.preview(key)
  } catch (e) {
    previewOpen.value = false
    toast.error(firstError(e))
  }
}
</script>

<style scoped>
.head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.title {
  margin: 0 0 2px;
}
.head p {
  margin: 0;
}
.list {
  margin-top: 8px;
  background: transparent;
}
.small {
  font-size: 0.85rem;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
</style>
