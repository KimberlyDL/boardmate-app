/**
 * Money in the app is integer centavos, like the API. Never use floats for
 * amounts; these helpers convert at the edges (inputs and display).
 */

/** 133333 → "₱1,333.33" */
export function peso(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '—'
  const sign = centavos < 0 ? '-' : ''
  const abs = Math.abs(centavos)
  const whole = Math.floor(abs / 100).toLocaleString('en-PH')
  const cents = String(abs % 100).padStart(2, '0')
  return `${sign}₱${whole}.${cents}`
}

/** For chart axes and tight spaces: 1234500 → "₱12.3k", 250000000 → "₱2.5M", 45000 → "₱450". */
export function pesoShort(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '—'
  const sign = centavos < 0 ? '-' : ''
  const pesos = Math.abs(centavos) / 100
  const [n, unit] = pesos >= 1_000_000 ? [pesos / 1_000_000, 'M'] : pesos >= 1_000 ? [pesos / 1_000, 'k'] : [pesos, '']
  const text = unit ? (Math.round(n * 10) / 10).toString() : Math.round(n).toLocaleString('en-PH')
  return `${sign}₱${text}${unit}`
}

/** "1,800.50" / "₱1800" → 180050; null for empty or invalid input. */
export function toCentavos(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  const clean = String(input).replace(/[₱,\s]/g, '')
  if (clean === '') return null
  const m = clean.match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'))
}

/** 180050 → "1800.50" for an input field. */
export function toPesoInput(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return ''
  const whole = Math.floor(centavos / 100)
  const cents = centavos % 100
  return cents ? `${whole}.${String(cents).padStart(2, '0')}` : String(whole)
}
