import { supabase, supabaseIsConfigured } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type AppSettingsRow = Tables<'app_settings'>;

const APP_SETTINGS_VERSION_KEY = 'app_version';

export async function getOfficialAppVersion(): Promise<string | null> {
  if (!supabaseIsConfigured) {
    console.warn('[appSettings] Supabase no configurado, no se puede leer la versión oficial.');
    return null;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', APP_SETTINGS_VERSION_KEY)
    .maybeSingle();

  if (error) {
    console.warn('[appSettings] Error consultando app_settings:', error);
    return null;
  }

  if (!data || typeof data.value !== 'string') {
    return null;
  }

  return data.value;
}

export async function ensureOfficialAppVersion(version: string): Promise<string | null> {
  if (!supabaseIsConfigured) {
    return null;
  }

  const existingVersion = await getOfficialAppVersion();
  if (existingVersion) {
    return existingVersion;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .upsert(
      { key: APP_SETTINGS_VERSION_KEY, value: version },
      { onConflict: 'key', returning: 'representation' }
    );

  if (error) {
    console.warn('[appSettings] No se pudo crear app_settings.app_version:', error);
    return null;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return version;
  }

  return typeof data[0]?.value === 'string' ? data[0].value : version;
}

export function subscribeOfficialAppVersion(onChange: (version: string) => void) {
  if (!supabaseIsConfigured) {
    return () => {};
  }

  const channel = supabase
    .channel('official-app-version')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_settings',
        filter: `key=eq.${APP_SETTINGS_VERSION_KEY}`,
      },
      (payload) => {
        const newValue = payload.new?.value;
        if (typeof newValue === 'string') {
          console.debug('[appSettings] Versión oficial actualizada desde Supabase:', newValue);
          onChange(newValue);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
