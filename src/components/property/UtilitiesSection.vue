<template>
  <div>
    <p class="muted">
      Any method works for any utility. "Handled by the boarders" means it never appears on your bill; boarders share it
      among themselves.
    </p>

    <p v-if="!property.utility_accounts.length" class="muted center">No utilities yet.</p>
    <ion-list>
      <ion-item v-for="account in property.utility_accounts" :key="account.id">
        <ion-label class="ion-text-wrap">
          <h2>{{ account.name }}</h2>
          <p>
            {{ account.method_label }}
            <span v-if="account.has_fixed_amount"> · <strong>{{ peso(account.amount_centavos) }}</strong></span>
            <span v-if="account.billed_by === 'group'"> · handled by the boarders</span>
          </p>
          <p v-if="account.upcoming_amount" class="upcoming">
            {{ peso(account.upcoming_amount.amount_centavos) }} from {{ manilaDate(account.upcoming_amount.effective_from).format('MMM D, YYYY') }}
          </p>
        </ion-label>
        <template v-if="canEdit">
          <ion-button v-if="account.has_fixed_amount" slot="end" size="small" fill="outline" @click="changeAmount(account)">Price</ion-button>
          <ion-button slot="end" fill="clear" color="danger" aria-label="Remove" @click="remove(account)">
            <ion-icon slot="icon-only" :icon="trashOutline" />
          </ion-button>
        </template>
      </ion-item>
    </ion-list>

    <ion-card v-if="canEdit">
      <ion-card-content>
        <strong>Add a utility</strong>
        <div class="presets">
          <ion-chip v-for="t in ['electricity', 'water', 'internet', 'other']" :key="t" :outline="form.type !== t" @click="form.type = t">
            {{ UtilityTypeLabels[t as keyof typeof UtilityTypeLabels] }}
          </ion-chip>
        </div>
        <ion-input
          v-if="form.type === 'other'"
          v-model="form.name"
          label="Name"
          label-placement="stacked"
          fill="outline"
          placeholder="e.g. LPG, cable TV"
        />
        <ion-select v-model="form.method" label="How it is charged" label-placement="stacked" fill="outline" interface="popover" class="ion-margin-top">
          <ion-select-option v-for="(label, value) in UtilityMethodLabels" :key="value" :value="value">{{ label }}</ion-select-option>
        </ion-select>
        <ion-input
          v-if="fixed"
          v-model="form.amount"
          inputmode="decimal"
          :label="form.method === 'fixed_per_property' ? 'Amount for the property (₱ / month)' : 'Amount per boarder (₱ / month)'"
          label-placement="stacked"
          fill="outline"
          class="ion-margin-top"
        />
        <ion-select v-model="form.billed_by" label="Who handles it" label-placement="stacked" fill="outline" interface="popover" class="ion-margin-top">
          <ion-select-option value="owner">Owner (on your bill)</ion-select-option>
          <ion-select-option value="group">The boarders (shared among themselves)</ion-select-option>
        </ion-select>
        <ion-button expand="block" class="form-actions" :disabled="busy || !form.type || !form.method" @click="addUtility">Add</ion-button>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import {
  alertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import { computed, reactive, ref } from 'vue'
import { manila, manilaDate } from '@/lib/dayjs'
import { peso, toCentavos, toPesoInput } from '@/lib/money'
import { errorMessage, fieldErrors } from '@/services/api'
import { propertyService } from '@/services/properties'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import { UtilityMethodLabels, UtilityTypeLabels } from '@/types/enums'
import type { Property, UtilityAccount } from '@/types/property'

const props = defineProps<{ property: Property }>()
const emit = defineEmits<{ changed: [] }>()

const toast = useToast()
const prompt = usePrompt()
const canEdit = computed(() => props.property.abilities.includes('manage_prices'))
const busy = ref(false)
const form = reactive({ type: 'electricity', name: '', method: 'actual_bill', amount: '', billed_by: 'owner' })
const fixed = computed(() => ['fixed_per_bedspace', 'fixed_per_property', 'opt_in'].includes(form.method))

async function run(action: () => Promise<unknown>, success?: string) {
  busy.value = true
  try {
    await action()
    if (success) toast.success(success)
    emit('changed')
  } catch (e) {
    toast.error(Object.values(fieldErrors(e))[0]?.[0] ?? errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function addUtility() {
  const amount = fixed.value ? toCentavos(form.amount) : null
  if (fixed.value && amount === null) return toast.error('Enter the amount in pesos, e.g. 500.')
  await run(async () => {
    await propertyService.addUtility(props.property.id, {
      type: form.type,
      name: form.type === 'other' ? form.name : undefined,
      method: form.method,
      billed_by: form.billed_by,
      amount_centavos: amount,
    })
    form.amount = ''
    form.name = ''
  }, 'Utility added.')
}

async function changeAmount(account: UtilityAccount) {
  const alert = await alertController.create({
    header: account.name,
    message: 'The current amount stays for earlier days.',
    inputs: [
      { name: 'amount', type: 'text', value: toPesoInput(account.amount_centavos), attributes: { inputmode: 'decimal' } },
      { name: 'from', type: 'date', value: manila().format('YYYY-MM-DD'), min: manila().format('YYYY-MM-DD') },
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  const amount = toCentavos(data?.values?.amount)
  if (amount === null) return toast.error('Enter the amount in pesos.')
  await run(() => propertyService.setUtilityAmount(account.id, amount, data?.values?.from), 'Saved.')
}

async function remove(account: UtilityAccount) {
  if (!(await prompt.confirm(`Remove ${account.name}?`, 'It is archived with its price history.', 'Remove'))) return
  await run(() => propertyService.removeUtility(account.id), `${account.name} removed.`)
}
</script>

<style scoped>
.presets {
  margin: 8px 0;
}
.upcoming {
  color: var(--ion-color-primary);
}
</style>
