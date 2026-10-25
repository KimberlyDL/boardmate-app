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
        <ion-button v-if="canEnterBills && isMetered(account)" slot="end" size="small" @click="entering = account">Enter bill</ion-button>
        <template v-if="canEdit">
          <ion-button v-if="account.has_fixed_amount" slot="end" size="small" fill="outline" @click="changeAmount(account)">Price</ion-button>
          <ion-button slot="end" fill="clear" color="danger" aria-label="Remove" @click="remove(account)">
            <Trash2 slot="icon-only" :size="20" aria-hidden="true" />
          </ion-button>
        </template>
      </ion-item>
    </ion-list>

    <template v-if="canEnterBills && utilityBills.length">
      <h3>Bills entered</h3>
      <ion-list lines="full">
        <ion-item v-for="u in utilityBills" :key="u.id">
          <ion-label class="ion-text-wrap">
            <h2>{{ u.account.name }} · {{ peso(u.total_centavos) }}</h2>
            <p>
              {{ manilaDate(u.coverage_from_on).format('MMM D') }} – {{ manilaDate(u.coverage_to_on).format('MMM D, YYYY') }} ·
              {{ u.shares.filter((s) => !s.waived).length }} room(s) billed
              <template v-if="u.shares.some((s) => s.waived)"> · waived: {{ u.shares.filter((s) => s.waived).map((s) => s.room_label).join(', ') }}</template>
            </p>
            <p v-if="u.correction_reason">Corrected: {{ u.correction_reason }}</p>
            <a v-if="u.photo_url" :href="u.photo_url" target="_blank" rel="noopener" class="link">See photo</a>
          </ion-label>
          <ion-button slot="end" size="small" fill="outline" @click="correctTotal(u)">Correct total</ion-button>
        </ion-item>
      </ion-list>
    </template>

    <utility-bill-modal :account="entering" :property-id="property.id" @close="entering = null" @done="entered" />

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
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue'
import { Trash2 } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import UtilityBillModal from '@/components/billing/UtilityBillModal.vue'
import { billingService } from '@/services/billing'
import type { UtilityBill } from '@/types/billing'
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
const canEnterBills = computed(() => props.property.abilities.includes('manage_utility_bills'))
const isMetered = (a: UtilityAccount) => a.method === 'actual_bill' && a.billed_by === 'owner'
const entering = ref<UtilityAccount | null>(null)
const utilityBills = ref<UtilityBill[]>([])

async function loadUtilityBills() {
  if (!canEnterBills.value) return
  try {
    utilityBills.value = await billingService.utilityBills(props.property.id)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

onMounted(loadUtilityBills)

function entered(message: string) {
  entering.value = null
  toast.success(message)
  loadUtilityBills()
}

async function correctTotal(u: UtilityBill) {
  const alert = await alertController.create({
    header: `Correct the ${u.account.name} total`,
    message: 'The split stays the same. Each room leader gets a correction on their bill and is told why.',
    inputs: [
      { name: 'total', type: 'text', value: toPesoInput(u.total_centavos), attributes: { inputmode: 'decimal' } },
      { name: 'reason', type: 'textarea', placeholder: 'Reason (shown to the room leaders)' },
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  const total = toCentavos(data?.values?.total)
  const reason = (data?.values?.reason ?? '').trim()
  if (total === null) return toast.error('Enter the total in pesos.')
  if (!reason) return toast.error('Give a reason.')
  await run(async () => {
    await billingService.correctUtilityBill(u.id, total, reason)
    await loadUtilityBills()
  }, 'Total corrected.')
}
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
.link {
  color: var(--ion-color-primary);
  font-size: 0.85rem;
}
.upcoming {
  color: var(--ion-color-primary);
}
</style>
