<template>
  <component
    :is="tappable ? 'button' : 'div'"
    :type="tappable ? 'button' : undefined"
    class="dl-listing-card"
    :class="[layout, { full }]"
    :data-dl-focus="tappable ? '' : undefined"
    @click="go"
  >
    <span class="photo">
      <img v-if="imageSrc" :src="imageSrc" alt="" loading="lazy" />
      <span v-else class="placeholder"><ImageIcon :size="20" aria-hidden="true" /></span>
      <DlSticker v-if="sticker && layout === 'vertical'" class="sticker" size="sm" :rotate="-3">{{ sticker }}</DlSticker>
    </span>
    <span class="body">
      <span v-if="eyebrow" class="dl-eyebrow">{{ eyebrow }}</span>
      <span class="title">{{ title }}</span>
      <span class="price-line">
        <DlStatusTag v-if="full" tone="neutral">Full right now</DlStatusTag>
        <template v-else-if="price">
          <span class="price">{{ price }}</span><span class="period">{{ period }}</span>
        </template>
        <span v-else class="period">Price on request</span>
      </span>
      <span v-for="m in metaLines" :key="m" class="meta">{{ m }}</span>
      <span v-if="$slots.default" class="tags"><slot /></span>
    </span>
  </component>
</template>

<script setup lang="ts">
import { Image as ImageIcon } from 'lucide-vue-next'
import { computed } from 'vue'
import DlStatusTag from './DlStatusTag.vue'
import DlSticker from './DlSticker.vue'
import { useTap } from './useTap'

/**
 * A place in the finder: photo (or a placeholder), name, price in Pine, short meta lines,
 * and optional tags in the default slot. horizontal for lists, vertical for featured cards.
 */
const props = withDefaults(
  defineProps<{
    title: string
    /** Formatted, e.g. "from ₱2,800". Empty → "Price on request". */
    price?: string | null
    period?: string
    meta?: string | (string | null | undefined)[]
    eyebrow?: string
    imageSrc?: string | null
    sticker?: string
    full?: boolean
    layout?: 'horizontal' | 'vertical'
    to?: string
  }>(),
  { price: undefined, period: ' /mo', meta: undefined, eyebrow: undefined, imageSrc: undefined, sticker: undefined, layout: 'horizontal', to: undefined },
)

const { tappable, go } = useTap(props)
const metaLines = computed(() => (Array.isArray(props.meta) ? props.meta : [props.meta]).filter((m): m is string => !!m))
</script>

<style scoped>
.dl-listing-card {
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--gradient-card);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
}
button.dl-listing-card {
  cursor: pointer;
  transition: transform var(--motion-fast) var(--ease-out);
}
button.dl-listing-card:active { transform: scale(0.98); }
.vertical { flex-direction: column; padding: 0 0 14px; overflow: hidden; }
.vertical .body { padding: 0 14px; }
.full .photo { opacity: 0.6; }

.photo {
  position: relative;
  flex-shrink: 0;
  width: 104px;
  height: 104px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-muted);
}
.vertical .photo { width: 100%; height: 168px; border-radius: 0; }
.photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-muted);
  background: repeating-linear-gradient(135deg, var(--bg-muted) 0 10px, var(--skeleton-neutral) 10px 20px);
}
.sticker { position: absolute; left: 12px; bottom: 12px; }

.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 2px 0;
}
.title {
  font-family: var(--font-display);
  font-size: 16px;
  line-height: 21px;
  font-weight: 700;
}
.price-line { display: flex; align-items: baseline; gap: 2px; }
.price {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--brand-primary);
}
.period { font-size: 13px; color: var(--text-muted); }
.meta { font-size: 12px; line-height: 16px; color: var(--text-muted); }
.tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
</style>
