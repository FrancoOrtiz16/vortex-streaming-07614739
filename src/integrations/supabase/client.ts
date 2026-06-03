import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ⚠️ Credenciales fijas del proyecto Lovable Cloud.
// Las env vars VITE_SUPABASE_* NO se inyectan en el build de producción de Lovable,
// así que usarlas aquí causa `Invalid supabaseUrl` y bloquea el montaje de React.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://qxmecegqnapcjlchjqld.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4bWVjZWdxbmFwY2psY2hqcWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjU0MTAsImV4cCI6MjA4OTg0MTQxMH0.8ygnUHfD4p77GlyrUXJYzVq7zsx6CuaT1rr9fjbZoQU";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
});