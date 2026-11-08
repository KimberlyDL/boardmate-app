import { Droplets, Receipt, Wifi, Zap } from 'lucide-vue-next'
import { peso } from './money'
import type { ListingUtility, PublicRoom, RoomUtility } from '@/types/booking'

/**
 * Utilities on a public listing. Each room carries what it pays (its own
 * accounts in place of the property's, the prices for how it is rented), so
 * the property section only shows a price when every room pays the same.
 */

/** "Included in the rent", "Fixed per bedspace: ₱150 / month", "Whole room: ₱400 / month". */
export function utilityText(u: ListingUtility | RoomUtility): string {
  if (u.billed_by === 'group') return 'Shared and paid by the boarders themselves'
  if (u.method === 'included') return 'Included in the rent'
  if (u.method === 'actual_bill') return 'Your share of the actual bill'
  const applies = 'applies_to' in u ? u.applies_to : null
  const label = applies === 'bedspace' ? 'Per bedspace' : applies === 'whole_room' ? 'Whole room' : u.method_label
  return `${label}: ${peso(u.amount_centavos)} / month`
}

export function utilityIcon(type: string) {
  return ({ water: Droplets, electricity: Zap, internet: Wifi } as Record<string, typeof Wifi>)[type] ?? Receipt
}

/** One utility the same way billing matches them: by type, or by name for "other". */
function utilityKey(u: { type: string; name: string }): string {
  return u.type === 'other' ? `other:${u.name.trim().toLowerCase()}` : u.type
}

export interface UtilityRow {
  key: string
  type: string
  name: string
  /** What every room pays, or null when it differs between rooms. */
  text: string | null
}

/**
 * The property's utility section: one row per utility. A row shows the
 * terms when every room pays them the same way, otherwise `text` is null
 * ("depends on the room"). Without rooms, the property's own accounts.
 */
export function propertyUtilityRows(rooms: PublicRoom[], utilities: ListingUtility[]): UtilityRow[] {
  if (!rooms.length) {
    return utilities.filter((u) => !u.for_room).map((u) => ({ key: utilityKey(u), type: u.type, name: u.name, text: utilityText(u) }))
  }

  const keys = [...new Set(rooms.flatMap((r) => r.utilities.map(utilityKey)))]
  return keys.map((key) => {
    const perRoom = rooms.map((r) =>
      r.utilities
        .filter((u) => utilityKey(u) === key)
        .map(utilityText)
        .join(' · '),
    )
    const sample = rooms.flatMap((r) => r.utilities).find((u) => utilityKey(u) === key)!
    // The property's name for it ("Meralco"), not a room meter's.
    const name = utilities.find((u) => !u.for_room && utilityKey(u) === key)?.name ?? sample.name
    const same = perRoom.every((t) => t !== '' && t === perRoom[0])
    return { key, type: sample.type, name, text: same ? perRoom[0] : null }
  })
}
