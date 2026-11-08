<template>
  <div v-if="show" class="open-in-app" role="region" aria-label="Open in the app">
    <img :src="ICON" alt="" width="28" height="28" />
    <div class="copy">
      <p><strong>Have the DormLink app?</strong> Open this page in it.</p>
      <button type="button" class="snooze" @click="snooze(SNOOZE_DAYS)">Not for {{ SNOOZE_DAYS }} days</button>
    </div>
    <a class="open" :href="intentUrl" @click="snooze(1)">Open</a>
    <button type="button" class="close" aria-label="Not now" @click="hideForVisit">
      <X :size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ANDROID_APP_ID, WEB_HOST } from '@/lib/site'

/**
 * "Open in the app" (Phase 17.3): only in a browser on an Android phone, never
 * in the app itself or the installed web app. It shows once per visit, when the
 * website is opened (not again on every page or when the tab comes back):
 * × hides it for this visit, "Not for 7 days" for a week, and Open for a day.
 * Without the app, Android stays on the page (the fallback).
 */
const SNOOZE_DAYS = 7
/** localStorage: the time (ms) until which it stays hidden. */
const UNTIL_KEY = 'dormlink.openInAppHiddenUntil'
/** sessionStorage: already shown during this visit (this tab), so it does not come back on a reload. */
const VISIT_KEY = 'dormlink.openInAppThisVisit'
/** The old "never again" choice, replaced by the snooze. */
const OLD_KEY = 'dormlink.openInAppDismissed'
const ICON = '/favicon.png'
const route = useRoute()

const safely = <T,>(run: () => T, fallback: T): T => {
  try {
    return run()
  } catch {
    return fallback
  }
}

function hiddenNow(): boolean {
  safely(() => localStorage.removeItem(OLD_KEY), undefined)
  const until = Number(safely(() => localStorage.getItem(UNTIL_KEY), null) ?? 0)
  // Shown (or closed) earlier in this tab: a reload or a link inside the site is the same visit.
  const thisVisit = safely(() => sessionStorage.getItem(VISIT_KEY), null) !== null
  return thisVisit || until > Date.now()
}

const androidBrowser =
  !Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent) && !window.matchMedia?.('(display-mode: standalone)').matches
const show = ref(androidBrowser && !hiddenNow())
if (show.value) safely(() => sessionStorage.setItem(VISIT_KEY, 'shown'), undefined)

/** An Android intent link: opens the app on the same page, or stays here when the app is not installed. */
const intentUrl = computed(() => {
  const here = `${WEB_HOST}${route.fullPath}`
  return `intent://${here}#Intent;scheme=https;package=${ANDROID_APP_ID};S.browser_fallback_url=${encodeURIComponent(`https://${here}`)};end`
})

/** Gone for the rest of this visit (private mode: it may come back next visit, which is fine). */
function hideForVisit(): void {
  show.value = false
  safely(() => sessionStorage.setItem(VISIT_KEY, 'closed'), undefined)
}

/** Gone for some days on this phone, and for this visit. */
function snooze(days: number): void {
  hideForVisit()
  safely(() => localStorage.setItem(UNTIL_KEY, String(Date.now() + days * 86_400_000)), undefined)
}
</script>

<style scoped>
.open-in-app {
  position: fixed;
  left: 12px;
  right: 12px;
  /* Above the bottom tab bar */
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  z-index: 25000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 12px;
  border-radius: 16px;
  background: var(--bg-surface, #fff);
  color: var(--text-primary);
  border: 1px solid var(--bm-border, rgb(0 0 0 / 0.1));
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  animation: dl-pop-in 0.2s ease-out;
}
.open-in-app img {
  border-radius: 8px;
  flex-shrink: 0;
}
.copy {
  flex: 1;
  min-width: 0;
}
p {
  margin: 0;
  font-size: 14px;
  line-height: 18px;
}
.snooze {
  margin-top: 2px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
}
.open {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--brand-primary);
  color: var(--text-on-primary, #fff);
  font-weight: 700;
  text-decoration: none;
}
.close {
  flex-shrink: 0;
  display: inline-flex;
  padding: 6px;
  border: 0;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
}
</style>
