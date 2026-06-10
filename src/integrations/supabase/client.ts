import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ⚠️ Credenciales fijas del proyecto Lovable Cloud.
// Las env vars VITE_SUPABASE_* NO se inyectan en el build de producción de Lovable,
// así que usarlas aquí causa `Invalid supabaseUrl` y bloquea el montaje de React.
const runtimeSupabaseUrl = typeof window !== 'undefined'
  ? String((window as any).__ENV__?.VITE_SUPABASE_URL ?? (window as any)._env_?.VITE_SUPABASE_URL ?? (window as any).VITE_SUPABASE_URL ?? '').trim()
  : '';
const runtimeSupabaseKey = typeof window !== 'undefined'
  ? String((window as any).__ENV__?.VITE_SUPABASE_PUBLISHABLE_KEY ?? (window as any)._env_?.VITE_SUPABASE_PUBLISHABLE_KEY ?? (window as any).__ENV__?.VITE_SUPABASE_ANON_KEY ?? (window as any)._env_?.VITE_SUPABASE_ANON_KEY ?? (window as any).VITE_SUPABASE_ANON_KEY ?? '').trim()
  : '';

const envSupabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? runtimeSupabaseUrl ?? '').trim();
const envSupabaseKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? runtimeSupabaseKey ?? '').trim();

const isValidHttpUrl = (value?: string) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const hasValidSupabaseKey = (value?: string) => {
  return typeof value === 'string' && value.trim().length > 20;
};

export const supabaseIsConfigured = isValidHttpUrl(envSupabaseUrl) && hasValidSupabaseKey(envSupabaseKey);

const SUPABASE_URL = supabaseIsConfigured ? envSupabaseUrl : 'https://invalid.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = supabaseIsConfigured ? envSupabaseKey : 'invalid';

if (!supabaseIsConfigured) {
  console.error('[Supabase] Configuración incompleta o inválida. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
}

console.debug('[Supabase] Configuración detectada:', {
  url: Boolean(envSupabaseUrl),
  key: Boolean(envSupabaseKey),
  runtimeFallback: Boolean(runtimeSupabaseUrl || runtimeSupabaseKey),
});

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
});