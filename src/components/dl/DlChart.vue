<template>
  <figure class="dl-chart">
    <div class="plot" :style="{ height: `${height}px` }" role="img" :aria-label="label">
      <Chart :type="kind" :data="data" :options="options" />
    </div>
    <figcaption v-if="$slots.default" class="caption"><slot /></figcaption>
  </figure>
</template>

<script setup lang="ts">
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Chart } from 'vue-chartjs'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { buildData, buildOptions, type ChartColors, type ChartFormat, type ChartKind, type ChartSeries, type ChartTone } from '@/lib/charts'

ChartJS.register(BarController, BarElement, LineController, LineElement, PointElement, DoughnutController, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler)

/**
 * A chart in the design system's colours (Chart.js). Bar, line or doughnut; values can be
 * money (centavos), a 0–1 rate or a count. It redraws when light or dark mode changes.
 * `label` describes the chart for screen readers; the default slot is a caption under it.
 */
const props = withDefaults(
  defineProps<{
    kind: ChartKind
    labels: string[]
    series: ChartSeries[]
    label: string
    format?: ChartFormat
    horizontal?: boolean
    stacked?: boolean
    legend?: boolean
    height?: number
  }>(),
  { format: 'count', horizontal: false, stacked: false, legend: undefined, height: 220 },
)

const TOKENS: Record<ChartTone, string> = {
  pine: '--card-pine-solid',
  butter: '--card-butter-solid',
  coral: '--card-coral-solid',
  sky: '--card-sky-solid',
  lilac: '--card-lilac-solid',
  rose: '--card-rose-solid',
  lagoon: '--card-lagoon-solid',
  clay: '--card-clay-solid',
  muted: '--text-disabled',
}

/**
 * A token's colour as rgb(). The tokens are oklch, which Chart.js cannot lighten or fade,
 * so a 1×1 canvas converts them. Without a canvas (tests) the raw value is kept.
 */
let probe: CanvasRenderingContext2D | null | undefined
function rgb(token: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  if (probe === undefined) {
    try {
      probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    } catch {
      probe = null
    }
  }
  if (!probe || !value) return value
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = value
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}

/** Bumped when the theme class on <html> changes, so the colours are read again. */
const theme = ref(0)
let observer: MutationObserver | null = null
onMounted(() => {
  observer = new MutationObserver(() => theme.value++)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => observer?.disconnect())

const colors = computed<ChartColors>(() => {
  void theme.value
  const tones = Object.fromEntries(Object.entries(TOKENS).map(([tone, token]) => [tone, rgb(token)])) as Record<ChartTone, string>
  return { tones, text: rgb('--text-primary'), muted: rgb('--text-muted'), grid: rgb('--border-default'), surface: rgb('--bg-surface') }
})
const font = computed(() => {
  void theme.value
  return getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim() || 'system-ui, sans-serif'
})

const input = computed(() => ({
  kind: props.kind,
  labels: props.labels,
  series: props.series,
  format: props.format,
  horizontal: props.horizontal,
  stacked: props.stacked,
  legend: props.legend,
}))
const data = computed(() => buildData(input.value, colors.value))
const options = computed(() => buildOptions(input.value, colors.value, font.value))
</script>

<style scoped>
.dl-chart {
  margin: 0;
  min-width: 0;
}
.plot {
  position: relative;
  width: 100%;
}
.caption {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
