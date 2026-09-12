/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Public URL of the contact API endpoint (e.g. https://your-api.vercel.app/api/contact).
   * This is NOT a secret — it is embedded in the client bundle. Never put credentials in `VITE_*`.
   */
  readonly VITE_CONTACT_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
