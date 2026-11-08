import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import { defineComponent } from 'vue'
import { DlCard } from '@/components/dl'

/**
 * A card with nothing to show is not drawn (DlCard.vue), and a list without rows is hidden by
 * `ion-list:not(:has(> *))` (theme/ionic.css): Vue leaves only empty placeholders inside it.
 */
const noRows = (el: Element) => el.matches(':not(:has(> *))')

const Host = defineComponent({
  components: { DlCard },
  props: { items: { type: Array as () => string[], default: () => [] }, note: { type: Boolean, default: false } },
  template: `
    <div>
      <DlCard class="card">
        <p v-for="i in items" :key="i">{{ i }}</p>
        <p v-if="note">A note</p>
      </DlCard>
      <ion-list class="list">
        <ion-item v-for="i in items" :key="i">{{ i }}</ion-item>
      </ion-list>
    </div>`,
})

describe('empty cards and lists', () => {
  test('nothing to show leaves them empty, so they are not drawn', () => {
    const w = mount(Host, { global: { config: { compilerOptions: { isCustomElement: (t) => t.startsWith('ion-') } } } })
    expect(w.find('.card').exists()).toBe(false)
    expect(noRows(w.find('.list').element)).toBe(true)
  })

  test('any row makes them show', async () => {
    const w = mount(Host, { props: { items: ['Water'] }, global: { config: { compilerOptions: { isCustomElement: (t) => t.startsWith('ion-') } } } })
    expect(w.find('.card').exists()).toBe(true)
    expect(noRows(w.find('.list').element)).toBe(false)

    await w.setProps({ items: [], note: true })
    expect(w.find('.card').text()).toBe('A note')

    await w.setProps({ note: false })
    expect(w.find('.card').exists()).toBe(false)
  })
})
