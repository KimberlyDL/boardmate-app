import { peso } from '@/lib/money'
import type { PropertyDashboard } from '@/types/dashboard'

export interface TodoItem {
  key: string
  text: string
  detail: string
  link: string
  urgent: boolean
}

/**
 * What waits at each property, as one list (A10): urgent things first.
 * `applicationsLink` is the role's own applications tab.
 */
export function todoItems(dashboards: PropertyDashboard[], applicationsLink: string): TodoItem[] {
  const items: TodoItem[] = []
  for (const d of dashboards) {
    const at = (tab: string) => `/properties/${d.property.id}?tab=${tab}`
    const where = d.property.name
    const add = (key: string, text: string, link: string, urgent = false) => items.push({ key: `${d.property.id}-${key}`, text, detail: where, link, urgent })
    const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

    if (d.repairs?.urgent) add('urgent', `${plural(d.repairs.urgent, 'urgent repair')}`, at('maintenance'), true)
    if (d.overdue?.payers) add('overdue', `${plural(d.overdue.payers, 'boarder')} overdue · ${peso(d.overdue.centavos)}`, at('billing'), true)
    if (d.applications_waiting) add('applications', `${plural(d.applications_waiting, 'application')} to review`, applicationsLink)
    if (d.proofs_waiting) add('proofs', `${plural(d.proofs_waiting, 'payment')} to confirm`, at('billing'))
    const decide = (d.house_operations?.late_entries_waiting ?? 0) + (d.house_operations?.overnight_waiting ?? 0)
    if (decide) add('decide', `${plural(decide, 'curfew or visitor request')} to decide`, at('houseops'))
    const otherRepairs = (d.repairs?.open ?? 0) - (d.repairs?.urgent ?? 0)
    if (otherRepairs > 0) add('repairs', `${plural(otherRepairs, 'open repair')}`, at('maintenance'))
    if (d.house_operations?.repeated_late) add('late', `${plural(d.house_operations.repeated_late, 'boarder')} often back after curfew`, at('houseops'))
  }

  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent))
}
