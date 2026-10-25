/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  /** Laravel API base, e.g. http://localhost:8000/api (the client appends /v1). */
  readonly VITE_API_URL: string
  /** Google OAuth Web client ID. Optional: the Google button is hidden without it. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
