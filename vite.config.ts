/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy(),
    // Installable app + offline app shell. The API is never cached: screens still need
    // the network for data. "prompt": a new version waits until the user taps Refresh
    // (components/UpdatePrompt.vue), so nobody loses a half-filled form.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.png', 'icons/apple-touch-icon-180x180.png', 'icons/icon.svg'],
      manifest: {
        id: '/',
        name: 'DormLink',
        short_name: 'DormLink',
        description: 'Find a boarding house near your school, and manage rooms, bills and tenants.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f6f1',
        theme_color: '#e9f8f0',
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: '/icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The modern build only (old browsers without service workers load the legacy files online),
        // and the latin font files; other scripts' fonts load when needed.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', '**/*-latin-*.woff2', '**/*-latin-ext-*.woff2'],
        globIgnores: ['**/*-legacy-*.js', '**/polyfills-legacy*.js'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/storage\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Fixed vendor chunks. Without them the bundler put Ionic's shared helper inside our own
        // `api` chunk, which imports Ionic back: a loop that crashed the production app on start
        // ("e is not a function"). Framework code now loads before any app code.
        codeSplitting: {
          groups: [
            { name: 'ionic', test: /node_modules[\\/](@ionic|@stencil|ionicons)[\\/]/, priority: 30 },
            { name: 'vue', test: /node_modules[\\/](vue|@vue|vue-router|pinia)[\\/]/, priority: 20 },
            { name: 'capacitor', test: /node_modules[\\/]@capacitor[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // A device zone ahead of Manila, where date-only values used to show a day early.
    env: { TZ: 'Asia/Tokyo' },
  }
})
