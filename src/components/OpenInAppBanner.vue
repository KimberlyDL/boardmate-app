<template>
  <div v-if="show" class="open-in-app" role="region" aria-label="Open in the app">
    <img :src="ICON" alt="" width="28" height="28" />
    <p><strong>Have the DormLink app?</strong> Open this page in it.</p>
    <a class="open" :href="intentUrl" @click="remember">Open</a>
    <button type="button" class="close" aria-label="Not now" @click="dismiss">
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
 * in the app itself or the installed web app. Dismissing it is remembered on
 * this device. Without the app, Android stays on the page (the fallback).
 */
const KEY = 'dormlink.openInAppDismissed'
const ICON = '/favicon.png'
const route = useRoute()

function dismissedBefore(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

const androidBrowser =
  !Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent) && !window.matchMedia?.('(display-mode: standalone)').matches
const show = ref(androidBrowser && !dismissedBefore())

/** An Android intent link: opens the app on the same page, or stays here when the app is not installed. */
const intentUrl = computed(() => {
  const here = `${WEB_HOST}${route.fullPath}`
  return `intent://${here}#Intent;scheme=https;package=${ANDROID_APP_ID};S.browser_fallback_url=${encodeURIComponent(`https://${here}`)};end`
})

function dismiss(): void {
  show.value = false
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // Private mode: it comes back next visit, which is fine.
  }
}

/** Opening it once is enough: the banner does not come back. */
const remember = dismiss
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
p {
  margin: 0;
  flex: 1;
  font-size: 14px;
  line-height: 18px;
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
