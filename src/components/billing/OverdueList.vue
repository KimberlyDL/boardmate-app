<template>
  <div>
    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="!rows.length" class="muted center">Nobody is overdue.</p>

    <ion-card v-for="r in rows" :key="r.payer.id">
      <ion-card-header>
        <ion-card-subtitle>
          <template v-if="r.room_label">Room {{ r.room_label }} · </template>{{ r.days_overdue }} day{{ r.days_overdue === 1 ? '' : 's' }} overdue<template v-if="r.payer.phone"> · {{ r.payer.phone }}</template>
        </ion-card-subtitle>
        <ion-card-title>{{ r.payer.name }} · {{ peso(r.overdue_centavos) }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>
          {{ r.overdue_bills }} overdue bill{{ r.overdue_bills === 1 ? '' : 's' }} since {{ manilaDate(r.oldest_due_on).format('MMM D')
          }}<template v-if="r.owed_centavos > r.overdue_centavos"> · {{ peso(r.owed_centavos) }} owed in all</template>
        </p>
        <ion-badge v-if="r.is_late" color="danger">Late</ion-badge>
        <ion-badge v-if="r.under_review_bills" color="tertiary" class="gap-left">{{ r.under_review_bills }} under review</ion-badge>
        <p class="small">
          {{ r.last_reminded_on ? `Last reminded ${manilaDate(r.last_reminded_on).format('MMM D')}` : 'Not reminded yet' }}
        </p>
        <p v-if="r.latest_note" class="note">
          “{{ r.latest_note.note }}”<template v-if="r.latest_note.promised_on"> · promised {{ manilaDate(r.latest_note.promised_on).format('MMM D') }}</template>
          <span class="small"> ({{ r.latest_note.by }})</span>
        </p>

        <div class="actions">
          <ion-button size="small" @click="emit('record', r.payer.id)">Record payment</ion-button>
          <ion-button v-if="canRemind" size="small" fill="outline" :disabled="busy" @click="remind(r)">Remind now</ion-button>
          <ion-button size="small" fill="outline" :disabled="busy" @click="addNote(r)">Add remark</ion-button>
          <ion-button size="small" fill="clear" @click="statement(r)">Statement</ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import { alertController, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { manila, manilaDate } from '@/lib/dayjs'
import { openDocument } from '@/lib/documents'
import { peso } from '@/lib/money'
import { firstError } from '@/services/api'
import { billingService } from '@/services/billing'
import { useToast } from '@/composables/useToast'
import type { OverdueRow } from '@/types/billing'
import type { Property } from '@/types/property'

const props = defineProps<{ property: Property }>()
const emit = defineEmits<{ record: [payerId: number]; total: [centavos: number, payers: number] }>()

const toast = useToast()
const rows = ref<OverdueRow[]>([])
const loading = ref(true)
const busy = ref(false)
const canRemind = computed(() => props.property.abilities.includes('send_reminders'))

async function load() {
  try {
    const { items, meta } = await billingService.overdue(props.property.id)
    rows.value = items
    emit('total', meta.overdue_total_centavos, meta.payers)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ load })

async function remind(r: OverdueRow) {
  busy.value = true
  try {
    toast.success(await billingService.remind(props.property.id, r.payer.id))
    await load()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function addNote(r: OverdueRow) {
  const alert = await alertController.create({
    header: `Remark about ${r.payer.name}`,
    message: 'What happened, e.g. after a visit or a call. A promised date is only a note; nothing is sent from it.',
    inputs: [
      { name: 'note', type: 'textarea', placeholder: 'e.g. Visited; salary comes Friday' },
      { name: 'promised_on', type: 'date', min: manila().format('YYYY-MM-DD') },
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  const note = (data?.values?.note ?? '').trim()
  if (role !== 'confirm') return
  if (!note) return toast.error('Write the remark first.')
  busy.value = true
  try {
    await billingService.addNote(props.property.id, r.payer.id, note, data?.values?.promised_on || null)
    toast.success('Remark saved.')
    await load()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function statement(r: OverdueRow) {
  try {
    await openDocument(() => billingService.statementLink(props.property.id, r.payer.id))
  } catch (e) {
    toast.error(firstError(e))
  }
}
</script>

<style scoped>
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.small {
  font-size: 0.85rem;
}
.note {
  font-style: italic;
}
.gap-left {
  margin-left: 4px;
}
</style>
