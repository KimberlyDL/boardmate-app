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

      <!-- Rebuilt from move-in and move-out dates: each month as it ended (this month as of today). -->
      <DlCard class="wide-card">
        <h2 class="dl-title">Places taken</h2>
        <p class="muted">
          <template v-if="taken">
            {{ taken.latest.occupied }} of {{ taken.latest.places }} in {{ monthName(`${taken.latest.month}-01`) }}
            · {{ percent(taken.average) }} on average
          </template>
          <template v-else>The 12 months up to {{ monthName(period.to) }}</template>
        </p>
        <DlChart
          v-if="taken"
          kind="line"
          format="percent"
          label="Share of places taken at the end of each month for the last 12 months"
          :labels="occupancy.map((m, i) => monthLabel(m.month, i))"
          :series="[{ label: 'Places taken', data: occupancy.map((m) => m.rate), tone: 'pine' }]"
          :height="200"
        />
        <p v-else class="empty">No places in these 12 months.</p>
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
          <div v-if="!house"><dt>Repair costs</dt><dd>{{ peso(t.repair_costs) }}</dd></div>
          <div v-if="t.credit_held"><dt>Credit held for boarders</dt><dd>{{ peso(t.credit_held) }}</dd></div>
          <div v-if="t.collected.unapplied"><dt>Paid, not yet on a bill</dt><dd>{{ peso(t.collected.unapplied) }}</dd></div>
          <div><dt>Places taken</dt><dd>{{ t.occupancy.occupied }} of {{ t.occupancy.places }}</dd></div>
        </dl>
      </DlCard>

      <template v-if="house">
        <!-- Repairs: reported and fixed in the period; open is as of today. -->
        <DlCard>
          <h2 class="dl-title">Repairs</h2>
          <p class="muted">{{ house.repairs.open_now }} open now<template v-if="house.repairs.urgent_open_now"> · {{ house.repairs.urgent_open_now }} urgent</template></p>
          <dl class="figures">
            <div><dt>Reported</dt><dd>{{ house.repairs.reported }} <span class="vs">{{ vsCount(house.repairs.reported, house.previous.repairs_reported) }}</span></dd></div>
            <div><dt>Fixed</dt><dd>{{ house.repairs.fixed }} <span class="vs">{{ vsCount(house.repairs.fixed, house.previous.repairs_fixed) }}</span></dd></div>
            <div><dt>Average time to fix</dt><dd>{{ daysText(house.repairs.average_days_to_fix) }}</dd></div>
            <div v-if="house.repairs.cancelled"><dt>Cancelled</dt><dd>{{ house.repairs.cancelled }}</dd></div>
            <div><dt>Repair costs</dt><dd>{{ peso(t.repair_costs) }}</dd></div>
          </dl>
          <DlChart
            v-if="house.repairs.by_kind.length"
            class="kinds"
            kind="bar"
            format="count"
            horizontal
            label="Repairs reported in this period, by kind"
            :labels="house.repairs.by_kind.map((k) => k.label)"
            :series="[{ label: 'Reported', data: house.repairs.by_kind.map((k) => k.count), tone: 'clay' }]"
            :height="Math.max(90, house.repairs.by_kind.length * 30)"
          />
        </DlCard>

        <!-- Late entries: coming back after curfew, with or without asking first. -->
        <DlCard>
          <h2 class="dl-title">Late entries</h2>
          <p class="muted">Coming back after curfew</p>
          <dl class="figures">
            <div><dt>Asked and approved</dt><dd>{{ house.late_entries.requests.approved }}</dd></div>
            <div><dt>Asked and declined</dt><dd>{{ house.late_entries.requests.declined }}</dd></div>
            <div v-if="house.late_entries.requests.waiting"><dt>Waiting for an answer</dt><dd>{{ house.late_entries.requests.waiting }}</dd></div>
            <div>
              <dt>Late without asking</dt>
              <dd>{{ house.late_entries.curfew_violations }} <span class="vs">{{ vsCount(house.late_entries.curfew_violations, house.previous.curfew_violations) }}</span></dd>
            </div>
          </dl>
          <template v-if="house.late_entries.repeated.length">
            <p class="muted repeated">Late {{ house.late_entries.repeat_count }} or more times</p>
            <DlListRow
              v-for="(r, i) in house.late_entries.repeated"
              :key="r.stay.id"
              :title="r.stay.tenant ?? 'Former boarder'"
              :subtitle="r.stay.room ?? undefined"
              :trailing="`${r.nights} nights`"
              chevron
              :divider="i > 0"
              @click="router.push(`/insights/stays/${r.stay.id}`)"
            />
          </template>
        </DlCard>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { DlCard, DlListRow, DlStatCard } from '@/components/dl'
import DlChart from '@/components/dl/DlChart.vue'
import { monthLabel, type ChartTone } from '@/lib/charts'
import { manilaDate } from '@/lib/dayjs'
import { ageingRows, billedSlices, change, occupancySummary, percent, rateChange, type Change } from '@/lib/insights'
import { peso, pesoShort } from '@/lib/money'
import type { FinanceFigures, FinanceMonth, FinancePeriod, FinancePrevious, HouseFigures, OccupancyMonth } from '@/types/finance'

/** One group's finances on an Insights screen (all properties, a property or a room): tiles and charts. */
const props = withDefaults(
  defineProps<{
    totals: FinanceFigures
    previous: FinancePrevious
    series: FinanceMonth[]
    /** Places taken per month, the same 12 months as `series`. */
    occupancy?: OccupancyMonth[]
    /** Repairs and late entries; without it, repair costs stay in "Deposits and costs". */
    house?: HouseFigures | null
    period: FinancePeriod
  }>(),
  { occupancy: () => [], house: null },
)

const router = useRouter()

/** One colour per kind, so a kind keeps its colour when another is missing. */
const SLICE_TONES: Record<string, ChartTone> = { Rent: 'pine', 'Fixed utilities': 'sky', 'Utility shares': 'butter', 'One-time charges': 'coral' }

const t = computed(() => props.totals)
const ageing = computed(() => ageingRows(t.value.outstanding.ageing))
const slices = computed(() => billedSlices(t.value.billed))
const taken = computed(() => occupancySummary(props.occupancy))

const vs = (c: Change | null) => (c ? (c.text === 'new' ? 'New this period' : c.text === 'same' ? 'Same as before' : `${c.text} vs before`) : 'Nothing before')
const monthName = (date: string) => manilaDate(date).format('MMM YYYY')
/** A count against the period before: "(+2)", "(−1)", or nothing when unchanged. */
const vsCount = (now: number, before: number) => (now === before ? '' : `(${now > before ? '+' : '−'}${Math.abs(now - before)})`)
const daysText = (days: number | null) => (days === null ? '—' : days < 1 ? 'Under a day' : `${days} ${days === 1 ? 'day' : 'days'}`)
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
.vs {
  color: var(--text-muted);
}
.kinds {
  margin-top: 12px;
}
.repeated {
  margin: 16px 0 0;
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
