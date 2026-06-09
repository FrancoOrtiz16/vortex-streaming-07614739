import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2, Plus, Zap, Download, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ServiceRow, { type ServiceRowData } from './ServiceRow';
import MobileServiceCard from './MobileServiceCard';
import ReceiptImageViewer from './ReceiptImageViewer';
import { resolveReceiptPublicUrl } from './receiptPreviewUtils';
import { ManualSubscriptionModal } from './ManualSubscriptionModal';
import { syncOrderToSubscription } from '@/services/orderService';
import { exportSubscriptionsToExcel } from '@/lib/subscriptionExcelExport';

/**
 * AdminSubscriptionsNew — Vista en tabla con filas independientes (Sandboxing).
 * Cada ServiceRow gestiona su propio estado. Si una fila falla, el resto sigue.
 * Características:
 * - Sincronización automática de órdenes a suscripciones
 * - Creación manual de suscripciones
 * - Semáforo automático por vencimiento
 */
export default function AdminSubscriptionsNew() {
  const [rows, setRows] = useState<ServiceRowData[]>([]);
  const [highlightedRows, setHighlightedRows] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const MANUAL_MODAL_KEY = 'admin_manual_subscription_modal_open_v1';
  const [showManualModal, setShowManualModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(MANUAL_MODAL_KEY) === 'true';
  });
  const [services, setServices] = useState<Array<{ id: string; name: string; price: number; plan_type: string | null }>>([]);
  const [syncing, setSyncing] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalLoading, setReceiptModalLoading] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [receiptModalError, setReceiptModalError] = useState<string | null>(null);
  const [receiptAvailableBySubscriptionId, setReceiptAvailableBySubscriptionId] = useState<Record<string, boolean>>({});
  const [receiptAvailableByUserId, setReceiptAvailableByUserId] = useState<Record<string, boolean>>({});
  const [receiptOwnerLabel, setReceiptOwnerLabel] = useState<string>('');
  const isMountedRef = useRef(true);
  const profileCacheRef = useRef<Map<string, { display_name: string | null; email: string | null; phone: string | null }>>(new Map());
  const highlightTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /**
   * Cargar los servicios disponibles para el selector
   */
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, plan_type')
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('[AdminSubscriptionsNew] Error fetching services:', err);
    }
  };

  /**
   * Sincronizar órdenes completadas a suscripciones pendientes
   */
  const handleSyncOrders = async () => {
    setSyncing(true);
    try {
      // Obtener órdenes completadas
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, user_id, customer_email, product_name, total, status, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!orders || orders.length === 0) {
        toast.info('ℹ️ No hay órdenes completadas para sincronizar');
        setSyncing(false);
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const order of orders) {
        const result = await syncOrderToSubscription(order as any);
        if (result.ok) {
          synced++;
        } else {
          failed++;
          console.warn('[AdminSubscriptionsNew] Sync failed for order:', order.id, result.error);
        }
      }

      toast.success(`✅ Sincronización completada: ${synced} órdenes procesadas${failed > 0 ? `, ${failed} fallidas` : ''}`);
      fetchAll(); // Recargar suscripciones
    } catch (err: any) {
      console.error('[AdminSubscriptionsNew] Sync error:', err);
      toast.error(err?.message || 'Error sincronizando órdenes');
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Cargar todas las suscripciones y perfil de usuarios
   */
  const getProfileLabel = (profile: { display_name: string | null; email: string | null; phone: string | null } | null, subscription: any) => {
    return profile?.display_name || profile?.email || subscription.user_id?.slice(0, 8) || 'Desconocido';
  };

  const clearHighlightTimer = (id: string) => {
    const existing = highlightTimerRef.current[id];
    if (existing) {
      clearTimeout(existing);
      delete highlightTimerRef.current[id];
    }
  };

  const highlightRow = (id: string) => {
    if (!id) return;
    clearHighlightTimer(id);
    setHighlightedRows((prev) => ({ ...prev, [id]: true }));
    highlightTimerRef.current[id] = setTimeout(() => {
      setHighlightedRows((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete highlightTimerRef.current[id];
    }, 1800);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, email, phone')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.warn('[AdminSubscriptionsNew] Error fetching profile for realtime update:', error);
      return null;
    }

    return data as { user_id: string; display_name: string | null; email: string | null; phone: string | null };
  };

  const mapSubscriptionRow = (subscription: any, profile?: { display_name: string | null; email: string | null; phone: string | null } | null): ServiceRowData => {
    const prof = profile || profileCacheRef.current.get(subscription.user_id) || null;
    return {
      id: subscription.id,
      user_id: subscription.user_id,
      service_name: subscription.service_name,
      status: subscription.status,
      next_renewal: subscription.next_renewal,
      last_renewal: subscription.last_renewal,
      credential_email: subscription.credential_email,
      credential_password: subscription.credential_password,
      profile_name: subscription.profile_name,
      profile_pin: subscription.profile_pin,
      subscription_code: subscription.subscription_code ?? null,
      receipt_url: subscription.receipt_url ?? null,
      phone: prof?.phone ?? undefined,
      profile_phone: prof?.phone ?? undefined,
      client_label: getProfileLabel(prof, subscription),
      order_id: null,
    };
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [subsRes, profilesRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id, user_id, service_name, status, next_renewal, last_renewal, credential_email, credential_password, profile_name, profile_pin, subscription_code, receipt_url')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, display_name, email, phone'),
      ]);

      if (subsRes.error) {
        toast.error('Error cargando suscripciones');
        return;
      }

      const profileMap = new Map<string, { display_name: string | null; email: string | null; phone: string | null }>();
      (profilesRes.data || []).forEach((p: any) => profileMap.set(p.user_id, {
        display_name: p.display_name,
        email: p.email,
        phone: p.phone,
      }));
      profileCacheRef.current = profileMap;

      const mapped: ServiceRowData[] = (subsRes.data || []).map((s: any) => {
        const prof = profileMap.get(s.user_id) ?? null;
        return mapSubscriptionRow(s, prof);
      });

      if (isMountedRef.current) {
        setRows(mapped);
        fetchReceiptAvailability(mapped);
      }
    } catch (err) {
      console.error('[AdminSubscriptionsNew] fetch error', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const fetchReceiptAvailability = async (rows: ServiceRowData[]) => {
    try {
      const subscriptionIds = Array.from(new Set(rows.map((row) => row.id))).filter(Boolean);
      const userIds = Array.from(new Set(rows.map((row) => row.user_id))).filter(Boolean);
      
      if (subscriptionIds.length === 0 && userIds.length === 0) {
        setReceiptAvailableBySubscriptionId({});
        setReceiptAvailableByUserId({});
        return;
      }

      // ⭐ NUEVA LÓGICA: Buscar en subscriptions.receipt_url (donde se guardan ahora)
      const subscriptionsQuery = supabase
        .from('subscriptions')
        .select('id, user_id, receipt_url')
        .neq('receipt_url', null);

      const { data: subscriptionsData, error: subsError } = await (async () => {
        if (subscriptionIds.length > 0 && userIds.length > 0) {
          return subscriptionsQuery.or(
            `id.in.(${subscriptionIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')}),user_id.in.(${userIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`
          );
        }
        if (subscriptionIds.length > 0) {
          return subscriptionsQuery.in('id', subscriptionIds);
        }
        return subscriptionsQuery.in('user_id', userIds);
      })();

      if (subsError) {
        console.warn('[AdminSubscriptionsNew] subscriptions receipt_url load error:', subsError);
      }

      // ⭐ FALLBACK: También buscar en payment_history para compatibilidad hacia atrás
      const paymentHistoryQuery = supabase
        .from('payment_history')
        .select('subscription_id, user_id, receipt_url')
        .neq('receipt_url', null)
        .order('created_at', { ascending: false });

      const { data: paymentData, error: phError } = await (async () => {
        if (subscriptionIds.length > 0 && userIds.length > 0) {
          return paymentHistoryQuery.or(
            `subscription_id.in.(${subscriptionIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')}),user_id.in.(${userIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`
          );
        }
        if (subscriptionIds.length > 0) {
          return paymentHistoryQuery.in('subscription_id', subscriptionIds);
        }
        return paymentHistoryQuery.in('user_id', userIds);
      })();

      if (phError) {
        console.warn('[AdminSubscriptionsNew] payment_history receipt load error:', phError);
      }

      const subscriptionMap: Record<string, boolean> = {};
      const userMap: Record<string, boolean> = {};

      // Procesar subscriptions.receipt_url (PRIORIDAD)
      (subscriptionsData || []).forEach((item: any) => {
        if (item.receipt_url) {
          subscriptionMap[item.id] = true;
          if (item.user_id) userMap[item.user_id] = true;
        }
      });

      // Procesar payment_history.receipt_url (FALLBACK)
      (paymentData || []).forEach((item: any) => {
        if (item.receipt_url) {
          if (item.subscription_id) subscriptionMap[item.subscription_id] = true;
          if (item.user_id) userMap[item.user_id] = true;
        }
      });

      if (isMountedRef.current) {
        setReceiptAvailableBySubscriptionId(subscriptionMap);
        setReceiptAvailableByUserId(userMap);
      }
    } catch (err) {
      console.error('[AdminSubscriptionsNew] fetchReceiptAvailability error:', err);
    }
  };

  const openReceiptModal = async (subscriptionId: string | undefined, userId?: string | undefined, label?: string) => {
    setReceiptModalOpen(true);
    setReceiptModalLoading(true);
    setSelectedReceiptUrl(null);
    setReceiptModalError(null);
    setReceiptOwnerLabel(label || 'Comprobante de pago');

    try {
      let receiptUrl: string | null = null;

      // ⭐ PASO 1: Buscar en subscriptions.receipt_url (PRIORIDAD)
      if (subscriptionId) {
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('receipt_url')
          .eq('id', subscriptionId)
          .maybeSingle();

        if (!subError && subData?.receipt_url) {
          receiptUrl = subData.receipt_url;
          console.debug('[AdminSubscriptionsNew] Receipt found in subscriptions:', subscriptionId);
        }
      }

      // ⭐ PASO 2: Si no encontró en subscriptions, buscar en payment_history (FALLBACK)
      if (!receiptUrl) {
        const { data: phData, error: phError } = await (() => {
          const baseQuery = supabase
            .from('payment_history')
            .select('receipt_url')
            .neq('receipt_url', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (userId) {
            return baseQuery.eq('user_id', userId);
          }
          if (subscriptionId) {
            return baseQuery.eq('subscription_id', subscriptionId);
          }
          return baseQuery;
        })();

        if (!phError && phData?.[0]?.receipt_url) {
          receiptUrl = phData[0].receipt_url;
          console.debug('[AdminSubscriptionsNew] Receipt found in payment_history');
        }
      }

      if (!receiptUrl) {
        setReceiptModalError('No se encontró comprobante para esta suscripción.');
        return;
      }

      const normalizedReceiptUrl = await resolveReceiptPublicUrl(receiptUrl, userId);

      if (!normalizedReceiptUrl) {
        setReceiptModalError('No se pudo resolver la URL del comprobante.');
      } else {
        setSelectedReceiptUrl(normalizedReceiptUrl);
      }
    } catch (err: any) {
      console.error('[AdminSubscriptionsNew] openReceiptModal error:', err);
      setReceiptModalError(err?.message || 'Error cargando el comprobante');
    } finally {
      setReceiptModalLoading(false);
    }
  };

  const closeReceiptModal = () => {
    setReceiptModalOpen(false);
    setSelectedReceiptUrl(null);
    setReceiptModalError(null);
    setReceiptModalLoading(false);
    setReceiptOwnerLabel('');
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchServices();
    fetchAll();
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(MANUAL_MODAL_KEY, String(showManualModal));
  }, [showManualModal]);

  // Realtime: refrescar la tabla cuando se inserte/actualice/borre cualquier suscripción.
  useEffect(() => {
    const channel = supabase.channel('admin-subscriptions-realtime');

    const handleSubscriptionChange = async (payload: any) => {
      console.debug('[AdminSubscriptionsNew] Realtime subscription change:', payload);
      const { eventType, new: newRow, old: oldRow } = payload;

      if (eventType === 'INSERT' && newRow) {
        const profile = newRow.user_id ? await fetchProfile(newRow.user_id) : null;
        const row = mapSubscriptionRow(newRow, profile);
        if (isMountedRef.current) {
          setRows((prev) => [row, ...prev]);
          highlightRow(row.id);
          toast.success('Nueva suscripción recibida');
        }
        return;
      }

      if (eventType === 'UPDATE' && newRow) {
        const profile = newRow.user_id ? await fetchProfile(newRow.user_id) : null;
        const row = mapSubscriptionRow(newRow, profile);
        if (isMountedRef.current) {
          setRows((prev) => {
            const hasExisting = prev.some((item) => item.id === row.id);
            if (hasExisting) {
              return prev.map((item) => (item.id === row.id ? row : item));
            }
            return [row, ...prev];
          });
          highlightRow(row.id);
          toast.success('Suscripción actualizada en tiempo real');
        }
        return;
      }

      if (eventType === 'DELETE' && oldRow) {
        if (isMountedRef.current) {
          setRows((prev) => prev.filter((item) => item.id !== oldRow.id));
          toast.success('Suscripción eliminada');
        }
        return;
      }

      // Fallback: recargar si no sabemos exactamente qué pasó.
      if (isMountedRef.current) {
        fetchAll();
      }
    };

    const handleProfileChange = async (payload: any) => {
      console.debug('[AdminSubscriptionsNew] Realtime profile change:', payload);
      const profile = payload.new;
      if (!profile?.user_id) return;
      profileCacheRef.current.set(profile.user_id, {
        display_name: profile.display_name,
        email: profile.email,
        phone: profile.phone,
      });

      if (!isMountedRef.current) return;
      setRows((prev) => {
        const updatedIds: string[] = [];
        const next = prev.map((item) => {
          if (item.user_id !== profile.user_id) return item;
          updatedIds.push(item.id);
          return {
            ...item,
            phone: profile.phone ?? item.phone,
            profile_phone: profile.phone ?? item.profile_phone,
            client_label: getProfileLabel(profile, item),
          };
        });

        updatedIds.forEach(highlightRow);
        return next;
      });

      toast.success('Datos de contacto actualizados');
    };

    const handlePaymentHistoryChange = (payload: any) => {
      console.debug('[AdminSubscriptionsNew] Realtime payment_history change:', payload);
      if (isMountedRef.current) {
        fetchAll();
        toast.info('Actividad de pago registrada, tabla actualizada.');
      }
    };

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, handleSubscriptionChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, handleProfileChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_history' }, handlePaymentHistoryChange)
      .subscribe();

    return () => {
      Object.values(highlightTimerRef.current).forEach(clearTimeout);
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (filter === 'pending') {
      list = list.filter((r) => r.status === 'pending_approval' || r.status === 'procesando_credenciales');
    }
    if (q) {
      list = list.filter((r) =>
        r.client_label.toLowerCase().includes(q) ||
        r.service_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, search, filter]);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === 'pending_approval' || r.status === 'procesando_credenciales').length,
    [rows]
  );

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      await exportSubscriptionsToExcel(
        filtered.map((row) => ({
          id: row.id,
          client_label: row.client_label || 'Cliente sin nombre',
          user_id: row.user_id,
          service_name: row.service_name,
          credential_email: row.credential_email,
          credential_password: row.credential_password,
          profile_name: row.profile_name || row.client_label || null,
          next_renewal: row.next_renewal || null,
          created_at: row.last_renewal || null,
          status: row.status,
          price: 0,
        })),
        `suscripciones-streaming-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success('Reporte exportado a Excel');
    } catch (error) {
      console.error('[AdminSubscriptionsNew] export error:', error);
      toast.error('No se pudo exportar el reporte a Excel');
    } finally {
      setExportingExcel(false);
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
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Admin</p>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Gestión de suscripciones</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Sincronización automática de ventas + Creación manual + Semáforo de vencimiento
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 w-full md:w-auto">
          <button
          type='button'
            onClick={handleSyncOrders}
            disabled={syncing}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition"
            title="Sincronizar órdenes completadas con suscripciones"
          >
            {syncing ? (
              <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" />
            ) : (
              <Zap className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            )}
            {syncing ? 'Sincronizando...' : 'Sincronizar Órdenes'}
          </button>
          <button
            type='button'
            onClick={handleExportExcel}
            disabled={exportingExcel || filtered.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition"
            title="Exportar el listado actual a Excel"
          >
            {exportingExcel ? <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" /> : <Download className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            {exportingExcel ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <button
            type='button'
            onClick={() => setShowManualModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition"
            title="Crear una nueva suscripción manual"
          >
            <Plus className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            Nueva Manual
          </button>
        </div>
      </div>

      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 sm:left-4 top-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearching(true)}
          onBlur={() => setSearching(false)}
          placeholder="Buscar por cliente o servicio..."
          className="w-full rounded-3xl border border-border bg-secondary/70 py-2 sm:py-3 pl-10 sm:pl-12 pr-3 sm:pr-4 text-xs sm:text-sm text-white outline-none focus:border-primary transition"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]'
              : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
          }`}
        >
          Todas ({rows.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 ${
            filter === 'pending'
              ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
          }`}
        >
          Confirmaciones Pendientes
          {pendingCount > 0 && (
            <span className="inline-flex h-4 sm:h-5 min-w-[18px] sm:min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1 sm:px-1.5 text-[9px] sm:text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Vista Desktop: Tabla */}
      <div className="hidden md:block w-full overflow-x-auto rounded-3xl border border-white/10 bg-black/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última</TableHead>
              <TableHead>Próxima</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Semáforo</TableHead>
              <TableHead>Contraseña</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const hasReceipt = Boolean(
                receiptAvailableBySubscriptionId[row.id] ||
                (row.user_id && receiptAvailableByUserId[row.user_id])
              );
              return (
                <ServiceRow
                  key={row.id}
                  data={row}
                  onChanged={fetchAll}
                  highlight={Boolean(highlightedRows[row.id])}
                  hasReceipt={hasReceipt}
                  onOpenReceipt={openReceiptModal}
                />
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No se encontraron suscripciones.
          </div>
        )}
      </div>

      {/* Vista Móvil: Cards */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((row) => (
          <MobileServiceCard
            key={row.id}
            data={row}
            onChanged={fetchAll}
            highlight={Boolean(highlightedRows[row.id])}
            hasReceipt={Boolean(
              receiptAvailableBySubscriptionId[row.id] ||
              (row.user_id && receiptAvailableByUserId[row.user_id])
            )}
            onOpenReceipt={openReceiptModal}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground rounded-2xl border border-white/10 bg-black/40">
            No se encontraron suscripciones.
          </div>
        )}
      </div>

      {/* Modal de Nueva Suscripción Manual */}
      <ManualSubscriptionModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={() => {
          setShowManualModal(false);
          fetchAll();
        }}
        services={services}
      />

      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeReceiptModal} />
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#030712] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">Previsualizar comprobante</p>
                <p className="text-xs text-slate-400">{receiptOwnerLabel || 'Comprobante de pago'}</p>
              </div>
              <button
                type="button"
                onClick={closeReceiptModal}
                className="rounded-full p-2 text-slate-300 hover:bg-white/10 transition"
                aria-label="Cerrar previsualización"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="min-h-[260px] max-h-[calc(100vh-10rem)] overflow-auto p-5">
              {receiptModalLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : receiptModalError ? (
                <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-center text-sm text-destructive">
                  {receiptModalError}
                </div>
              ) : selectedReceiptUrl ? (
                <div className="space-y-4">
                  <ReceiptImageViewer
                    receiptUrl={selectedReceiptUrl}
                    altText="Comprobante de pago"
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={closeReceiptModal}
                      className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
                  No se encontró ningún comprobante para esta suscripción.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}