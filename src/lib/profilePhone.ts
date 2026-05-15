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

async function fetchProfileRecord(userId: string, columns: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(columns)
    .eq('user_id', userId)
    .limit(1)
    .single();

  return { data: data as Record<string, any> | null, error };
}

export async function fetchProfileWhatsAppPhone(userId: string) {
  if (!userId) return null;

  const { data, error } = await fetchProfileRecord(userId, 'phone');
  if (error) {
    if (!isSchemaCacheMissingColumnError(error)) {
      console.warn('[profilePhone] Unexpected profile query error', error);
      return null;
    }

    const { data: fallbackData, error: fallbackError } = await fetchProfileRecord(userId, 'profile_phone');
    if (!fallbackError && fallbackData) {
      return fallbackData.profile_phone || null;
    }
    if (!isSchemaCacheMissingColumnError(fallbackError)) {
      console.warn('[profilePhone] Unexpected profile query error', fallbackError);
    }

    return null;
  }

  if (data) {
    if (data.phone) {
      return data.phone;
    }

    const { data: fallbackData, error: fallbackError } = await fetchProfileRecord(userId, 'profile_phone');
    if (!fallbackError && fallbackData) {
      return fallbackData.profile_phone || null;
    }
    if (!isSchemaCacheMissingColumnError(fallbackError)) {
      console.warn('[profilePhone] Unexpected profile query error', fallbackError);
    }
  }

  return null;
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
