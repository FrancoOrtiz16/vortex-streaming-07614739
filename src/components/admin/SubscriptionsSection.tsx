import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, X, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExpiryBadge } from '@/components/ExpiryBadge';

interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  status: string;
  last_renewal: string;
  next_renewal: string;
  created_at: string;
  updated_at: string;
  credential_email?: string | null;
  credential_password?: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
}

export function SubscriptionsSection() {
  const [subs, setSubs] = useState<(Subscription & { profile?: Profile })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ user_id: '', service_name: '', days: 30 });

  const fetchData = async () => {
    const [subsRes, profilesRes] = await Promise.all([
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, user_id, display_name, email'),
    ]);
    const profilesList = profilesRes.data || [];
    setProfiles(profilesList);
    const subsWithProfiles = (subsRes.data || []).map((s: any) => ({
      ...s,
      profile: profilesList.find((p: Profile) => p.user_id === s.user_id),
    }));
    setSubs(subsWithProfiles);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const markAsRenewed = async (sub: Subscription) => {
    const now = new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + 30);

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        last_renewal: now.toISOString(),
        next_renewal: next.toISOString(),
      })
      .eq('id', sub.id);

    if (error) { toast.error('Error actualizando'); return; }
    toast.success('Suscripción renovada +30 días');
    fetchData();
  };

  const addManualRecord = async () => {
    if (!form.user_id || !form.service_name) {
      toast.error('Completa todos los campos');
      return;
    }
    const now = new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + form.days);

    const { error } = await supabase.from('subscriptions').insert({
      user_id: form.user_id,
      service_name: form.service_name,
      status: 'active',
      last_renewal: now.toISOString(),
      next_renewal: next.toISOString(),
    });

    if (error) { toast.error('Error al crear registro'); return; }
    toast.success('Registro añadido al historial');
    setShowAdd(false);
    setForm({ user_id: '', service_name: '', days: 30 });
    fetchData();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400';
      case 'expired': return 'bg-destructive/20 text-destructive';
      case 'pending': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'expired': return 'Vencido';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Cargando suscripciones...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Gestión de Suscripciones</h2>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir Registro
        </button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Nuevo Registro Manual</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Usuario</label>
              <select
                value={form.user_id}
                onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon"
              >
                <option value="">Seleccionar...</option>
                {profiles.map(p => (
                  <option key={p.user_id} value={p.user_id}>{p.display_name || p.email || p.user_id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Servicio</label>
              <input
                value={form.service_name}
                onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))}
                placeholder="Ej: Netflix Premium"
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Días</label>
              <input
                type="number"
                value={form.days}
                onChange={e => setForm(f => ({ ...f, days: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-neon focus:outline-none focus:ring-1 focus:ring-neon"
              />
            </div>
          </div>
          <button onClick={addManualRecord} className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold">
            Guardar
          </button>
        </motion.div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Usuario</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Servicio</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Última Renovación</th>
                 <th className="text-left px-4 py-3 text-muted-foreground font-medium">Próxima Renovación</th>
                 <th className="text-center px-4 py-3 text-muted-foreground font-medium">Semáforo</th>
                 <th className="text-center px-4 py-3 text-muted-foreground font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{s.profile?.display_name || s.profile?.email || s.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{s.service_name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(s.status)}`}>
                      {statusLabel(s.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.last_renewal).toLocaleDateString()}</td>
                   <td className="px-4 py-3 text-muted-foreground">{new Date(s.next_renewal).toLocaleDateString()}</td>
                   <td className="px-4 py-3 text-center">
                     <ExpiryBadge nextRenewal={s.next_renewal} />
                   </td>
                   <td className="px-4 py-3 text-center">
                     <button
                       onClick={() => markAsRenewed(s)}
                       className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                       title="Marcar como Renovado (+30 días)"
                     >
                       <RefreshCw className="w-3 h-3" />
                       Renovar
                     </button>
                   </td>
                </motion.tr>
              ))}
              {subs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay suscripciones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
