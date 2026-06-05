/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_DISABLE_CACHE_CONTROL_AUTO_INIT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
