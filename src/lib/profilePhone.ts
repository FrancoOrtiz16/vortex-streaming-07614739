import { supabase } from '@/integrations/supabase/client';

function isSchemaCacheMissingColumnError(error: any) {
  if (!error) return false;
  const message = String(error.message || error.msg || error.messageText || '');
  return (
    message.includes('Could not find the') ||
    message.includes('schema cache') ||
    message.includes('PGRST204')
  );
}

async function fetchProfileRecord(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .single();

  return { data: data as Record<string, any> | null, error };
}

export async function fetchProfileWhatsAppPhone(userId: string) {
  if (!userId) return null;

  const { data, error } = await fetchProfileRecord(userId);
  if (error) {
    console.warn('[profilePhone] Error fetching profile record', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return data.phone ?? data.profile_phone ?? null;
}

export async function saveProfileWhatsAppPhone(userId: string, phoneValue: string) {
  if (!userId) {
    return { data: null, error: { message: 'Usuario no válido' } };
  }

  const sanitizedPhone = phoneValue ? phoneValue : null;
  const tryPayloads = [
    { phone: sanitizedPhone },
    { profile_phone: sanitizedPhone },
  ];

  for (const payload of tryPayloads) {
    const { error, data } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', userId);

    if (!error) {
      return { data, error: null };
    }

    if (!isSchemaCacheMissingColumnError(error)) {
      return { data: null, error };
    }
  }

  return { data: null, error: { message: 'No se pudo guardar el número de WhatsApp' } };
}
