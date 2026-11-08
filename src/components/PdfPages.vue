<template>
  <div ref="scroller" class="pdf-pages" :aria-busy="loading">
    <DlLoader v-if="loading" class="loading" :size="44" label="Opening the PDF" />
    <div v-else-if="failed" class="fallback">
      <FileText :size="40" aria-hidden="true" />
      <p>This PDF can’t be shown here.</p>
      <button type="button" class="open" @click="emit('open-outside')">Open file</button>
    </div>
    <canvas v-for="n in pageCount" v-show="!loading && !failed" :key="n" :ref="(el) => (canvases[n - 1] = el as HTMLCanvasElement)" class="page" :aria-label="`Page ${n} of ${pageCount}`" />
  </div>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DlLoader from '@/components/dl/DlLoader.vue'

/**
 * A PDF drawn page by page inside the app (Phase 17.1), with Mozilla's PDF.js,
 * loaded only when a PDF is opened. `zoom` 1 = pages as wide as the screen.
 * The parent shows a Download / Open file button for when it cannot be drawn.
 */
const props = withDefaults(defineProps<{ src: string; zoom?: number }>(), { zoom: 1 })
const emit = defineEmits<{ pages: [count: number]; 'open-outside': [] }>()

type PdfDoc = import('pdfjs-dist/legacy/build/pdf.mjs').PDFDocumentProxy
type PdfTask = import('pdfjs-dist/legacy/build/pdf.mjs').PDFDocumentLoadingTask

const scroller = ref<HTMLElement | null>(null)
const canvases: HTMLCanvasElement[] = []
const pageCount = ref(0)
const loading = ref(true)
const failed = ref(false)
let doc: PdfDoc | null = null
let task: PdfTask | null = null
let drawing = 0

async function load(): Promise<void> {
  loading.value = true
  failed.value = false
  pageCount.value = 0
  await task?.destroy()
  task = null
  doc = null
  try {
    // The legacy build: the standard one needs features (Promise.withResolvers,
    // Map.getOrInsertComputed) that many phones' Android System WebView does not have yet.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    task = pdfjs.getDocument({ url: props.src })
    doc = await task.promise
    pageCount.value = doc.numPages
    emit('pages', doc.numPages)
    loading.value = false
    await nextTick()
    await draw()
  } catch {
    loading.value = false
    failed.value = true
  }
}

/** Draw every page at the screen width times the zoom, sharp on high-density screens. */
async function draw(): Promise<void> {
  if (!doc || !scroller.value) return
  const run = ++drawing
  const width = Math.max(240, Math.min(scroller.value.clientWidth - 24, 900)) * props.zoom
  const ratio = window.devicePixelRatio || 1
  for (let n = 1; n <= doc.numPages; n++) {
    if (run !== drawing) return
    const page = await doc.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: (width / base.width) * ratio })
    const canvas = canvases[n - 1]
    if (!canvas) continue
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    canvas.style.width = `${Math.floor(viewport.width / ratio)}px`
    canvas.style.height = `${Math.floor(viewport.height / ratio)}px`
    await page.render({ canvas, viewport }).promise
  }
}

watch(() => props.src, load)
watch(() => props.zoom, () => void draw())
onMounted(load)
onBeforeUnmount(() => {
  drawing++
  void task?.destroy()
})
</script>

<style scoped>
.pdf-pages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 24px;
  -webkit-overflow-scrolling: touch;
}
.page {
  flex-shrink: 0;
  background: #fff;
  box-shadow: 0 2px 12px rgb(0 0 0 / 0.4);
}
.loading {
  margin: auto;
  color: #fff;
}
.fallback {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.fallback p {
  margin: 0;
}
.open {
  border: 0;
  border-radius: 999px;
  padding: 12px 24px;
  font: inherit;
  font-weight: 700;
  background: var(--brand-accent);
  color: var(--text-on-accent);
  cursor: pointer;
}
</style>
