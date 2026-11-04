import type { ChartData, ChartOptions, ChartType } from 'chart.js'
import type { PaletteTone } from '@/components/dl'
import { peso, pesoShort } from './money'

/**
 * Chart settings for DlChart (A11). Pure functions, so they can be tested without a canvas:
 * the component reads the theme's colours and passes them in.
 */

export type ChartKind = 'bar' | 'line' | 'doughnut'

/** A palette hue, or `muted` for a quiet comparison series (e.g. "billed" next to "collected"). */
export type ChartTone = PaletteTone | 'muted'

export interface ChartSeries {
  label: string
  data: (number | null)[]
  /** One tone for the series; a doughnut uses `tones` (one per slice) instead. */
  tone?: ChartTone
  tones?: ChartTone[]
}

/** How values are shown on the axis and in tooltips. */
export type ChartFormat = 'money' | 'percent' | 'count'

/** Colours read from the theme's tokens, already resolved to rgb(). */
export interface ChartColors {
  tones: Record<ChartTone, string>
  text: string
  muted: string
  grid: string
  surface: string
}

/** Slice and series order when nothing is given. */
export const TONE_ORDER: PaletteTone[] = ['pine', 'butter', 'sky', 'coral', 'lilac', 'lagoon', 'clay', 'rose']

export interface ChartInput {
  kind: ChartKind
  labels: string[]
  series: ChartSeries[]
  format?: ChartFormat
  horizontal?: boolean
  stacked?: boolean
  /** Defaults to on for a doughnut or more than one series. */
  legend?: boolean
}

/** One value as people read it: money in centavos, a 0–1 rate as a percent, or a count. */
export function formatValue(value: number | null, format: ChartFormat = 'count', short = false): string {
  if (value === null || value === undefined) return '—'
  if (format === 'money') return short ? pesoShort(value) : peso(value)
  if (format === 'percent') return `${Math.round(value * 100)}%`
  return value.toLocaleString('en-PH')
}

/** The rgb() colour with an alpha, for fills under a line. */
export function withAlpha(rgb: string, alpha: number): string {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})` : rgb
}

export function buildData(input: ChartInput, colors: ChartColors): ChartData<ChartType> {
  return {
    labels: input.labels,
    datasets: input.series.map((s, i) => {
      const tone = s.tone ?? TONE_ORDER[i % TONE_ORDER.length]
      const color = colors.tones[tone]
      if (input.kind === 'doughnut') {
        const slices = s.data.map((_, j) => colors.tones[s.tones?.[j] ?? TONE_ORDER[j % TONE_ORDER.length]])
        return { label: s.label, data: s.data, backgroundColor: slices, borderColor: colors.surface, borderWidth: 2, hoverOffset: 4 }
      }
      if (input.kind === 'line') {
        return {
          label: s.label, data: s.data, borderColor: color, backgroundColor: withAlpha(color, 0.12), pointBackgroundColor: color,
          borderWidth: 2, pointRadius: 3, tension: 0.3, fill: input.series.length === 1, spanGaps: true,
        }
      }
      // Stacked bars: square pieces, only the top series rounded, so a bar reads as one column.
      const top = i === input.series.length - 1
      const radius = !input.stacked ? 6 : top ? { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 } : 0
      return { label: s.label, data: s.data, backgroundColor: color, borderRadius: radius, borderSkipped: input.stacked ? 'start' : false, maxBarThickness: 28 }
    }),
  } as ChartData<ChartType>
}

export function buildOptions(input: ChartInput, colors: ChartColors, font: string): ChartOptions<ChartType> {
  const format = input.format ?? 'count'
  const legend = input.legend ?? (input.kind === 'doughnut' || input.series.length > 1)
  const tooltip = {
    backgroundColor: colors.text,
    titleColor: colors.surface,
    bodyColor: colors.surface,
    padding: 10,
    cornerRadius: 10,
    callbacks: {
      label: (ctx: { dataset: { label?: string }; label?: string; raw: unknown }) => {
        const name = input.kind === 'doughnut' ? ctx.label : ctx.dataset.label
        return `${name}: ${formatValue(ctx.raw as number | null, format)}`
      },
    },
  }
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    font: { family: font },
    plugins: {
      legend: { display: legend, position: 'bottom', labels: { color: colors.muted, font: { family: font, size: 12 }, usePointStyle: true, boxWidth: 8, padding: 14 } },
      tooltip,
    },
  }
  if (input.kind === 'doughnut') return { ...base, cutout: '68%' } as ChartOptions<ChartType>

  const valueAxis = {
    stacked: input.stacked,
    beginAtZero: true,
    grid: { color: colors.grid },
    border: { display: false },
    ticks: { color: colors.muted, font: { family: font, size: 11 }, maxTicksLimit: 5, callback: (v: string | number) => formatValue(Number(v), format, true) },
    ...(format === 'percent' ? { max: 1 } : {}),
  }
  const labelAxis = {
    stacked: input.stacked,
    grid: { display: false },
    border: { display: false },
    ticks: { color: colors.muted, font: { family: font, size: 11 }, autoSkip: true, maxRotation: 0 },
  }

  return {
    ...base,
    indexAxis: input.horizontal ? 'y' : 'x',
    interaction: { mode: 'index', intersect: false },
    scales: input.horizontal ? { x: valueAxis, y: labelAxis } : { x: labelAxis, y: valueAxis },
  } as ChartOptions<ChartType>
}

/** A YYYY-MM month as an axis label: "Oct", or "Jan '27" at a year change. */
export function monthLabel(month: string, index: number): string {
  const [y, m] = month.split('-').map(Number)
  const name = new Date(y, m - 1, 1).toLocaleString('en-PH', { month: 'short' })
  return index === 0 || m === 1 ? `${name} '${String(y).slice(2)}` : name
}
