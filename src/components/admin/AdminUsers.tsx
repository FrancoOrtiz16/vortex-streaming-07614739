import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Shield, KeyRound, X, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminSectionErrorBoundary } from './AdminSectionErrorBoundary';
import type { Tables } from '@/integrations/supabase/types';

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

function AdminUsersContent() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('user_id, expiry_date, status'),
      ]);
      
      if (profilesRes.error) throw profilesRes.error;
      setProfiles((profilesRes.data as any) || []);
      setOrders((ordersRes.data as OrderInfo[]) || []);
    } catch (err) {
      console.error('[AdminUsers] Fetch error:', err);
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleVerified = async (profile: Profile) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_verified: !profile.is_verified }).eq('id', profile.id);
      if (error) throw error;
      toast.success(profile.is_verified ? 'Verificación removida' : 'Usuario verificado');
      await fetchData();
    } catch (err) {
      console.error('[AdminUsers] Toggle verified error:', err);
      toast.error('Error actualizando');
    }
  };

  const toggleActive = async (profile: Profile) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id);
      if (error) throw error;
      toast.success(profile.is_active ? 'Usuario desactivado (baneado)' : 'Usuario activado');
      await fetchData();
    } catch (err) {
      console.error('[AdminUsers] Toggle active error:', err);
      toast.error('Error actualizando');
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPassword || newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ target_user_id: resetTarget.user_id, new_password: newPassword }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error');
      toast.success(`Contraseña de ${resetTarget.display_name || resetTarget.email} actualizada`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err: unknown) {
      console.error('[AdminUsers] Password reset error:', err);
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Cargando usuarios...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Usuarios ({profiles.length})</h2>
        </div>
        <button
          onClick={() => fetchData()}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {resetTarget && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass rounded-xl p-4 border border-primary/20"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Resetear contraseña</h3>
            <button onClick={() => setResetTarget(null)} className="p-1 rounded hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="password"
            placeholder="Nueva contraseña (mínimo 6 caracteres)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none mb-3"
          />
          <button
            onClick={handleResetPassword}
            disabled={resetting}
            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {resetting ? 'Reseteando...' : 'Confirmar'}
          </button>
        </motion.div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground">Usuario</th>
              <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground">Email</th>
              <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground">Estado</th>
              <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {profiles.map((profile) => {
              const status = getServiceStatus(orders, profile.id);
              return (
                <tr key={profile.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-white">{profile.display_name || 'Sin nombre'}</div>
                      <div className="text-xs text-muted-foreground">{profile.id.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{profile.email}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleVerified(profile)}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        title={profile.is_verified ? 'Desverificar' : 'Verificar'}
                      >
                        {profile.is_verified ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleActive(profile)}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        title={profile.is_active ? 'Banear' : 'Desbanear'}
                      >
                        {profile.is_active ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </button>
                      <button
                        onClick={() => setResetTarget(profile)}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        title="Resetear contraseña"
                      >
                        <KeyRound className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminUsers() {
  return (
    <AdminSectionErrorBoundary sectionName="Usuarios">
      <AdminUsersContent />
    </AdminSectionErrorBoundary>
  );
}
