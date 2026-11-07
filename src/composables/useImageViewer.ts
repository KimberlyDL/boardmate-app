import { ref } from 'vue'

export interface ViewerImage {
  src: string
  alt?: string
}

/** What the viewer shows; one viewer for the whole app (components/ImageViewer.vue in App.vue). */
const images = ref<ViewerImage[]>([])
const index = ref(0)
const isOpen = ref(false)

/**
 * Show photos and screenshots in an overlay on the same page, instead of a new
 * tab: payment proofs, utility bill photos, repair photos, IDs, listing photos.
 * A PDF (some proofs and IDs are PDFs) shows an "Open file" button instead,
 * since phones cannot draw a PDF inside the page.
 */
export function useImageViewer() {
  function open(list: (string | ViewerImage)[], start = 0): void {
    const items = list.filter(Boolean).map((i) => (typeof i === 'string' ? { src: i } : i))
    if (!items.length) return
    images.value = items
    index.value = Math.min(Math.max(start, 0), items.length - 1)
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
  }

  function go(step: number): void {
    const n = images.value.length
    if (n > 1) index.value = (index.value + step + n) % n
  }

  return { images, index, isOpen, open, close, go }
}

/** True when a link points at a PDF (the stored file name keeps its extension, even in signed links). */
export function isPdfUrl(url: string): boolean {
  return /\.pdf(?:$|[?#&]|%3F)/i.test(url)
}
