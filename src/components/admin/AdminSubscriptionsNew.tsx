import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Pencil, Save, X, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Subscription } from '@/types_v2';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
}

interface EditableValues {
  email_cuenta: string;
  password_cuenta: string;
  perfil: string;
  pin: string;
  proxima_fecha: string;
}

interface DisplaySubscription extends Subscription {
  profile?: Profile;
  comboParent?: string;
  comboIndex?: number;
}

const parseComboServices = (subscription: Subscription): DisplaySubscription[] => {
  const combos = subscription.service_name.split('+').map((chunk) => chunk.trim()).filter(Boolean);

  if (combos.length > 1) {
    return combos.map((service, index) => ({
      ...subscription,
      comboParent: subscription.service_name,
      comboIndex: index,
      service_name: service,
    }));
  }

  return [{ ...subscription }];
};

export default function AdminSubscriptionsNew() {
  const [subscriptions, setSubscriptions] = useState<DisplaySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, EditableValues>>({});
  const [saving, setSaving] = useState(false);
  const isMountedRef = useRef(true);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const [subsRes, profilesRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id, user_id, service_name, status, proxima_fecha, created_at, updated_at, email_cuenta, password_cuenta, perfil, pin')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, user_id, display_name, email'),
      ]);

      if (subsRes.error) {
        console.error('[AdminSubscriptionsNew] subscriptions fetch failed', subsRes.error);
        toast.error('Error cargando suscripciones');
        return;
      }

      if (profilesRes.error) {
        console.error('[AdminSubscriptionsNew] profiles fetch failed', profilesRes.error);
      }

      const profileList: Profile[] = profilesRes.data || [];
      const parsed: DisplaySubscription[] = (subsRes.data || []).flatMap((subscription) => {
        const parsedRows = parseComboServices(subscription);
        return parsedRows.map((row) => ({
          ...row,
          profile: profileList.find((profile) => profile.user_id === row.user_id),
        }));
      });

      if (isMountedRef.current) {
        setSubscriptions(parsed);
      }
    } catch (error) {
      console.error('[AdminSubscriptionsNew] fetchSubscriptions error', error);
      toast.error('Hubo un problema al cargar las suscripciones');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchSubscriptions();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const filteredSubscriptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return subscriptions;

    return subscriptions.filter((sub) => {
      const clientName = (sub.profile?.display_name || sub.profile?.email || sub.user_id || '').toLowerCase();
      const serviceName = (sub.service_name || '').toLowerCase();
      return clientName.includes(query) || serviceName.includes(query);
    });
  }, [searchQuery, subscriptions]);

  const startEdit = (sub: DisplaySubscription) => {
    setEditingId(sub.id);
    setEditValues((current) => ({
      ...current,
      [sub.id]: {
        email_cuenta: sub.email_cuenta || '',
        password_cuenta: '',
        perfil: sub.perfil || '',
        pin: sub.pin || '',
        proxima_fecha: sub.proxima_fecha ? sub.proxima_fecha.slice(0, 10) : '',
      },
    }));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveSubscription = async (subscription: DisplaySubscription) => {
    const values = editValues[subscription.id];
    if (!values) return;

    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        email_cuenta: values.email_cuenta || null,
        perfil: values.perfil || null,
        pin: values.pin || null,
      };

      if (values.password_cuenta) {
        payload.password_cuenta = values.password_cuenta;
      }

      if (values.proxima_fecha) {
        payload.proxima_fecha = new Date(values.proxima_fecha).toISOString();
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', subscription.id);

      if (error) {
        throw error;
      }

      toast.success('Credenciales actualizadas correctamente');
      setEditingId(null);
      fetchSubscriptions();
    } catch (error: any) {
      console.error('[AdminSubscriptionsNew] saveSubscription error', error);
      toast.error(error?.message || 'No se pudieron guardar las credenciales');
    } finally {
      setSaving(false);
    }
  };

  const removeSubscription = async (subscriptionId: string) => {
    const confirmed = window.confirm('Eliminar esta suscripción puede afectar al cliente. ¿Deseas continuar?');
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('subscriptions').delete().eq('id', subscriptionId);
      if (error) throw error;
      toast.success('Suscripción eliminada');
      fetchSubscriptions();
    } catch (error: any) {
      console.error('[AdminSubscriptionsNew] removeSubscription error', error);
      toast.error(error?.message || 'No se pudo eliminar la suscripción');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Admin</p>
          <h1 className="font-display text-2xl font-bold text-white">Gestión avanzada de suscripciones</h1>
          <p className="max-w-2xl text-sm text-slate-400 mt-2">Busca por cliente o servicio, edita credenciales y desglosa combos para cada plataforma.</p>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente o servicio..."
            className="w-full rounded-3xl border border-border bg-secondary/70 py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredSubscriptions.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-sm text-slate-400">
            No se encontraron suscripciones para ese filtro.
          </div>
        ) : (
          filteredSubscriptions.map((sub) => {
            const isEditing = editingId === sub.id;
            const values = editValues[sub.id] || {
              email_cuenta: sub.email_cuenta || '',
              password_cuenta: '',
              perfil: sub.perfil || '',
              pin: sub.pin || '',
              proxima_fecha: sub.proxima_fecha ? sub.proxima_fecha.slice(0, 10) : '',
            };
            return (
              <motion.div
                key={`${sub.id}-${sub.comboIndex ?? 0}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-3xl border border-white/10 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      <span>{sub.profile?.display_name || sub.profile?.email || 'Cliente desconocido'}</span>
                      {sub.comboParent ? <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Combo</span> : null}
                    </div>
                    <h2 className="font-semibold text-white">{sub.service_name}</h2>
                    <p className="text-sm text-slate-400">
                      Próxima fecha: {sub.proxima_fecha ? new Date(sub.proxima_fecha).toLocaleDateString() : 'Sin definir'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => (isEditing ? cancelEdit() : startEdit(sub))}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-secondary/70 px-4 py-2 text-sm font-semibold text-white transition hover:border-primary"
                    >
                      {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                      {isEditing ? 'Cancelar' : 'Editar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSubscription(sub.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-destructive/20 px-4 py-2 text-sm font-semibold text-destructive transition hover:border-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr]">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Estado</p>
                    <p className="mt-2 text-sm text-white">{sub.status}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Id</p>
                    <p className="mt-2 text-sm text-white">VORTEX-{sub.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-black/60 p-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <label className="space-y-2 text-sm text-slate-300">
                        <span>Correo</span>
                        <input
                          type="email"
                          value={values.email_cuenta}
                          onChange={(event) => setEditValues((current) => ({
                            ...current,
                            [sub.id]: { ...values, email_cuenta: event.target.value },
                          }))}
                          className="w-full rounded-2xl border border-border bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-300">
                        <span>Contraseña</span>
                        <input
                          type="password"
                          value={values.password_cuenta}
                          onChange={(event) => setEditValues((current) => ({
                            ...current,
                            [sub.id]: { ...values, password_cuenta: event.target.value },
                          }))}
                          className="w-full rounded-2xl border border-border bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-300">
                        <span>Perfil</span>
                        <input
                          type="text"
                          value={values.perfil}
                          onChange={(event) => setEditValues((current) => ({
                            ...current,
                            [sub.id]: { ...values, perfil: event.target.value },
                          }))}
                          className="w-full rounded-2xl border border-border bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-300">
                        <span>PIN</span>
                        <input
                          type="text"
                          value={values.pin}
                          onChange={(event) => setEditValues((current) => ({
                            ...current,
                            [sub.id]: { ...values, pin: event.target.value },
                          }))}
                          className="w-full rounded-2xl border border-border bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-slate-300 lg:col-span-2">
                        <span>Próxima fecha</span>
                        <input
                          type="date"
                          value={values.proxima_fecha}
                          onChange={(event) => setEditValues((current) => ({
                            ...current,
                            [sub.id]: { ...values, proxima_fecha: event.target.value },
                          }))}
                          className="w-full rounded-2xl border border-border bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                        />
                      </label>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3 items-center justify-end">
                      <button
                        type="button"
                        onClick={() => saveSubscription(sub)}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-3xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
