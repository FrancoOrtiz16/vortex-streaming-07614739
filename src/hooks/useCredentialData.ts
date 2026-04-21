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
 * 
 * REGLA DE ORO: .select() NO incluye campos problemáticos:
 * - No: combo_id, subscription_code, fecha_inicio (evita PGRST204)
 * - Sí: id, service_name, email_cuenta, password_cuenta, perfil, pin
 * 
 * @param subscriptionId - ID de la suscripción
 * @returns Objeto con credenciales, loading, error y métodos de control
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

      // Consulta SEGURA: incluye status y user_id para control administrativo
      const { data, error: supabaseError } = await supabase
        .from('subscriptions')
        .select('id, user_id, service_name, email_cuenta, password_cuenta, perfil, pin, status, proxima_fecha')
        .eq('id', subscriptionId)
        .maybeSingle();

      // Timeout de seguridad: Si no hay respuesta en 5s, liberar el loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tiempo de espera agotado (5s)')), 5000)
      );

      // Podríamos usar Promise.race aquí, pero por ahora manejamos el timeout 
      // de forma declarativa en el useEffect para mayor claridad visual.

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

      // Validar que tenga los campos básicos
      const validCredential: CredentialData = {
        id: data?.id || subscriptionId || '',
        service_name: data?.service_name || '',
        email_cuenta: data?.email_cuenta ?? null,
        password_cuenta: data?.password_cuenta ?? null,
        perfil: data?.perfil ?? null,
        pin: data?.pin ?? null,
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
        setError(new Error('La conexión es lenta. Por favor, intenta de nuevo.'));
      }
    }, 3000);
    fetchCredentials();
    return () => clearTimeout(timer);
  }, [fetchCredentials]);

  // Verificar si las credenciales están listas (no todas null)
  const isReady = credentials ? 
    (credentials.email_cuenta !== null || 
     credentials.password_cuenta !== null || 
     credentials.perfil !== null || 
     credentials.pin !== null) 
    : false;

  return {
    credentials,
    isLoading,
    error,
    refetch: fetchCredentials,
    isReady,
  };
};
