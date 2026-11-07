import { useImageViewer } from '@/composables/useImageViewer'
import type { DocumentLink } from '@/types/billing'

/**
 * Open a PDF (receipt, statement, notice, settlement or insights summary) in
 * the app's viewer, on the same page (Phase 17.1). The viewer has a Download
 * button for keeping a copy.
 */
export async function openDocument(getLink: () => Promise<DocumentLink & { filename?: string }>, title?: string): Promise<void> {
  const { url, filename } = await getLink()
  useImageViewer().open([{ src: url, kind: 'pdf', alt: title, filename }])
}

/**
 * Download a file the app cannot show (CSV reports and exports). The tab is
 * opened before the link is fetched, because browsers block a tab opened after
 * an await; it is then pointed at the short-lived link. If the tab was blocked
 * anyway, the current page goes to the file instead.
 */
export async function downloadFile(getLink: () => Promise<DocumentLink>): Promise<void> {
  const tab = window.open('', '_blank')
  try {
    const { url } = await getLink()
    if (tab) tab.location.href = url
    else window.location.href = url
  } catch (e) {
    tab?.close()
    throw e
  }
}
