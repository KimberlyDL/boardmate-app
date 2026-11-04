import { describe, expect, test } from 'vitest'
import { buildData, buildOptions, formatValue, monthLabel, withAlpha, type ChartColors } from '@/lib/charts'
import { pesoShort } from '@/lib/money'

const colors: ChartColors = {
  tones: {
    pine: 'rgb(1, 1, 1)', butter: 'rgb(2, 2, 2)', coral: 'rgb(3, 3, 3)', sky: 'rgb(4, 4, 4)', lilac: 'rgb(5, 5, 5)',
    rose: 'rgb(6, 6, 6)', lagoon: 'rgb(7, 7, 7)', clay: 'rgb(8, 8, 8)', muted: 'rgb(9, 9, 9)',
  },
  text: 'rgb(10, 10, 10)', muted: 'rgb(11, 11, 11)', grid: 'rgb(12, 12, 12)', surface: 'rgb(255, 255, 255)',
}

type Options = Record<string, any>   // eslint-disable-line @typescript-eslint/no-explicit-any

describe('chart helpers (A11)', () => {
  test('shortens pesos for axes', () => {
    expect(pesoShort(45000)).toBe('₱450')
    expect(pesoShort(1234500)).toBe('₱12.3k')
    expect(pesoShort(100000)).toBe('₱1k')
    expect(pesoShort(250000000)).toBe('₱2.5M')
    expect(pesoShort(-80000)).toBe('-₱800')
    expect(pesoShort(null)).toBe('—')
  })

  test('formats values as money, percent or count', () => {
    expect(formatValue(510000, 'money')).toBe('₱5,100.00')
    expect(formatValue(510000, 'money', true)).toBe('₱5.1k')
    expect(formatValue(0.755, 'percent')).toBe('76%')
    expect(formatValue(1200)).toBe('1,200')
    expect(formatValue(null, 'money')).toBe('—')
  })

  test('labels months, with the year at the start and in January', () => {
    expect(['2026-11', '2026-12', '2027-01', '2027-02'].map(monthLabel)).toEqual(["Nov '26", 'Dec', "Jan '27", 'Feb'])
  })

  test('fades an rgb colour', () => {
    expect(withAlpha('rgb(10, 20, 30)', 0.5)).toBe('rgba(10, 20, 30, 0.5)')
    expect(withAlpha('oklch(0.6 0.1 165)', 0.5)).toBe('oklch(0.6 0.1 165)')
  })

  test('colours bars by tone, falling back to the palette order', () => {
    const data = buildData({ kind: 'bar', labels: ['Sep', 'Oct'], series: [
      { label: 'Billed', data: [1, 2], tone: 'muted' },
      { label: 'Collected', data: [1, 2] },
    ] }, colors)

    expect(data.datasets.map((d) => d.backgroundColor)).toEqual(['rgb(9, 9, 9)', 'rgb(2, 2, 2)'])
  })

  test('rounds only the top of a stacked bar', () => {
    const data = buildData({ kind: 'bar', stacked: true, labels: ['Oct'], series: [{ label: 'Rent', data: [1] }, { label: 'Utilities', data: [1] }] }, colors)

    expect(data.datasets.map((d) => (d as { borderRadius: unknown }).borderRadius)).toEqual([0, { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 }])
  })

  test('gives each doughnut slice its own colour', () => {
    const data = buildData({ kind: 'doughnut', labels: ['Rent', 'Utilities'], series: [{ label: 'Billed', data: [3, 1], tones: ['sky'] }] }, colors)

    expect(data.datasets[0].backgroundColor).toEqual(['rgb(4, 4, 4)', 'rgb(2, 2, 2)'])
  })

  test('puts money on the value axis and in tooltips, and turns bars sideways', () => {
    const options = buildOptions({ kind: 'bar', labels: ['1–30'], series: [{ label: 'Unpaid', data: [249000] }], format: 'money', horizontal: true }, colors, 'Karla') as Options

    expect(options.indexAxis).toBe('y')
    expect(options.scales.x.ticks.callback(249000)).toBe('₱2.5k')
    expect(options.plugins.legend.display).toBe(false)   // one series: no legend
    expect(options.plugins.tooltip.callbacks.label({ dataset: { label: 'Unpaid' }, raw: 249000 })).toBe('Unpaid: ₱2,490.00')
  })

  test('caps a rate at 100% and shows the legend for a doughnut', () => {
    const rate = buildOptions({ kind: 'line', labels: ['Oct'], series: [{ label: 'Rate', data: [0.9] }], format: 'percent' }, colors, 'Karla') as Options
    const doughnut = buildOptions({ kind: 'doughnut', labels: ['Rent'], series: [{ label: 'Billed', data: [1] }] }, colors, 'Karla') as Options

    expect(rate.scales.y.max).toBe(1)
    expect(rate.scales.y.ticks.callback(0.5)).toBe('50%')
    expect(doughnut.plugins.legend.display).toBe(true)
    expect(doughnut.scales).toBeUndefined()
  })
})
