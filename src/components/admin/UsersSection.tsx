import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Shield, KeyRound, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export function UsersSection() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Error cargando usuarios'); return; }
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const toggleVerified = async (profile: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_verified: !profile.is_verified }).eq('id', profile.id);
    if (error) { toast.error('Error actualizando'); return; }
    toast.success(profile.is_verified ? 'Verificación removida' : 'Usuario verificado');
    fetchProfiles();
  };

  const toggleActive = async (profile: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id);
    if (error) { toast.error('Error actualizando'); return; }
    toast.success(profile.is_active ? 'Usuario desactivado' : 'Usuario activado');
    fetchProfiles();
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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Cargando usuarios...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-xl">User Control Center</h2>
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
        >
          <div className="glass rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-sm">Resetear Contraseña</h3>
              <button onClick={() => { setResetTarget(null); setNewPassword(''); }} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Usuario: <strong>{resetTarget.display_name || resetTarget.email}</strong>
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña (min 6 chars)"
              className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon transition-colors mb-4"
            />
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className="w-full py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              {resetting ? 'Actualizando...' : 'Confirmar Reset'}
            </button>
          </div>
        </motion.div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Usuario</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Registro</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Estado</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Verificado</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, i) => (
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
                    <button
                      onClick={() => toggleActive(p)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleVerified(p)}>
                      {p.is_verified ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground mx-auto hover:text-primary transition-colors" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setResetTarget(p)}
                      className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-colors mx-auto"
                      title="Resetear contraseña"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {profiles.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay usuarios registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
