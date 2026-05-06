import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CredentialData {
  id: string;
  service_name: string;
  email_cuenta: string | null;
  password_cuenta: string | null;
  perfil: string | null;
  pin: string | null;
  user_id?: string;
  status?: string;
  next_renewal?: string | null;
}

interface UseCredentialDataResult {
  credentials: CredentialData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isReady: boolean; // False if credentials still being prepared
}

/**
 * Hook seguro para traer credenciales de una suscripción
 */
export const useCredentialData = (subscriptionId?: string): UseCredentialDataResult => {
  const [credentials, setCredentials] = useState<CredentialData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCredentials = useCallback(async () => {
    // Sin ID, retornar estado vacío
    if (!subscriptionId) {
      setCredentials(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.debug('[useCredentialData] Fetching credentials for:', subscriptionId?.slice(0, 8) + '...');

      // Esquema real: credential_email/credential_password/profile_name/profile_pin
      const { data, error: supabaseError } = await supabase
        .from('subscriptions')
        .select('id, user_id, service_name, credential_email, credential_password, profile_name, profile_pin, status, next_renewal')
        .eq('id', subscriptionId)
        .maybeSingle();

      if (supabaseError) {
        console.error('[useCredentialData] Supabase error:', supabaseError);
        setError(new Error(supabaseError.message || 'Error cargando credenciales'));
        setCredentials(null);
        return;
      }

      if (!data || Object.keys(data).length === 0) {
        console.warn('[useCredentialData] No credentials found for subscription:', subscriptionId?.slice(0, 8) + '...');
        setCredentials(null);
        return;
      }

      // Validar que tenga los campos básicos (alias internos -> esquema real)
      const d = data as any;
      const validCredential: CredentialData = {
        id: d?.id || subscriptionId || '',
        service_name: d?.service_name || '',
        email_cuenta: d?.credential_email ?? null,
        password_cuenta: d?.credential_password ?? null,
        perfil: d?.profile_name ?? null,
        pin: d?.profile_pin ?? null,
        user_id: d?.user_id,
        status: d?.status,
        next_renewal: d?.next_renewal ?? null,
      };

      setCredentials(validCredential);
      console.debug('[useCredentialData] Credentials loaded successfully');
    } catch (err) {
      console.error('[useCredentialData] Catch error:', err);
      setError(err instanceof Error ? err : new Error('Error desconocido'));
      setCredentials(null);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionId]);

  // Fetch inicial y refetch cuando cambia el ID
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn('[useCredentialData] Loading timeout reached');
        setIsLoading(false);
        setError(new Error('Tiempo de espera agotado. Reintente.'));
      }
    }, 3000);
    fetchCredentials();
    return () => clearTimeout(timer);
  }, [fetchCredentials]);

  // Verificar si las credenciales están listas (tiene contraseña)
  const isReady = credentials?.password_cuenta && credentials.password_cuenta.trim() !== '';

  return {
    credentials,
    isLoading,
    error,
    refetch: fetchCredentials,
    isReady,
  };
};
