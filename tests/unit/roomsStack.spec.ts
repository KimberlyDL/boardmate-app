import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import RoomsStack, { type StackTile } from '@/components/rooms/RoomsStack.vue'

const tiles: StackTile[] = [
  { id: 1, floor: null, title: '01', status: 'available' },
  { id: 2, floor: 1, title: '101', status: 'full' },
  { id: 3, floor: 2, title: '201', status: 'available', line1: '₱2,500', line2: '1/4 beds free' },
  { id: 4, floor: 2, title: '202', status: 'not_ready' },
]

describe('RoomsStack', () => {
  test('stacks the floors with the top floor first and rooms without a floor at the bottom', () => {
    const wrapper = mount(RoomsStack, { props: { tiles } })

    expect(wrapper.findAll('.level-label').map((l) => l.text())).toEqual(['2nd floor', '1st floor', 'No floor set'])
    expect(wrapper.findAll('.level')[0].findAll('.tile').map((t) => t.find('.title').text())).toEqual(['201', '202'])
    expect(wrapper.find('.tile.available').text()).toContain('1/4 beds free')
    expect(wrapper.findAll('.tile.full')).toHaveLength(1)
    expect(wrapper.findAll('.tile.not_ready')).toHaveLength(1)
  })

  test('tapping a room emits its id', async () => {
    const wrapper = mount(RoomsStack, { props: { tiles } })

    await wrapper.findAll('.tile')[1].trigger('click')

    expect(wrapper.emitted('select')).toEqual([[4]])
  })
})
