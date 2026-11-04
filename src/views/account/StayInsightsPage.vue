<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/insights" /></ion-buttons>
        <ion-title>{{ data?.stay.tenant.name ?? 'Stay' }}</ion-title>
        <ion-buttons v-if="data" slot="end">
          <ion-button :disabled="busy" @click="pdf"><FileDown slot="start" :size="18" class="btn-icon" />PDF</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="insights">
        <template v-if="!data">
          <DlSkeleton :height="96" :radius="18" />
          <DlSkeleton :height="200" :radius="18" />
        </template>

        <template v-else>
          <p class="dl-eyebrow period">{{ where }} · {{ dates }}</p>

          <!-- From move-in to today -->
          <div class="tiles">
            <DlStatCard label="Billed" :value="pesoShort(t.billed)" caption="Since move-in, first rent included" />
            <DlStatCard label="Paid" :value="pesoShort(t.paid)" :caption="t.paid_from_deposit ? `${pesoShort(t.paid_from_deposit)} more from the deposit` : 'Money received'" dark />
            <DlStatCard
              label="Unpaid"
              :value="pesoShort(t.balance)"
              :caption="t.overdue ? `${pesoShort(t.overdue)} overdue` : 'Nothing overdue'"
              :tone="t.overdue ? 'coral' : 'pine'"
            />
            <DlStatCard label="Deposit held" :value="pesoShort(t.deposit_held)" :caption="`${pesoShort(t.deposit_received)} paid at move-in`" tone="butter" />
          </div>

          <div class="grid">
            <DlSection title="Bills" :meta="`${data.bills.length}`">
              <DlCard v-if="!data.bills.length"><p class="empty">No bills yet.</p></DlCard>
              <DlCard v-else padding="4px 16px">
                <DlListRow
                  v-for="(b, i) in data.bills"
                  :key="b.id"
                  :title="`${b.kind_label} · ${peso(b.total_centavos)}`"
                  :subtitle="`${b.number} · due ${day(b.due_on)}`"
                  mono
                  :divider="i > 0"
                >
                  <template #trailing>
                    <DlStatusTag v-if="b.under_review" tone="info">Being checked</DlStatusTag>
                    <DlStatusTag v-else-if="!b.balance_centavos" status="paid" />
                    <DlStatusTag v-else :status="b.overdue ? 'overdue' : 'due'">{{ b.late ? 'Late' : b.overdue ? 'Overdue' : 'Due' }} {{ pesoShort(b.balance_centavos) }}</DlStatusTag>
                  </template>
                </DlListRow>
              </DlCard>
            </DlSection>

            <div class="column">
              <DlSection title="Paid at move-in">
                <DlCard v-if="!data.move_in.length"><p class="empty">Nothing was recorded at move-in.</p></DlCard>
                <DlCard v-else padding="4px 16px">
                  <DlListRow
                    v-for="(m, i) in data.move_in"
                    :key="m.kind"
                    :title="`${m.kind_label} · ${peso(m.amount_centavos)}`"
                    :subtitle="[m.method_label, m.received_on ? day(m.received_on) : null, m.reference].filter(Boolean).join(' · ')"
                    :divider="i > 0"
                  />
                </DlCard>
              </DlSection>

              <DlSection title="Payments" :meta="`${data.payments.length}`">
                <DlCard v-if="!data.payments.length"><p class="empty">No payments on bills yet.</p></DlCard>
                <DlCard v-else padding="4px 16px">
                  <DlListRow
                    v-for="(p, i) in data.payments"
                    :key="p.id"
                    :title="peso(p.amount_centavos)"
                    :subtitle="[p.receipt_number, day(p.paid_on), p.method_label].filter(Boolean).join(' · ')"
                    :trailing="p.applied_centavos !== p.amount_centavos ? `${pesoShort(p.applied_centavos)} here` : null"
                    :divider="i > 0"
                  />
                </DlCard>
              </DlSection>

              <DlSection v-if="data.settlement" title="Deposit settlement">
                <DlCard>
                  <dl class="figures">
                    <div><dt>Deposit held</dt><dd>{{ peso(data.settlement.deposit_held_centavos) }}</dd></div>
                    <div><dt>Deductions</dt><dd>{{ peso(data.settlement.deductions_centavos) }}</dd></div>
                    <div><dt>Used for unpaid bills</dt><dd>{{ peso(data.settlement.applied_centavos) }}</dd></div>
                    <div><dt>Kept</dt><dd>{{ peso(data.settlement.kept_centavos) }}</dd></div>
                    <div><dt>Refunded</dt><dd>{{ peso(data.settlement.refund_centavos) }}</dd></div>
                    <div v-if="data.settlement.still_owed_centavos"><dt>Still owed</dt><dd>{{ peso(data.settlement.still_owed_centavos) }}</dd></div>
                  </dl>
                  <p v-if="data.settlement.kept_reason" class="muted">Kept because: {{ data.settlement.kept_reason }}</p>
                  <p v-if="data.settlement.settled_on" class="muted">Settled {{ day(data.settlement.settled_on) }}</p>
                </DlCard>
              </DlSection>
            </div>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue'
import { FileDown } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { DlCard, DlListRow, DlRefresher, DlSection, DlSkeleton, DlStatCard, DlStatusTag } from '@/components/dl'
import { useToast } from '@/composables/useToast'
import { manilaDate } from '@/lib/dayjs'
import { openDocument } from '@/lib/documents'
import { peso, pesoShort } from '@/lib/money'
import { firstError } from '@/services/api'
import { financeService } from '@/services/finance'
import type { StayFinance } from '@/types/finance'

/** One stay's money from move-in to today (A11): totals, bills, move-in payments, payments and the deposit settlement. */
const toast = useToast()
const route = useRoute()
const data = ref<StayFinance | null>(null)
const busy = ref(false)

const stayId = () => Number(route.params.id)
const t = computed(() => data.value!.totals)
const day = (d: string) => manilaDate(d).format('D MMM YYYY')
const where = computed(() => [data.value!.stay.property.name, data.value!.stay.room?.label, data.value!.stay.unit?.label].filter(Boolean).join(' · '))
const dates = computed(() => {
  const s = data.value!.stay
  return `${s.moved_in_on ? day(s.moved_in_on) : '—'} – ${s.moved_out_on ? day(s.moved_out_on) : 'today'}`
})

async function load() {
  try {
    data.value = await financeService.stay(stayId())
  } catch (e) {
    toast.error(firstError(e))
  }
}

async function pdf() {
  busy.value = true
  try {
    await openDocument(() => financeService.stayPdf(stayId()))
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

onIonViewWillEnter(load)
</script>

<style scoped>
.btn-icon {
  margin-right: 4px;
}
.insights {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 960px;
  margin: 0 auto 24px;
}
.period {
  margin: 0;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.grid,
.column {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.empty {
  margin: 16px 0;
  color: var(--text-muted);
  text-align: center;
}
.figures {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}
.figures div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.figures dt {
  color: var(--text-secondary);
}
.figures dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
}

/* Wider screens: tiles in a row, bills beside the payments. */
@media (min-width: 768px) {
  .tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 16px;
  }
}
</style>
