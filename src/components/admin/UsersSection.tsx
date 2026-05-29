import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Profile = Tables<'profiles'>;

interface OrderInfo {
  user_id: string;
  expiry_date: string | null;
  status: string;
}

function getServiceStatus(orders: OrderInfo[], userId: string): { label: string; className: string } {
  const userOrders = orders.filter(o => o.user_id === userId && o.status === 'completed' && o.expiry_date);
  if (userOrders.length === 0) return { label: 'Sin servicio', className: 'bg-muted text-muted-foreground' };
  
  const latestExpiry = userOrders
    .map(o => new Date(o.expiry_date!).getTime())
    .sort((a, b) => b - a)[0];
  
  const now = Date.now();
  const diff = latestExpiry - now;
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  if (diff < 0) return { label: 'Vencido', className: 'bg-red-500/20 text-red-400' };
  if (diff <= threeDays) return { label: 'Por vencer', className: 'bg-amber-500/20 text-amber-400' };
  return { label: 'Activo', className: 'bg-emerald-500/20 text-emerald-400' };
}

export function UsersSection() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const scrollKey = 'usersSectionScrollY';

  const fetchData = async () => {
    try {
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('user_id, expiry_date, status'),
      ]);

      if (profilesRes.error) {
        throw new Error('Error cargando usuarios');
      }

      if (ordersRes.error) {
        throw new Error('Error cargando órdenes');
      }

      setProfiles((profilesRes.data as Profile[]) ?? []);
      setOrders((ordersRes.data as OrderInfo[]) ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    void fetchData();

    // Restore scroll position if admin reloaded page
    try {
      const stored = sessionStorage.getItem(scrollKey);
      if (stored && isMounted) {
        const y = parseInt(stored, 10);
        setTimeout(() => window.scrollTo(0, y), 0);
      }
    } catch (e) {
      console.warn('[UsersSection] scroll restore failed', e);
    }

    const handleBeforeUnload = () => {
      try { sessionStorage.setItem(scrollKey, String(window.scrollY)); } catch (e) { console.warn('[UsersSection] save scroll failed', e); }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current = [];
      try { sessionStorage.setItem(scrollKey, String(window.scrollY)); } catch (e) { console.warn('[UsersSection] save scroll failed', e); }
    };
  }, []);

  useEffect(() => {
    if (profiles.length === 0) return;

    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setProfiles(prev => prev.map(p => p.id === (payload.new as Profile).id ? (payload.new as Profile) : p));
        } else if (payload.eventType === 'INSERT') {
          setProfiles(prev => [(payload.new as Profile), ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setProfiles(prev => prev.filter(p => p.id !== (payload.old as Profile).id));
        }
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => prev.map(o => o.user_id === (payload.new as OrderInfo).user_id ? (payload.new as OrderInfo) : o));
      })
      .subscribe();

    channelsRef.current = [profilesChannel, ordersChannel];
    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [profiles.length]);

  const toggleVerified = async (profile: Profile) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_verified: !profile.is_verified }).eq('id', profile.id);
      if (error) {
        throw new Error('Error actualizando');
      }
      toast.success(profile.is_verified ? 'Verificación removida' : 'Usuario verificado');
      await fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const toggleActive = async (profile: Profile) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id);
      if (error) {
        throw new Error('Error actualizando');
      }
      toast.success(profile.is_active ? 'Usuario desactivado (baneado)' : 'Usuario activado');
      await fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Cargando usuarios...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-xl">User Control Center</h2>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Usuario</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Registro</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Servicio</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Estado</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">WhatsApp</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Verificado</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, i) => {
                const svcStatus = getServiceStatus(orders, p.user_id);
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{p.display_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${svcStatus.className}`}>
                        {svcStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive'
                        }`}
                      >
                        {p.is_active ? 'Activo' : 'Baneado'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.phone ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleVerified(p)} aria-label={p.is_verified ? 'Quitar verificación' : 'Verificar usuario'}>
                        {p.is_verified ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-muted-foreground mx-auto hover:text-primary transition-colors" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                  </motion.tr>
                );
              })}
              {profiles.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No hay usuarios registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
