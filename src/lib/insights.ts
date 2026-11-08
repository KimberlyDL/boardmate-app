import type { Dayjs } from 'dayjs'
import { manila, manilaDate } from './dayjs'
import type { FinanceFigures, FinancePeriod, OccupancyMonth, OutstandingAgeing } from '@/types/finance'

/** The Insights screen's helpers (A11): periods, "vs last period" and chart rows. */

export type PeriodPreset = 'this_month' | 'last_month' | 'last_3' | 'last_12' | 'custom'

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3', label: '3 months' },
  { value: 'last_12', label: '12 months' },
  { value: 'custom', label: 'Custom' },
]

/** The dates of a preset, in whole months ending with this month (or last month). Custom has none. */
export function presetRange(preset: PeriodPreset, today: Dayjs = manila()): FinancePeriod | null {
  const fmt = (d: Dayjs) => d.format('YYYY-MM-DD')
  const month = today.startOf('month')
  switch (preset) {
    case 'this_month':
      return { from: fmt(month), to: fmt(month.endOf('month')) }
    case 'last_month':
      return { from: fmt(month.subtract(1, 'month')), to: fmt(month.subtract(1, 'month').endOf('month')) }
    case 'last_3':
      return { from: fmt(month.subtract(2, 'month')), to: fmt(month.endOf('month')) }
    case 'last_12':
      return { from: fmt(month.subtract(11, 'month')), to: fmt(month.endOf('month')) }
    default:
      return null
  }
}

/** The period picked on an Insights screen; `from` and `to` are used only for custom dates. */
export interface PeriodChoice {
  preset: PeriodPreset
  from: string
  to: string
}

export const DEFAULT_PERIOD: PeriodChoice = { preset: 'this_month', from: '', to: '' }

/** The dates to ask the API for. */
export function periodDates(choice: PeriodChoice, today?: Dayjs): FinancePeriod | null {
  return choice.preset === 'custom' ? (choice.from && choice.to ? { from: choice.from, to: choice.to } : null) : presetRange(choice.preset, today)
}

/** The period in a link, so the next screen down keeps it: `?period=last_3` or `?from=…&to=…`. */
export function periodToQuery(choice: PeriodChoice): Record<string, string> {
  if (choice.preset === 'custom') return choice.from && choice.to ? { from: choice.from, to: choice.to } : {}
  return choice.preset === DEFAULT_PERIOD.preset ? {} : { period: choice.preset }
}

/** Reads a period back from a link; anything unknown is this month. */
export function periodFromQuery(query: Record<string, unknown>): PeriodChoice {
  const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '')
  const from = date(query.from)
  const to = date(query.to)
  if (from && to && from <= to) return { preset: 'custom', from, to }
  const preset = PERIOD_PRESETS.find((p) => p.value === query.period && p.value !== 'custom')?.value
  return { ...DEFAULT_PERIOD, preset: preset ?? DEFAULT_PERIOD.preset }
}

/** "1–31 Oct 2026", "1 Sep – 31 Oct 2026", "1 Dec 2026 – 31 Jan 2027". */
export function periodText(period: FinancePeriod): string {
  const from = manilaDate(period.from)
  const to = manilaDate(period.to)
  if (from.isSame(to, 'month')) return from.isSame(to, 'day') ? to.format('D MMM YYYY') : `${from.format('D')}–${to.format('D MMM YYYY')}`
  if (from.isSame(to, 'year')) return `${from.format('D MMM')} – ${to.format('D MMM YYYY')}`
  return `${from.format('D MMM YYYY')} – ${to.format('D MMM YYYY')}`
}

export interface Change {
  /** "+12%", "−5%", "+3 pts", "same", or "new" when there was nothing before. */
  text: string
  direction: 'up' | 'down' | 'same'
}

/**
 * How an amount moved against the period before. Null when both are zero (nothing to say).
 * Whether "up" is good depends on the figure; the screen colours it.
 */
export function change(current: number, previous: number): Change | null {
  if (current === previous) return current === 0 ? null : { text: 'same', direction: 'same' }
  if (previous === 0) return { text: 'new', direction: 'up' }
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100)
  if (pct === 0) return { text: 'same', direction: 'same' }
  return { text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`, direction: pct > 0 ? 'up' : 'down' }
}

/** A 0–1 rate against the one before, in percentage points. Null when either is missing. */
export function rateChange(current: number | null, previous: number | null): Change | null {
  if (current === null || previous === null) return null
  const pts = Math.round((current - previous) * 100)
  if (pts === 0) return { text: 'same', direction: 'same' }
  return { text: `${pts > 0 ? '+' : '−'}${Math.abs(pts)} pts`, direction: pts > 0 ? 'up' : 'down' }
}

/** A 0–1 rate as "75%", or "—" when nothing was due. */
export const percent = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`)

/** Unpaid bills by how late they are, in the order people read them. */
export function ageingRows(ageing: OutstandingAgeing): { label: string; centavos: number }[] {
  return [
    { label: 'Not yet due', centavos: ageing.not_due },
    { label: '1–30 days', centavos: ageing.days_1_30 },
    { label: '31–60 days', centavos: ageing.days_31_60 },
    { label: '61–90 days', centavos: ageing.days_61_90 },
    { label: 'Over 90 days', centavos: ageing.over_90 },
  ]
}

/** What was billed, by kind, leaving out empty kinds. Corrections are shown apart (they can be negative). */
export function billedSlices(billed: FinanceFigures['billed']): { label: string; centavos: number }[] {
  return [
    { label: 'Rent', centavos: billed.rent },
    { label: 'Fixed utilities', centavos: billed.fixed_utilities },
    { label: 'Utility shares', centavos: billed.utility_shares },
    { label: 'One-time charges', centavos: billed.charges },
  ].filter((s) => s.centavos > 0)
}

/** "1 of 2 places taken" as a 0–1 share, or null with no places. */
export const occupancyRate = (o: FinanceFigures['occupancy']) => (o.places ? o.occupied / o.places : null)

/**
 * The places-taken trend in a sentence's parts: the latest month with places
 * ("8 of 10") and the average share over the months that had places.
 * Null when no month had places.
 */
export function occupancySummary(series: OccupancyMonth[]): { latest: OccupancyMonth; average: number } | null {
  const counted = series.filter((m) => m.rate !== null)
  if (!counted.length) return null
  const average = counted.reduce((sum, m) => sum + (m.rate ?? 0), 0) / counted.length
  return { latest: counted[counted.length - 1], average }
}
