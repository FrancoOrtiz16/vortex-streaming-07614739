import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Esto intenta leer cualquier variable que Lovable haya configurado
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  "";

// Validación manual por si las variables fallan
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn("Faltan credenciales de Supabase. Revisa 'Environment Variables' en Settings.");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});