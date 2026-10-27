import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync, readFileSync } from 'node:fs';

/**
 * The API address bundled into the Android app (from .env.android, used by `npm run build:android`).
 * The app itself runs at https://localhost, so calling a plain-http API (a local backend while
 * developing) needs mixed content allowed. A real https API never turns this on.
 */
function androidApiUrl(): string {
  if (!existsSync('.env.android')) return '';
  const line = readFileSync('.env.android', 'utf8').split(/\r?\n/).find((l) => l.startsWith('VITE_API_URL='));
  return line?.slice('VITE_API_URL='.length).trim() ?? '';
}

const config: CapacitorConfig = {
  appId: 'com.dormlink.app',
  appName: 'DormLink',
  webDir: 'dist',
  android: {
    allowMixedContent: androidApiUrl().startsWith('http://'),
  },
  plugins: {
    // Native "Continue with Google" only; the other providers are left out of the app.
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
};

export default config;
