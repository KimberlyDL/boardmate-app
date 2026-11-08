<template>
  <Teleport to="body">
    <div v-if="open" class="table-preview" role="dialog" aria-modal="true" :aria-label="preview ? `Preview: ${preview.title}` : 'Preview'" @click.self="emit('close')">
      <section class="panel">
        <header class="head">
          <div class="titles">
            <p class="eyebrow">Preview</p>
            <h2>{{ preview?.title ?? 'Loading…' }}</h2>
            <p v-if="preview" class="sub">{{ preview.subtitle }}</p>
          </div>
          <button ref="closeButton" type="button" class="close" aria-label="Close preview" @click="emit('close')">
            <X :size="22" aria-hidden="true" />
          </button>
        </header>

        <div class="body">
          <DlLoader v-if="!preview" class="loading" :size="48" label="Getting the first rows" />
          <template v-else>
            <p class="count">{{ countText }}</p>
            <p v-if="!preview.total" class="empty">Nothing in this report for the period chosen.</p>
            <div v-else class="scroller" tabindex="0" aria-label="Report rows">
              <table>
                <thead>
                  <tr>
                    <th v-for="(h, i) in preview.headers" :key="i" :class="{ money: isMoney(i) }" scope="col">{{ h }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, r) in preview.rows" :key="r">
                    <td v-for="(value, i) in row" :key="i" :class="{ money: isMoney(i) }">{{ value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>

        <footer class="foot">
          <span class="foot-label">Download</span>
          <div class="buttons">
            <button
              v-for="f in TABLE_FORMATS"
              :key="f.value"
              type="button"
              class="get"
              :class="{ main: f.value === preferred }"
              :disabled="busy !== null"
              @click="emit('download', f.value)"
            >
              <DlLoader v-if="busy === f.value" variant="ring" :size="16" />
              <component :is="ICONS[f.value]" v-else :size="18" aria-hidden="true" />
              {{ f.label }}
            </button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { FileSpreadsheet, FileText, FileType2, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DlLoader from '@/components/dl/DlLoader.vue'
import { TABLE_FORMATS, type TableFormat, type TablePreview } from '@/services/reports'

/**
 * A report or export previewed on the same page, over it: its first rows as a
 * table (scrolls sideways on a phone, the header stays on top), how many rows
 * there are, and buttons to download it as Excel, PDF or CSV. Close with ×,
 * Esc, a tap beside it or the phone's back button.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    /** null while loading */
    preview: TablePreview | null
    /** The format being downloaded, if any */
    busy?: TableFormat | null
    /** Shown as the main button */
    preferred?: TableFormat
  }>(),
  { busy: null, preferred: 'xlsx' },
)
const emit = defineEmits<{ close: []; download: [format: TableFormat] }>()

const ICONS = { xlsx: FileSpreadsheet, pdf: FileText, csv: FileType2 }
const closeButton = ref<HTMLButtonElement | null>(null)

const isMoney = (i: number) => props.preview?.money_columns.includes(i) ?? false

const countText = computed(() => {
  const p = props.preview
  if (!p || !p.total) return ''
  const rows = (n: number) => `${n.toLocaleString('en-PH')} ${n === 1 ? 'row' : 'rows'}`
  return p.rows.length < p.total ? `Showing the first ${rows(p.rows.length)} of ${rows(p.total)}. The file has all of them.` : `All ${rows(p.total)}.`
})

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      closeButton.value?.focus()
    }
  },
)

function onKey(e: KeyboardEvent): void {
  if (props.open && e.key === 'Escape') emit('close')
}

/** The phone's back button closes the preview first (Ionic hands it out by priority). */
function onBackButton(e: Event): void {
  (e as CustomEvent<{ register: (priority: number, handler: (next: () => void) => void) => void }>).detail.register(
    140,
    (next) => (props.open ? emit('close') : next()),
  )
}

onMounted(() => {
  document.addEventListener('ionBackButton', onBackButton)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('ionBackButton', onBackButton)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.table-preview {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(8 12 10 / 0.55);
  animation: dl-fade-in 0.15s ease-out;
}
.panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1040px;
  height: calc(100% - 24px - env(safe-area-inset-top, 0px));
  border-radius: var(--radius-lg, 20px) var(--radius-lg, 20px) 0 0;
  background: var(--bg-canvas, #f6f7f5);
  color: var(--text-primary);
  box-shadow: 0 -8px 32px rgb(0 0 0 / 0.25);
  overflow: hidden;
  animation: dl-pop-in 0.2s ease-out;
}
.head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 16px 12px;
  background: var(--bg-surface, #fff);
  border-bottom: 1px solid var(--bm-border, rgb(0 0 0 / 0.08));
}
.titles {
  flex: 1;
  min-width: 0;
}
.eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-primary);
}
h2 {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: 20px;
  line-height: 24px;
}
.sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
.close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  border: 0;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-primary);
  cursor: pointer;
}
.body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 0;
}
.loading {
  margin: auto;
}
.count {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-secondary);
}
.empty {
  margin: 48px 0;
  text-align: center;
  color: var(--text-muted);
}
.scroller {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: var(--radius-md, 12px);
  background: var(--bg-surface, #fff);
  -webkit-overflow-scrolling: touch;
}
table {
  border-collapse: separate;
  border-spacing: 0;
  min-width: 100%;
  font-size: 13px;
}
th,
td {
  padding: 8px 12px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--bm-border, rgb(0 0 0 / 0.06));
}
th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--card-pine-gradient, #e8f1ee);
  color: var(--card-pine-ink, #134e4a);
  font-weight: 700;
}
tbody tr:nth-child(even) td {
  background: var(--bg-muted);
}
.money {
  text-align: right;
  font-family: var(--font-mono);
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  background: var(--bg-surface, #fff);
  border-top: 1px solid var(--bm-border, rgb(0 0 0 / 0.08));
}
.foot-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}
.buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.get {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border: 1.5px solid var(--bm-border, rgb(0 0 0 / 0.12));
  border-radius: 999px;
  background: var(--bg-surface, #fff);
  color: var(--text-primary);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.get.main {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  color: var(--text-on-primary, #fff);
}
.get:disabled {
  opacity: 0.6;
  cursor: default;
}
.close:focus-visible,
.get:focus-visible,
.scroller:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}

/* Wide screens: a centred window instead of a sheet from the bottom. */
@media (min-width: 768px) {
  .table-preview {
    align-items: center;
    padding: 32px;
  }
  .panel {
    height: min(760px, 100%);
    border-radius: var(--radius-lg, 20px);
  }
}
</style>
