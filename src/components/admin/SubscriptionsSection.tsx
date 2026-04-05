import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, X, CalendarClock, Pencil, Save, Loader2 } from 'lucide-react';
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
  profile_name?: string | null;
  profile_pin?: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
}

interface CredentialForm {
  email: string;
  password: string;
  profile_name: string;
  profile_pin: string;
}

export function SubscriptionsSection() {
  const [subs, setSubs] = useState<(Subscription & { profile?: Profile })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ user_id: '', service_name: '', days: 30 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [credForm, setCredForm] = useState<CredentialForm>({ email: '', password: '', profile_name: '', profile_pin: '' });
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

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

  const startEdit = async (sub: Subscription) => {
    setEditingId(sub.id);
    // Fetch decrypted credentials via RPC
    const { data } = await supabase.rpc('get_subscription_credentials', { _subscription_id: sub.id });
    const cred = data?.[0];
    setCredForm({
      email: cred?.credential_email || '',
      password: '',
      profile_name: sub.profile_name || '',
      profile_pin: sub.profile_pin || '',
    });
  };

  const saveCredentials = async (subId: string) => {
    setSaving(true);
    try {
      // Save encrypted credentials via RPC
      if (credForm.email || credForm.password) {
        const { error: rpcErr } = await supabase.rpc('set_subscription_credentials', {
          _subscription_id: subId,
          _credential_email: credForm.email,
          _credential_password: credForm.password,
        });
        if (rpcErr) throw rpcErr;
      }
      // Save profile name/pin directly
      const { error } = await supabase
        .from('subscriptions')
        .update({
          profile_name: credForm.profile_name || null,
          profile_pin: credForm.profile_pin || null,
        })
        .eq('id', subId);
      if (error) throw error;

      toast.success('Credenciales guardadas');
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error guardando credenciales');
    } finally {
      setSaving(false);
    }
  };

  const confirmRenewal = async (sub: Subscription) => {
    setConfirming(sub.id);
    const now = new Date();
    // Add 30 days from current next_renewal (or from now if expired)
    const base = new Date(sub.next_renewal) > now ? new Date(sub.next_renewal) : now;
    const next = new Date(base);
    next.setDate(next.getDate() + 30);

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        last_renewal: now.toISOString(),
        next_renewal: next.toISOString(),
      })
      .eq('id', sub.id);

    if (error) {
      toast.error('Error al confirmar renovación');
    } else {
      toast.success(`Renovación confirmada — vence ${next.toLocaleDateString()}`);
    }
    setConfirming(null);
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

    if (error) {
      if (error.code === '23505') {
        toast.error('Ya existe una suscripción para este usuario y servicio');
      } else {
        toast.error('Error al crear registro');
      }
      return;
    }
    toast.success('Registro añadido');
    setShowAdd(false);
    setForm({ user_id: '', service_name: '', days: 30 });
    fetchData();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400';
      case 'expired': return 'bg-destructive/20 text-destructive';
      case 'pending_approval': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'expired': return 'Vencido';
      case 'pending_approval': return 'Pendiente';
      default: return status;
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  // Group subs by user
  const groupedByUser = subs.reduce<Record<string, typeof subs>>((acc, s) => {
    const key = s.profile?.display_name || s.profile?.email || s.user_id.slice(0, 8);
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

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
          Añadir
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
              <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border">
                <option value="">Seleccionar...</option>
                {profiles.map(p => <option key={p.user_id} value={p.user_id}>{p.display_name || p.email || p.user_id}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Servicio</label>
              <input value={form.service_name} onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))} placeholder="Ej: Netflix Premium" className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Días</label>
              <input type="number" value={form.days} onChange={e => setForm(f => ({ ...f, days: parseInt(e.target.value) || 30 }))} className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border" />
            </div>
          </div>
          <button onClick={addManualRecord} className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold">Guardar</button>
        </motion.div>
      )}

      {/* Grouped by user */}
      <div className="space-y-6">
        {Object.entries(groupedByUser).map(([userName, userSubs]) => (
          <div key={userName} className="glass rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <h3 className="font-display font-semibold text-sm">{userName}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium text-xs">Servicio</th>
                    <th className="text-center px-4 py-2 text-muted-foreground font-medium text-xs">Estado</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium text-xs">Última</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium text-xs">Próxima</th>
                    <th className="text-center px-4 py-2 text-muted-foreground font-medium text-xs">Semáforo</th>
                    <th className="text-center px-4 py-2 text-muted-foreground font-medium text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userSubs.map((s) => (
                    <>
                      <tr key={s.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">{s.service_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(s.status)}`}>
                            {statusLabel(s.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.last_renewal).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.next_renewal).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center"><ExpiryBadge nextRenewal={s.next_renewal} /></td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => editingId === s.id ? setEditingId(null) : startEdit(s)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Editar credenciales"
                            >
                              <Pencil className="w-3 h-3" />
                              Editar
                            </button>
                            {s.status === 'pending_approval' && (
                              <button
                                onClick={() => confirmRenewal(s)}
                                disabled={confirming === s.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                title="Confirmar renovación (+30 días)"
                              >
                                {confirming === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Confirmar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Credential edit row */}
                      <AnimatePresence>
                        {editingId === s.id && (
                          <motion.tr
                            key={`edit-${s.id}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <td colSpan={6} className="px-4 py-4 bg-secondary/20">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                <div>
                                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Correo Servicio</label>
                                  <input value={credForm.email} onChange={e => setCredForm(f => ({ ...f, email: e.target.value }))} placeholder="email@servicio.com" className="w-full px-3 py-2 rounded-lg bg-background text-sm border border-border" />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Contraseña</label>
                                  <input type="password" value={credForm.password} onChange={e => setCredForm(f => ({ ...f, password: e.target.value }))} placeholder="Nueva contraseña" className="w-full px-3 py-2 rounded-lg bg-background text-sm border border-border" />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Perfil</label>
                                  <input value={credForm.profile_name} onChange={e => setCredForm(f => ({ ...f, profile_name: e.target.value }))} placeholder="Nombre perfil" className="w-full px-3 py-2 rounded-lg bg-background text-sm border border-border" />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">PIN</label>
                                  <input value={credForm.profile_pin} onChange={e => setCredForm(f => ({ ...f, profile_pin: e.target.value }))} placeholder="1234" className="w-full px-3 py-2 rounded-lg bg-background text-sm border border-border" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => saveCredentials(s.id)} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  Guardar
                                </button>
                                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary">Cancelar</button>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {subs.length === 0 && (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">No hay suscripciones registradas</div>
        )}
      </div>
    </div>
  );
}
