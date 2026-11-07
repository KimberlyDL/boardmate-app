/** Public contact details shown on the Contact page. Placeholder: replace before launch. */
export const SUPPORT_EMAIL = 'support@dormlink.example'

/**
 * Where maps open when there is nothing to show yet: the whole Philippines.
 * The Finder map then fits the places found, or the distance circle.
 */
export const DEFAULT_MAP_CENTER: [number, number] = [12.3, 122.6]
export const DEFAULT_MAP_ZOOM = 6

/**
 * The website address the Android app answers for (App Links, Phase 17.3).
 * Must match android:host in AndroidManifest.xml and the site that serves
 * /.well-known/assetlinks.json. Changing it needs a new app build.
 */
export const WEB_HOST = 'dormlink.vercel.app'

/** The Android app's id (capacitor.config.ts appId). */
export const ANDROID_APP_ID = 'com.dormlink.app'
