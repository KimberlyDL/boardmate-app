import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, test } from 'vitest'
import FormatPicker from '@/components/reports/FormatPicker.vue'
import TablePreviewSheet from '@/components/reports/TablePreviewSheet.vue'
import type { TablePreview } from '@/services/reports'

const preview = (over: Partial<TablePreview> = {}): TablePreview => ({
  title: 'Owners',
  subtitle: 'Platform · As of Nov 8, 2026',
  headers: ['Owner ID', 'Name'],
  rows: [['7', 'Ana'], ['9', 'Ben']],
  total: 2,
  money_columns: [],
  ...over,
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FormatPicker', () => {
  test('marks the chosen file type and reports a new choice', async () => {
    const picker = mount(FormatPicker, { props: { modelValue: 'xlsx' } })
    const buttons = picker.findAll('button.format')

    expect(buttons.map((b) => b.find('.name').text())).toEqual(['Excel', 'PDF', 'CSV'])
    expect(buttons[0].attributes('aria-checked')).toBe('true')
    await buttons[1].trigger('click')
    expect(picker.emitted('update:modelValue')).toEqual([['pdf']])
  })
})

describe('TablePreviewSheet', () => {
  const mountSheet = (p: TablePreview | null) => mount(TablePreviewSheet, { props: { open: true, preview: p, preferred: 'pdf' }, attachTo: document.body })

  test('says when every row is shown, marks the chosen type as the main button, and closes on Esc', async () => {
    const sheet = mountSheet(preview())

    expect(document.body.textContent).toContain('All 2 rows.')
    expect(document.querySelector('.get.main')?.textContent?.trim()).toBe('PDF')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(sheet.emitted('close')).toHaveLength(1)
  })

  test('shows a loader while loading, and a note when the report is empty', async () => {
    const sheet = mountSheet(null)
    expect(document.body.textContent).toContain('Getting the first rows')

    await sheet.setProps({ preview: preview({ rows: [], total: 0 }) })
    expect(document.body.textContent).toContain('Nothing in this report for the period chosen.')
    expect(document.querySelector('.table-preview table')).toBeNull()
  })
})
