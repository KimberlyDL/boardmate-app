import type { Component } from 'vue'

/** The card palette: 8 hues at equal lightness (tokens --card-<hue>-*). */
export type PaletteTone = 'pine' | 'butter' | 'coral' | 'sky' | 'lilac' | 'rose' | 'lagoon' | 'clay'

/** Status colors (tokens --<tone>-subtle / -solid / -text). */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info'

/** A Lucide icon component, e.g. `import { Wallet } from 'lucide-vue-next'`. */
export type IconComponent = Component

/** Where a tappable component goes: a route path, or nothing (it emits `click`). */
export type LinkTarget = string | undefined
