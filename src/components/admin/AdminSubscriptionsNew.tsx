import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Pencil, Save, X, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Subscription } from '@/types_v2';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExpiryBadge } from '@/components/ExpiryBadge';

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
  const [confirming, setConfirming] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const [subsRes, profilesRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id, user_id, service_name, status, proxima_fecha, created_at, email_cuenta, password_cuenta, perfil, pin')
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

  const statusColor = (status?: string) => {
    switch (status) {
      case 'active': 
      case 'confirmed': 
        return 'default' as const;
      case 'expired': 
        return 'destructive' as const;
      case 'pending_approval': 
      case 'procesando_credenciales': 
        return 'secondary' as const;
      default: 
        return 'outline' as const;
    }
  };

  const statusLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'confirmed': return 'Confirmado';
      case 'expired': return 'Vencido';
      case 'pending_approval': return 'Pendiente';
      case 'procesando_credenciales': return 'Pend. Credenciales';
      default: return status || 'Desconocido';
    }
  };

  const confirmRenewal = async (subscriptionId: string) => {
    setConfirming(subscriptionId);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', subscriptionId);

      if (error) throw error;
      toast.success('✅ Renovación confirmada - estado activo');
      fetchSubscriptions();
    } catch (error: any) {
      console.error('[AdminSubscriptionsNew] confirmRenewal error', error);
      toast.error(error?.message || 'Error al confirmar');
    } finally {
      setConfirming(null);
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

      <div className="w-full overflow-x-auto rounded-3xl border border-white/10 bg-black/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última</TableHead>
              <TableHead>Próxima</TableHead>
              <TableHead>Semáforo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions?.map((sub) => {
              const isEditing = editingId === sub.id;
              const values = editValues[sub.id] || {
                email_cuenta: sub.email_cuenta || '',
                password_cuenta: '',
                perfil: sub.perfil || '',
                pin: sub.pin || '',
                proxima_fecha: sub.proxima_fecha ? sub.proxima_fecha.slice(0, 10) : '',
              };
              return (
                <Fragment key={`${sub.id}-${sub.comboIndex ?? 0}`}>
                  <TableRow className="hover:bg-secondary/50 border-b border-border/50">
                    <TableCell className="font-medium">
                      {sub.profile?.display_name || sub.profile?.email || sub.user_id?.slice(0,8) || 'Desconocido'}
                      {sub.comboParent ? <Badge variant="secondary" className="ml-2 text-xs">Combo</Badge> : null}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      VORTEX-{sub.id?.slice(0, 8)?.toUpperCase()}
                    </TableCell>
                    <TableCell className="font-bold text-white">{sub.service_name}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(sub.status)} className="text-xs uppercase tracking-wider">
                        {statusLabel(sub.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.proxima_fecha ? new Date(sub.proxima_fecha).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <ExpiryBadge nextRenewal={sub.proxima_fecha || sub.created_at || ''} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button
                          onClick={() => (isEditing ? cancelEdit() : startEdit(sub))}
                          className="p-1 text-primary hover:bg-primary/10 rounded transition"
                          title={isEditing ? 'Cancelar' : 'Editar'}
                        >
                          {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </button>
                        {(sub.status === 'pending_approval' || sub.status === 'procesando_credenciales') && (
                          <button
                            onClick={() => confirmRenewal(sub.id)}
                            disabled={confirming === sub.id}
                            className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded transition disabled:opacity-50"
                            title="Confirmar / Activar"
                          >
                            {confirming === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => removeSubscription(sub.id)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded transition"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isEditing && (
                    <TableRow className="bg-secondary/30">
                      <TableCell colSpan={7} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Correo</label>
                            <input
                              type="email"
                              value={values.email_cuenta}
                              onChange={(e) => setEditValues((current) => ({
                                ...current,
                                [sub.id]: { ...values, email_cuenta: e.target.value },
                              }))}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Contraseña</label>
                            <input
                              type="password"
                              value={values.password_cuenta}
                              onChange={(e) => setEditValues((current) => ({
                                ...current,
                                [sub.id]: { ...values, password_cuenta: e.target.value },
                              }))}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Perfil</label>
                            <input
                              type="text"
                              value={values.perfil}
                              onChange={(e) => setEditValues((current) => ({
                                ...current,
                                [sub.id]: { ...values, perfil: e.target.value },
                              }))}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">PIN</label>
                            <input
                              type="text"
                              value={values.pin}
                              onChange={(e) => setEditValues((current) => ({
                                ...current,
                                [sub.id]: { ...values, pin: e.target.value },
                              }))}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Próxima fecha</label>
                            <input
                              type="date"
                              value={values.proxima_fecha}
                              onChange={(e) => setEditValues((current) => ({
                                ...current,
                                [sub.id]: { ...values, proxima_fecha: e.target.value },
                              }))}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => saveSubscription(sub)}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80"
                          >
                            Cancelar
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            }) || null
            }
          </TableBody>
        </Table>
        {filteredSubscriptions?.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No se encontraron suscripciones para ese filtro.
          </div>
        )}
      </div>
    </div>
  );
}
