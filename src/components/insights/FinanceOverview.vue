<template>
  <div class="finance-overview">
    <!-- Headline figures, each against the period before -->
    <div class="tiles">
      <DlStatCard label="Collected" :value="pesoShort(t.collected.total)" :caption="vs(change(t.collected.total, previous.collected))" dark />
      <DlStatCard label="Billed" :value="pesoShort(t.billed.total)" :caption="vs(change(t.billed.total, previous.billed))" />
      <DlStatCard
        label="Collection rate"
        :value="percent(t.collection.rate)"
        :caption="t.collection.rate === null ? 'Nothing was due' : vs(rateChange(t.collection.rate, previous.collection_rate))"
        tone="sky"
      />
      <DlStatCard
        label="Unpaid now"
        :value="pesoShort(t.outstanding.total)"
        :caption="t.outstanding.overdue ? `${pesoShort(t.outstanding.overdue)} overdue` : 'Nothing overdue'"
        :tone="t.outstanding.overdue ? 'coral' : 'pine'"
      />
    </div>

    <div class="grid">
      <DlCard class="wide-card">
        <h2 class="dl-title">Billed and collected</h2>
        <p class="muted">The 12 months up to {{ monthName(period.to) }}</p>
        <DlChart
          kind="bar"
          format="money"
          label="Billed and collected each month for the last 12 months"
          :labels="series.map((m, i) => monthLabel(m.month, i))"
          :series="[
            { label: 'Billed', data: series.map((m) => m.billed), tone: 'muted' },
            { label: 'Collected', data: series.map((m) => m.collected), tone: 'pine' },
          ]"
          :height="240"
        />
      </DlCard>

      <DlCard>
        <h2 class="dl-title">Unpaid by age</h2>
        <p class="muted">As of today<template v-if="t.outstanding.under_review"> · {{ peso(t.outstanding.under_review) }} being checked</template></p>
        <DlChart
          v-if="t.outstanding.total"
          kind="bar"
          format="money"
          horizontal
          label="Unpaid bills by how many days overdue"
          :labels="ageing.map((r) => r.label)"
          :series="[{ label: 'Unpaid', data: ageing.map((r) => r.centavos), tone: 'coral' }]"
          :height="200"
        />
        <p v-else class="empty">Everything billed is paid.</p>
      </DlCard>

      <DlCard>
        <h2 class="dl-title">What was billed</h2>
        <p class="muted">
          {{ peso(t.billed.total) }}<template v-if="t.billed.corrections"> · corrections {{ peso(t.billed.corrections) }}</template>
        </p>
        <DlChart
          v-if="slices.length"
          kind="doughnut"
          format="money"
          label="What was billed, by kind"
          :labels="slices.map((s) => s.label)"
          :series="[{ label: 'Billed', data: slices.map((s) => s.centavos), tones: slices.map((s) => SLICE_TONES[s.label]) }]"
          :height="200"
        />
        <p v-else class="empty">Nothing was billed in this period.</p>
      </DlCard>

      <!-- Provider bills are per property: a room shows only what its people were billed. -->
      <DlCard>
        <h2 class="dl-title">Utilities</h2>
        <p class="muted">{{ t.utilities.provider_cost === null ? 'Billed to the people here' : "Billed to boarders against the provider's bills" }}</p>
        <DlChart
          v-if="t.utilities.billed || t.utilities.provider_cost"
          kind="bar"
          format="money"
          :label="t.utilities.provider_cost === null ? 'Utilities billed' : 'Utilities billed to boarders and provider bills'"
          :labels="['This period']"
          :series="t.utilities.provider_cost === null
            ? [{ label: 'Billed', data: [t.utilities.billed], tone: 'sky' }]
            : [
              { label: 'Billed to boarders', data: [t.utilities.billed], tone: 'sky' },
              { label: 'Provider bills', data: [t.utilities.provider_cost], tone: 'muted' },
            ]"
          :height="180"
        />
        <p v-else class="empty">No utilities in this period.</p>
        <p v-if="t.utilities.waived" class="muted">{{ peso(t.utilities.waived) }} waived (paid by you)</p>
      </DlCard>

      <DlCard>
        <h2 class="dl-title">Deposits and costs</h2>
        <dl class="figures">
          <div><dt>Deposits held now</dt><dd>{{ peso(t.deposits.held) }}</dd></div>
          <div><dt>Received this period</dt><dd>{{ peso(t.deposits.received) }}</dd></div>
          <div><dt>Refunded</dt><dd>{{ peso(t.deposits.refunded) }}</dd></div>
          <div><dt>Kept</dt><dd>{{ peso(t.deposits.kept) }}</dd></div>
          <div><dt>Paid from deposits</dt><dd>{{ peso(t.paid_from_deposit) }}</dd></div>
          <div><dt>Repair costs</dt><dd>{{ peso(t.repair_costs) }}</dd></div>
          <div v-if="t.credit_held"><dt>Credit held for boarders</dt><dd>{{ peso(t.credit_held) }}</dd></div>
          <div v-if="t.collected.unapplied"><dt>Paid, not yet on a bill</dt><dd>{{ peso(t.collected.unapplied) }}</dd></div>
          <div><dt>Places taken</dt><dd>{{ t.occupancy.occupied }} of {{ t.occupancy.places }}</dd></div>
        </dl>
      </DlCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DlCard, DlStatCard } from '@/components/dl'
import DlChart from '@/components/dl/DlChart.vue'
import { monthLabel, type ChartTone } from '@/lib/charts'
import { manilaDate } from '@/lib/dayjs'
import { ageingRows, billedSlices, change, percent, rateChange, type Change } from '@/lib/insights'
import { peso, pesoShort } from '@/lib/money'
import type { FinanceFigures, FinanceMonth, FinancePeriod, FinancePrevious } from '@/types/finance'

/** One group's finances on an Insights screen (all properties, a property or a room): tiles and charts. */
const props = defineProps<{
  totals: FinanceFigures
  previous: FinancePrevious
  series: FinanceMonth[]
  period: FinancePeriod
}>()

/** One colour per kind, so a kind keeps its colour when another is missing. */
const SLICE_TONES: Record<string, ChartTone> = { Rent: 'pine', 'Fixed utilities': 'sky', 'Utility shares': 'butter', 'One-time charges': 'coral' }

const t = computed(() => props.totals)
const ageing = computed(() => ageingRows(t.value.outstanding.ageing))
const slices = computed(() => billedSlices(t.value.billed))

const vs = (c: Change | null) => (c ? (c.text === 'new' ? 'New this period' : c.text === 'same' ? 'Same as before' : `${c.text} vs before`) : 'Nothing before')
const monthName = (date: string) => manilaDate(date).format('MMM YYYY')
</script>

<style scoped>
.finance-overview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.grid h2 {
  margin: 0;
}
.grid .muted {
  margin: 2px 0 12px;
}
.empty {
  margin: 24px 0;
  color: var(--text-muted);
  text-align: center;
}
.figures {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 0;
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

/* Wider screens: four tiles in a row, cards side by side, the trend across the top. */
@media (min-width: 768px) {
  .tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .wide-card {
    grid-column: 1 / -1;
  }
}
</style>
