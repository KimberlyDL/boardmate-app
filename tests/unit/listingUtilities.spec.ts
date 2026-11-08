import { describe, expect, test } from 'vitest'
import { propertyUtilityRows, utilityText } from '@/lib/utilities'
import type { ListingUtility, PublicRoom, RoomUtility } from '@/types/booking'

const util = (over: Partial<RoomUtility>): RoomUtility => ({
  type: 'water', name: 'Water', method: 'fixed_per_bedspace', method_label: 'Fixed per bedspace',
  billed_by: 'owner', amount_centavos: 15000, applies_to: null, ...over,
})
const wifi = util({ type: 'internet', name: 'Wi-Fi', method: 'included', method_label: 'Included in rent', amount_centavos: null })
const room = (id: number, utilities: RoomUtility[]) => ({ id, utilities }) as PublicRoom

describe('listing utilities', () => {
  test('shows the terms when every room pays a utility the same way', () => {
    const rows = propertyUtilityRows([room(1, [util({}), wifi]), room(2, [util({}), wifi])], [])
    expect(rows.map((r) => [r.name, r.text])).toEqual([
      ['Water', 'Fixed per bedspace: ₱150.00 / month'],
      ['Wi-Fi', 'Included in the rent'],
    ])
  })

  test('says it depends on the room when rooms differ, using the property name', () => {
    const property: ListingUtility[] = [{ ...util({ type: 'electricity', name: 'Meralco', method: 'actual_bill', amount_centavos: null }) }]
    const rows = propertyUtilityRows(
      [
        room(1, [util({ amount_centavos: 15000 }), util({ type: 'electricity', name: 'Room meter', method: 'actual_bill', amount_centavos: null })]),
        room(2, [util({ method: 'fixed_per_property', method_label: 'Fixed per whole room', amount_centavos: 40000 }), util({ type: 'electricity', name: 'Meralco', method: 'actual_bill', amount_centavos: null })]),
      ],
      property,
    )
    expect(rows.map((r) => [r.name, r.text])).toEqual([
      ['Water', null],
      ['Meralco', 'Your share of the actual bill'],
    ])
  })

  test('a utility missing from some rooms depends on the room', () => {
    const rows = propertyUtilityRows([room(1, [wifi]), room(2, [])], [])
    expect(rows[0].text).toBeNull()
  })

  test('marks prices in a room that is also rented whole', () => {
    expect(utilityText(util({ applies_to: 'bedspace' }))).toBe('Per bedspace: ₱150.00 / month')
    expect(utilityText(util({ applies_to: 'whole_room', amount_centavos: 40000 }))).toBe('Whole room: ₱400.00 / month')
  })
})
