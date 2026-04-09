import { useState, useEffect, Fragment, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, X, CalendarClock, Pencil, Save, Loader2, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  getAllSubscriptionsAdmin,
  deleteSimpleSubscription,
  updateSimpleSubscription,
  updateSimpleSubscriptionStatus,
  getSubscriptionCredentials,
} from '@/integrations/supabase/subscriptions-helpers';
import { toast } from 'sonner';
import { ExpiryBadge } from '@/components/ExpiryBadge';

interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  status: string;
  proxima_fecha?: string;
  created_at: string;
  updated_at: string;
  email_cuenta?: string | null;
  password_cuenta?: string | null;
  perfil?: string | null;
  pin?: string | null;
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
  perfil: string;
  pin: string;
}

export function SubscriptionsSection() {
  const [subs, setSubs] = useState<(Subscription & { profile?: Profile })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ order_id: '', days: 30 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [credForm, setCredForm] = useState<CredentialForm>({ email: '', password: '', perfil: '', pin: '' });
  const [dateForm, setDateForm] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const isMountedRef = useRef(true);

  const fetchData = async () => {
    try {
      console.debug('[Admin] Fetching all subscriptions and pending orders');
      const [{ data: subsData, error: subsError }, profilesRes, ordersRes] = await Promise.all([
        getAllSubscriptionsAdmin(),
        supabase.from('profiles').select('id, user_id, display_name, email'),
        supabase.from('orders').select('id, user_id, customer_email, product_name, total, status, created_at, updated_at, expiry_date').eq('status', 'procesando_credenciales'),
      ]);

      if (subsError) {
        console.error('[Admin] Subscriptions fetch error:', subsError);
        toast.error('Error cargando suscripciones');
        if (isMountedRef.current) {
          setSubs([]);
          setLoading(false);
        }
        return;
      }

      if (profilesRes.error) {
        console.error('[Admin] Profiles fetch error:', profilesRes.error);
        if (isMountedRef.current) {
          setProfiles([]);
        }
      }

      if (ordersRes.error) {
        console.error('[Admin] Orders fetch error:', ordersRes.error);
        if (isMountedRef.current) {
          setPendingOrders([]);
        }
      }

      const profilesList = profilesRes.data || [];
      const pendingOrdersList = ordersRes.data || [];
      if (isMountedRef.current) {
        setProfiles(profilesList);
        setPendingOrders(pendingOrdersList);
      }

      const subsWithProfiles = (subsData || []).map((s: any) => ({
        ...s,
        profile: profilesList.find((p: Profile) => p.user_id === s.user_id),
      }));

      if (isMountedRef.current) {
        setSubs(subsWithProfiles);
        setLoading(false);
      }
      console.debug('[Admin] Subscriptions loaded:', subsWithProfiles.length);
      console.debug('[Admin] Pending orders loaded:', pendingOrdersList.length);
    } catch (err) {
      console.error('[Admin] fetchData error:', err);
      if (isMountedRef.current) {
        toast.error('Error cargando datos');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startEdit = async (sub: Subscription) => {
    setEditingId(sub.id);
    try {
      // Fetch decrypted credentials via safe wrapper
      const { data: credData, error: credError } = await getSubscriptionCredentials(sub.id);

      if (credError) {
        console.error('[Admin] Credentials fetch error:', credError);
        toast.error('Error cargando credenciales');
        setCredForm({
          email: '',
          password: '',
        });
        return;
      }

      const cred = credData?.[0];
      setCredForm({
        email: cred?.email_cuenta || '',
        password: '',
        perfil: cred?.perfil || '',
        pin: cred?.pin || '',
      });
      setDateForm(sub.proxima_fecha ? new Date(sub.proxima_fecha).toISOString().split('T')[0] : '');
    } catch (err) {
      console.error('[Admin] startEdit error:', err);
      toast.error('Error al cargar edición');
      setEditingId(null);
    }
  };

  const normalizeServiceCode = (name: string) => {
    const cleaned = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return cleaned.length >= 4 ? cleaned.slice(0, 4) : cleaned.padEnd(4, 'X');
  };

  const makeSubscriptionCode = (serviceName: string, sequence: number) => {
    return `VORTEX-${normalizeServiceCode(serviceName)}-${String(sequence).padStart(3, '0')}`;
  };

  const saveCredentials = async (subId: string) => {
    setSaving(true);
    try {
      console.debug('[Admin] Saving credentials for subscription:', subId);

      const payload: any = {};

      if (credForm.email) payload.email_cuenta = credForm.email;
      if (credForm.password) payload.password_cuenta = credForm.password;
      if (credForm.perfil) payload.perfil = credForm.perfil;
      if (credForm.pin) payload.pin = credForm.pin;
      if (dateForm) payload.proxima_fecha = new Date(dateForm).toISOString();

      // Si está procesando credenciales, activar a confirmado
      const sub = subs.find(s => s.id === subId);
      if (sub?.status === 'procesando_credenciales') {
        payload.status = 'confirmed';
      }

      const { data, error } = await updateSimpleSubscription(subId, payload);
      if (error) throw error;

      toast.success('✅ Credenciales guardadas');
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      console.error('[Admin] saveCredentials error:', err);
      toast.error(`❌ ${err.message || 'Error guardando credenciales'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubscription = async (subId: string) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta suscripción? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    setDeletingId(subId);
    try {
      console.debug('[Admin] Deleting subscription:', subId);
      const { error } = await deleteSimpleSubscription(subId);

      if (error) throw error;

      toast.success('✅ Suscripción eliminada correctamente');
      fetchData();
    } catch (err: any) {
      console.error('[Admin] deleteSubscription error:', err);
      toast.error(`❌ ${err.message || 'Error eliminando la suscripción'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmRenewal = async (sub: Subscription) => {
    setConfirming(sub.id);
    try {
      console.debug('[Admin] Confirming renewal for subscription:', sub.id);

      const { error } = await updateSimpleSubscriptionStatus(sub.id, 'active');

      if (error) throw error;

      toast.success('✅ Renovación confirmada — estado actualizado a activo');
      fetchData();
    } catch (err: any) {
      console.error('[Admin] confirmRenewal error:', err);
      toast.error(`❌ ${err.message || 'Error al confirmar renovación'}`);
    } finally {
      setConfirming(null);
    }
  };

  const addManualRecord = async () => {
    if (!form.order_id) {
      toast.error('Selecciona un pedido pendiente');
      return;
    }

    const selectedOrder = pendingOrders.find(o => o.id === form.order_id);
    if (!selectedOrder) {
      toast.error('Pedido no encontrado');
      return;
    }

    try {
      console.debug('[Admin] Creating subscription from order:', selectedOrder.id);

      const now = new Date();
      const nextRenewal = new Date(now.getTime() + form.days * 24 * 60 * 60 * 1000).toISOString();

      // Check if it's a combo (contains '+')
      const isCombo = selectedOrder.product_name.includes('+');
      const services = isCombo 
        ? selectedOrder.product_name.split('+').map(s => s.trim())
        : [selectedOrder.product_name];

      const payloads = services.map(service => ({
        user_id: selectedOrder.user_id,
        service_name: service,
        status: 'procesando_credenciales',
        proxima_fecha: nextRenewal,
      }));

      const { error } = await supabase.from('subscriptions').insert(payloads);

      if (error) {
        if (error.code === 'PGRST204') {
          console.error('[Admin] PGRST204 schema cache error, insert payload keys:', Object.keys(payloads[0]));
          console.error('[Admin] PGRST204 details:', error);
        }
        throw error;
      }

      toast.success(`✅ ${isCombo ? 'Suscripciones creadas' : 'Suscripción creada'} — pendiente de credenciales`);
      setShowAdd(false);
      setForm({ order_id: '', days: 30 });
      fetchData();
    } catch (err: any) {
      console.error('[Admin] addManualRecord error:', err);
      toast.error(`❌ ${err.message || 'Error al crear suscripción'}`);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400';
      case 'confirmed': return 'bg-emerald-500/20 text-emerald-400';
      case 'expired': return 'bg-destructive/20 text-destructive';
      case 'pending_approval': return 'bg-amber-500/20 text-amber-400';
      case 'procesando_credenciales': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'confirmed': return 'Confirmado';
      case 'expired': return 'Vencido';
      case 'pending_approval': return 'Pendiente';
      case 'procesando_credenciales': return 'Pendiente de Credenciales';
      default: return status;
    }
  };

  // Intelligent search filter
  const filteredSubs = useMemo(() => {
    if (!searchQuery.trim()) return subs;
    
    const query = searchQuery.toLowerCase().trim();
    return subs.filter(sub => {
const clientName = (sub.profile?.display_name || sub.profile?.email || sub.user_id || '').toLowerCase();
        const serviceName = (sub.service_name || '').toLowerCase();
        const uniqueId = `vortex-${sub.id?.slice(0, 8) || 'unknown'}`.toLowerCase();
      
      return (
        clientName.includes(query) ||
        serviceName.includes(query) ||
        uniqueId.includes(query)
      );
    });
  }, [subs, searchQuery]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  // Group filtered subs by user
  const groupedByUser = filteredSubs.reduce<Record<string, (Subscription & { profile?: Profile })[]>>((acc, s) => {
    const key = s.profile?.display_name || s.profile?.email || s.user_id?.slice(0, 8) || 'Desconocido';
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

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por cliente, servicio o ID (VORTEX-XXXX)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/60 border border-border text-sm placeholder-muted-foreground hover:border-primary/50 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Crear Suscripción desde Pedido</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pedido Pendiente</label>
              <select value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border">
                <option value="">Seleccionar pedido...</option>
                {pendingOrders?.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.product_name} - {o.customer_email} - ${Number(o.total).toFixed(2)} ({o.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Duración Inicial (Días)</label>
              <input type="number" min={1} value={form.days} onChange={e => setForm(f => ({ ...f, days: parseInt(e.target.value) || 30 }))} className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border" />
            </div>
          </div>
          <button onClick={addManualRecord} className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold">Crear Suscripción</button>
        </motion.div>
      )}

      {/* Grouped by user */}
      <div className="space-y-6">
        {Object.keys(groupedByUser).length === 0 ? (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-8 text-center text-slate-400 text-sm">
            No hay suscripciones disponibles.
          </div>
        ) : (
          (Object.entries(groupedByUser) as [string, (Subscription & { profile?: Profile })[]][]).map(([userName, userSubs]) => (
          <div key={userName} className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-xl overflow-hidden">
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
                  {userSubs?.map((s) => (
                    <Fragment key={s.id}>
                      <tr className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">{s.service_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor(s.status)}`}>
                            {statusLabel(s.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{s.proxima_fecha ? new Date(s.proxima_fecha).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-3 text-center"><ExpiryBadge nextRenewal={s.proxima_fecha || s.created_at} /></td>
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
                            <button
                              onClick={() => handleDeleteSubscription(s.id)}
                              disabled={deletingId === s.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                              title="Eliminar suscripción"
                            >
                              {deletingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingId === s.id && (
                        <tr className="bg-secondary/20">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
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
                                <input value={credForm.perfil} onChange={e => setCredForm(f => ({ ...f, perfil: e.target.value }))} placeholder="Nombre del perfil" className="w-full px-3 py-2 rounded-lg bg-background text-sm border border-border" />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">PIN</label>
                                <input value={credForm.pin} onChange={e => setCredForm(f => ({ ...f, pin: e.target.value }))} placeholder="PIN del perfil" className="w-full px-3 py-2 rounded-lg bg-background text-sm border border-border" />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Próxima Renovación</label>
                                <input type="date" value={dateForm} onChange={e => setDateForm(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-background text-sm border border-border" />
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
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
        {subs.length === 0 && (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">No hay suscripciones registradas</div>
        )}
        {subs.length > 0 && filteredSubs.length === 0 && (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
            No se encontraron resultados para "{searchQuery}". Intenta buscar por cliente, servicio o ID.
          </div>
        )}
      </div>
    </div>
  );
}
