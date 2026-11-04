import { describe, expect, test } from 'vitest'
import { BREAKPOINTS, screenSizeOf } from '@/lib/layout'

describe('screen sizes (W1)', () => {
  test('phones stay phones; tablets and desktops start at the breakpoints', () => {
    expect(screenSizeOf(360)).toBe('phone')
    expect(screenSizeOf(BREAKPOINTS.tablet - 1)).toBe('phone')
    expect(screenSizeOf(BREAKPOINTS.tablet)).toBe('tablet')
    expect(screenSizeOf(BREAKPOINTS.desktop - 1)).toBe('tablet')
    expect(screenSizeOf(BREAKPOINTS.desktop)).toBe('desktop')
    expect(screenSizeOf(1440)).toBe('desktop')
  })

  test('the breakpoints match the ones in theme/app.css', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync('src/theme/app.css', 'utf8')

    expect(css).toContain(`@media (min-width: ${BREAKPOINTS.desktop}px)`)
    expect(css).toContain(`tablet ${BREAKPOINTS.tablet}`)
  })
})
