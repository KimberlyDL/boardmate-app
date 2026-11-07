import { App, type URLOpenListenerEvent } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { Router } from 'vue-router'
import { WEB_HOST } from './site'

/**
 * App Links (Phase 17.3): a website link opened on the phone (a reset-password
 * email, a shared listing) starts the app; this sends it to the same screen.
 * Links to other sites are left alone.
 */
export function installAppLinks(router: Router): void {
  if (!Capacitor.isNativePlatform()) return
  const go = (url: string | undefined) => {
    const target = url ? appPath(url) : null
    if (target && target !== router.currentRoute.value.fullPath) void router.push(target)
  }
  // The app was already open, or in the background.
  void App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => go(event.url))
  // The link started the app.
  void App.getLaunchUrl().then((launch) => go(launch?.url)).catch(() => undefined)
}

/** "https://dormlink.vercel.app/reset-password?token=x" → "/reset-password?token=x"; null for other sites. */
export function appPath(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname !== WEB_HOST) return null
    return `${u.pathname}${u.search}${u.hash}` || '/'
  } catch {
    return null
  }
}
