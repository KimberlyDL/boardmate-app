import { describe, expect, test } from 'vitest'
import { peso, toCentavos, toPesoInput } from '@/lib/money'
import { SETTING_SECTIONS } from '@/lib/propertySettings'

describe('money helpers (integer centavos, never floats)', () => {
  test('formats centavos as pesos', () => {
    expect(peso(133333)).toBe('₱1,333.33')
    expect(peso(5)).toBe('₱0.05')
    expect(peso(-36000)).toBe('-₱360.00')
    expect(peso(null)).toBe('—')
  })

  test('parses typed pesos into centavos', () => {
    expect(toCentavos('1,800.50')).toBe(180050)
    expect(toCentavos('₱600')).toBe(60000)
    expect(toCentavos('0.5')).toBe(50)
    expect(toCentavos('')).toBeNull()
    expect(toCentavos('12.345')).toBeNull()
    expect(toCentavos('abc')).toBeNull()
  })

  test('round-trips through an input field', () => {
    for (const c of [0, 5, 180000, 180050, 133333]) {
      expect(toCentavos(toPesoInput(c))).toBe(c)
    }
  })
})

describe('property settings form config', () => {
  test('every setting appears once and every choice has options', () => {
    const keys = SETTING_SECTIONS.flatMap((s) => s.fields.map((f) => f.key))
    expect(new Set(keys).size).toBe(keys.length)
    for (const f of SETTING_SECTIONS.flatMap((s) => s.fields)) {
      if (f.type === 'select') expect(f.options?.length).toBeGreaterThan(1)
    }
  })

  test('the setup wizard shows the key settings', () => {
    const key = SETTING_SECTIONS.flatMap((s) => s.fields.filter((f) => f.key_setting).map((f) => f.key))
    expect(key).toEqual(expect.arrayContaining(['deposit_rule', 'grace_days', 'curfew_time']))
    expect(SETTING_SECTIONS.flatMap((s) => s.fields.map((f) => f.key))).not.toContain('due_date_policy')
  })
})
