import { computed, useAttrs } from 'vue'
import { useRouter } from 'vue-router'
import type { LinkTarget } from './types'

/**
 * Tappable DormLink components: with `to` they navigate (Ionic's outlet animates the push);
 * with a plain @click listener (passed through as an attribute) they act as a button.
 * Either way they render as a real <button> so keyboards and screen readers reach them.
 */
export function useTap(props: { to?: LinkTarget }) {
  const attrs = useAttrs()
  const router = useRouter()

  const tappable = computed(() => !!props.to || typeof attrs.onClick === 'function' || Array.isArray(attrs.onClick))

  function go() {
    if (props.to) router?.push(props.to)
  }

  return { tappable, go }
}
