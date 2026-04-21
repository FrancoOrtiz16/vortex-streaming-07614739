import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminSubscriptions = (searchTerm: string = '', filterStatus: string = '') => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = async () => {
    setLoading(true);
    try {
      // Consulta segura Anti-PGRST204
      let query = supabase
        .from('subscriptions')
        .select(`
          id, 
          user_id, 
          service_name, 
          email_cuenta, 
          password_cuenta, 
          perfil, 
          pin, 
          status, 
          proxima_fecha,
          profiles:user_id (email, full_name)
        `);

      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Filtro de búsqueda por cliente o servicio
      const term = searchTerm.toLowerCase();
      const filtered = data?.filter(sub => {
        const profile = sub.profiles as any;
        return (
          sub.service_name?.toLowerCase().includes(term) ||
          profile?.email?.toLowerCase().includes(term) ||
          profile?.full_name?.toLowerCase().includes(term)
        );
      }) ?? [];

      setSubscriptions(filtered);
    } catch (err) {
      console.error('[AdminSubs] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubs(); }, [searchTerm, filterStatus]);

  return { subscriptions, loading, refetch: fetchSubs };
};