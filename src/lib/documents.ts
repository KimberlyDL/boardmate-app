import type { DocumentLink } from '@/types/billing'

/**
 * Open a PDF (receipt, statement, notice) in a new tab. The tab is opened
 * before the link is fetched, because browsers block a tab opened after an
 * await; it is then pointed at the short-lived link. If the tab was blocked
 * anyway, the current page goes to the PDF instead.
 */
export async function openDocument(getLink: () => Promise<DocumentLink>): Promise<void> {
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
