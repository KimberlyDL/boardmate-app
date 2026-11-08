import { Capacitor } from '@capacitor/core'
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
 * Keep a copy of a file from its (short-lived) link.
 *
 * - Android app: the app shell hands links to other sites to the phone's
 *   browser, which downloads the file and shows it in Downloads. A `download`
 *   link or a new tab does nothing useful inside the app.
 * - Website: a download link, opened in a new tab when the browser shows the
 *   file instead (a PDF), so the page stays where it is.
 */
export function saveFile(url: string, filename?: string): void {
  if (Capacitor.isNativePlatform()) {
    window.location.href = url
    return
  }
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener'
  if (filename) link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * Download a file the app cannot show (CSV reports and exports). On the
 * website the tab is opened before the link is fetched, because browsers block
 * a tab opened after an await; it is then pointed at the short-lived link. If
 * the tab was blocked anyway, the current page goes to the file instead. In
 * the Android app there are no tabs: the phone's browser downloads it.
 */
export async function downloadFile(getLink: () => Promise<DocumentLink>): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    saveFile((await getLink()).url)
    return
  }
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
