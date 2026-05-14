import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminSubscriptions = (searchTerm: string = '', filterStatus: string = '') => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = async () => {
    setLoading(true);
    try {
      // Esquema real: campos correctos de subscriptions y profiles
      let query = supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          service_name,
          credential_email,
          credential_password,
          profile_name,
          profile_pin,
          status,
          duration_days,
          last_renewal,
          next_renewal,
          created_at
        `);

      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Filtro de búsqueda por cliente o servicio
      // Lookup de perfiles aparte para evitar joins no soportados
      const userIds = Array.from(new Set((data || []).map((s: any) => s.user_id).filter(Boolean)));
      let profilesMap: Record<string, { email: string | null; display_name: string | null }> = {};
      if (userIds.length) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('user_id, email, display_name')
          .in('user_id', userIds as string[]);
        (pData || []).forEach((p: any) => {
          profilesMap[p.user_id] = { email: p.email, display_name: p.display_name };
        });
      }

      const term = searchTerm.toLowerCase();
      const filtered = (data as any[] | null | undefined)?.filter((sub: any) => {
        const profile = profilesMap[sub.user_id];
        return (
          sub.service_name?.toLowerCase().includes(term) ||
          profile?.email?.toLowerCase().includes(term) ||
          profile?.display_name?.toLowerCase().includes(term)
        );
      }).map((sub: any) => ({ ...sub, profiles: profilesMap[sub.user_id] || null })) ?? [];

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