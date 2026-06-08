import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Shield, Trash2, Copy, CheckCircle2 } from 'lucide-react';
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

    return () => {
      isMounted = false;
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
          const updatedProfile = payload.new as Profile;
          const shouldHide = updatedProfile.is_active === false && updatedProfile.is_verified === false && updatedProfile.verificado === false;
          if (shouldHide) {
            setProfiles(prev => prev.filter(p => p.id !== updatedProfile.id));
            return;
          }

          setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
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

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

  const handleCopyEmail = async (id: string, email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmailId(id);
      // small feedback
      setTimeout(() => setCopiedEmailId(null), 2000);
      toast.success('Email copiado al portapapeles');
    } catch (e) {
      toast.error('No se pudo copiar el email');
    }
  };

  const deleteUserFromWeb = async (profile: Profile) => {
    try {
      setDeletingUserId(profile.id);

      // Confirmación simple en UI
      const confirmed = typeof window !== 'undefined' ? window.confirm(`¿Eliminar usuario ${profile.display_name || profile.email || profile.id}?`) : true;
      if (!confirmed) {
        setDeletingUserId(null);
        return;
      }

      // Obtener el id del admin que solicita la eliminación.
      // Muchas instalaciones usan el id de auth.users como `user_id` en la tabla `profiles`.
      // Si `admin_user_deletions.requested_by` referencia `profiles.id`, debemos buscar el profile.id
      let requestedBy: string | null = null;
      try {
        // @ts-ignore
        const userRes = await supabase.auth?.getUser?.();
        const authUserId = userRes?.data?.user?.id ?? null;
        if (authUserId) {
          const { data: adminProfile, error: adminProfileErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', authUserId)
            .limit(1)
            .maybeSingle();

          if (!adminProfileErr && adminProfile && (adminProfile as any).id) {
            requestedBy = (adminProfile as any).id;
          } else {
            requestedBy = null;
          }
        }
      } catch (e) {
        requestedBy = null;
      }

      const { data, error } = await supabase
        .from('admin_user_deletions')
        .insert([
          {
            profile_id: profile.id,
            requested_by: requestedBy,
            reason: 'Eliminación desde dashboard',
            cascade_delete: false,
            status: 'pending',
          },
        ])
        .select('id')
        .single();

      if (error) {
        throw new Error(error.message || 'Error creando solicitud de eliminación');
      }

      toast.success('Solicitud de eliminación registrada. Un proceso la procesará próximamente.');
      // Opcional: ocultar al usuario de la lista mientras se procesa
      setProfiles(prev => prev.filter(p => p.id !== profile.id));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setDeletingUserId(null);
    }
  };

  const toggleActive = async (profile: Profile) => {
    try {
      const nextActive = profile.is_active !== false ? false : true;
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: nextActive })
        .eq('id', profile.id)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error('Error actualizando');
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? (data as Profile) : p)),
      );

      toast.success(nextActive ? 'Usuario activado' : 'Usuario desactivado (baneado)');
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
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{p.email || '—'}</span>
                        {p.email && (
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(p.id, p.email)}
                            className="ml-2 inline-flex items-center justify-center rounded-md p-1.5 bg-transparent hover:bg-white/5 transition"
                            title="Copiar correo"
                            aria-label={`Copiar correo ${p.email}`}
                          >
                            {copiedEmailId === p.id ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
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
                      <button
                        onClick={() => deleteUserFromWeb(p)}
                        disabled={deletingUserId === p.id}
                        className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-destructive border border-destructive/20 hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Eliminar usuario de la web"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar web
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
              {profiles.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No hay usuarios registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
