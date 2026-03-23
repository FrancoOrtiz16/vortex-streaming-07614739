import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Shield, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export function UsersSection() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Error cargando usuarios');
      return;
    }
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const toggleVerified = async (profile: Profile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !profile.is_verified })
      .eq('id', profile.id);
    if (error) { toast.error('Error actualizando'); return; }
    toast.success(profile.is_verified ? 'Verificación removida' : 'Usuario verificado');
    fetchProfiles();
  };

  const toggleActive = async (profile: Profile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !profile.is_active })
      .eq('id', profile.id);
    if (error) { toast.error('Error actualizando'); return; }
    toast.success(profile.is_active ? 'Usuario desactivado' : 'Usuario activado');
    fetchProfiles();
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
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.is_active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-destructive/20 text-destructive'
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
                      onClick={() => toast.info('Funcionalidad de reset requiere edge function con supabase.auth.admin')}
                      className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-colors mx-auto"
                      title="Editar credenciales"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
