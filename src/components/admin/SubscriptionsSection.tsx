import { useState, useEffect, Fragment, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, X, CalendarClock, Pencil, Save, Check, Loader2, Trash2, Search, Bell, Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  getAllSubscriptionsAdmin,
  deleteSimpleSubscription,
  updateSimpleSubscription,
  updateSimpleSubscriptionStatus,
  getSubscriptionCredentials,
  createSubscriptionExpirationNotification,
} from '@/integrations/supabase/subscriptions-helpers';
import { toast } from 'sonner';
import { approvePayment } from '@/services/orderService';
import { ExpiryBadge } from '@/components/ExpiryBadge';
import ReceiptImageViewer from '@/components/admin/ReceiptImageViewer';
import { getVETDateInputISO, getVETDateString, getTrafficLightStatus, getDaysUntilExpiry } from '@/lib/trafficLightUtils';
import { exportSubscriptionsToExcel } from '@/lib/subscriptionExcelExport';
import { getWhatsAppUrl } from '@/lib/whatsapp';
import { resolveReceiptPublicUrl } from '@/components/admin/receiptPreviewUtils';

interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  status: string;
  duration_days?: number;
  next_renewal?: string;
  created_at: string;
  updated_at: string;
  credential_email?: string | null;
  credential_password?: string | null;
  profile_name?: string | null;
  profile_pin?: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone?: string | null;
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
  const [form, setForm] = useState({ 
    clientName: '', 
    serviceName: '', 
    startDate: '', 
    expiryDate: '', 
    email: '', 
    password: '', 
    profile: '', 
    pin: '' 
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [credForm, setCredForm] = useState<CredentialForm>({ email: '', password: '', perfil: '', pin: '' });
  const [dateForm, setDateForm] = useState<string>('');
  const [durationForm, setDurationForm] = useState<number>(30);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Inline date editing (table row)
  const [inlineDateEditingId, setInlineDateEditingId] = useState<string | null>(null);
  const [inlineDateValue, setInlineDateValue] = useState<string>('');
  const [inlineSavingId, setInlineSavingId] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [services, setServices] = useState<any[]>([]);
  const [notifyingBulk, setNotifyingBulk] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalLoading, setReceiptModalLoading] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [receiptModalError, setReceiptModalError] = useState<string | null>(null);
  const [currentReceiptUserId, setCurrentReceiptUserId] = useState<string | null>(null);
  const [deletingReceipt, setDeletingReceipt] = useState(false);
  const [receiptUrlByUser, setReceiptUrlByUser] = useState<Record<string, string>>({});
  const [receiptAvailableByUser, setReceiptAvailableByUser] = useState<Record<string, boolean>>({});
  const isMountedRef = useRef(true);

  const fetchData = async () => {
    try {
      console.debug('[Admin] Fetching all subscriptions and pending orders');
      const [{ data: subsData, error: subsError }, profilesRes, ordersRes, servicesRes] = await Promise.all([
        getAllSubscriptionsAdmin(),
        supabase.from('profiles').select('id, user_id, display_name, email, phone'),
        supabase.from('orders').select('id, user_id, customer_email, product_name, total, status, created_at, expiry_date').eq('status', 'procesando_credenciales'),
        supabase.from('services').select('id, name').eq('is_available', true),
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

      if (servicesRes.error) {
        console.error('[Admin] Services fetch error:', servicesRes.error);
        if (isMountedRef.current) {
          setServices([]);
        }
      }

      const profilesList = profilesRes.data || [];
      const pendingOrdersList = ordersRes.data || [];
      const servicesList = servicesRes.data || [];
      if (isMountedRef.current) {
        setProfiles(profilesList);
        setPendingOrders(pendingOrdersList);
        setServices(servicesList);
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
      if (isMountedRef.current) {
        prefetchReceiptAvailability(subsWithProfiles);
      }
      console.debug('[Admin] Pending orders loaded:', pendingOrdersList.length);
    } catch (err) {
      console.error('[Admin] fetchData error:', err);
      if (isMountedRef.current) {
        toast.error('Error cargando datos');
        setLoading(false);
      }
    }
  };

  const startInlineDateEdit = (sub: Subscription) => {
    setInlineDateEditingId(sub.id);
    setInlineDateValue(sub.next_renewal ? getVETDateString(new Date(sub.next_renewal)) : getVETDateString(new Date()));
  };

  const cancelInlineDateEdit = () => {
    setInlineDateEditingId(null);
    setInlineDateValue('');
  };

  const saveInlineDate = async (subId: string) => {
    if (!inlineDateValue) {
      toast.error('Selecciona una fecha válida');
      return;
    }

    setInlineSavingId(subId);
    try {
      const iso = getVETDateInputISO(inlineDateValue);
      const { data, error } = await updateSimpleSubscription(subId, { proxima_fecha: iso });
      if (error) throw error;

      // Update local state to avoid full refetch
      setSubs((prev) => prev.map((p) => (p.id === subId ? { ...p, next_renewal: iso } : p)));

      toast.success('Fecha de vencimiento actualizada');
      setInlineDateEditingId(null);
      setInlineDateValue('');
    } catch (err: any) {
      console.error('[Admin] saveInlineDate error:', err);
      toast.error(`No se pudo guardar la fecha: ${err?.message || err}`);
    } finally {
      setInlineSavingId(null);
    }
  };

  const loadUserReceiptUrl = async (userId: string) => {
    if (!userId) return null;
    if (receiptUrlByUser[userId]) return receiptUrlByUser[userId];

    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_history')
        .select('receipt_url')
        .eq('user_id', userId)
        .neq('receipt_url', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!paymentError && paymentData?.length) {
        const rawReceipt = paymentData[0].receipt_url;
        const normalizedReceiptUrl = await resolveReceiptPublicUrl(rawReceipt, userId);
        if (normalizedReceiptUrl) {
          setReceiptAvailableByUser((prev) => ({ ...prev, [userId]: true }));
          setReceiptUrlByUser((prev) => ({ ...prev, [userId]: normalizedReceiptUrl }));
          return normalizedReceiptUrl;
        }
      }
    } catch (err) {
      console.warn('[Admin] payment_history receipt lookup failed:', err);
    }

    try {
      const { data, error } = await supabase.storage.from('receipts').list(userId);
      if (error || !data || data.length === 0) {
        setReceiptAvailableByUser((prev) => ({ ...prev, [userId]: false }));
        return null;
      }

      const latestFile = data
        .filter((file) => !file.name.startsWith('.'))
        .sort((a, b) => b.name.localeCompare(a.name))[0];

      if (!latestFile) {
        setReceiptAvailableByUser((prev) => ({ ...prev, [userId]: false }));
        return null;
      }

      const path = `${userId}/${latestFile.name}`;
      const urlData = supabase.storage.from('receipts').getPublicUrl(path);
      if (!urlData?.data?.publicUrl) {
        setReceiptAvailableByUser((prev) => ({ ...prev, [userId]: false }));
        return null;
      }

      setReceiptAvailableByUser((prev) => ({ ...prev, [userId]: true }));
      setReceiptUrlByUser((prev) => ({ ...prev, [userId]: urlData.data.publicUrl }));
      return urlData.data.publicUrl;
    } catch (err) {
      setReceiptAvailableByUser((prev) => ({ ...prev, [userId]: false }));
      return null;
    }
  };

  const getReceiptPublicUrl = async (userId: string) => {
    return loadUserReceiptUrl(userId);
  };

  const prefetchReceiptAvailability = async (subscriptionList: (Subscription & { profile?: Profile })[]) => {
    const userIds = Array.from(new Set(subscriptionList.map((sub) => sub.user_id).filter(Boolean)));
    await Promise.all(userIds.map((userId) => loadUserReceiptUrl(userId)));
  };

  const handleDeleteReceipt = async () => {
    if (!selectedReceiptUrl || !currentReceiptUserId) return;
    setDeletingReceipt(true);
    try {
      const marker = '/object/public/receipts/';
      const markerIndex = selectedReceiptUrl.indexOf(marker);
      if (markerIndex !== -1) {
        const storagePath = selectedReceiptUrl.slice(markerIndex + marker.length).split('?')[0];
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove([storagePath]);
        if (storageError) {
          console.warn('[Admin] Error borrando archivo del storage:', storageError);
        }
      } else {
        console.warn('[Admin] No se pudo determinar el path del storage para:', selectedReceiptUrl);
      }

      await supabase
        .from('payment_history')
        .update({ receipt_url: null })
        .eq('user_id', currentReceiptUserId)
        .eq('receipt_url', selectedReceiptUrl);

      setReceiptAvailableByUser((prev) => ({ ...prev, [currentReceiptUserId]: false }));
      setReceiptUrlByUser((prev) => {
        const next = { ...prev };
        delete next[currentReceiptUserId];
        return next;
      });

      toast.success('Comprobante eliminado correctamente');
      closeReceiptModal();
    } catch (err: any) {
      console.error('[Admin] handleDeleteReceipt error:', err);
      toast.error(err?.message || 'Error eliminando el comprobante');
    } finally {
      setDeletingReceipt(false);
    }
  };

  const openReceiptModal = async (userId: string) => {
    setReceiptModalOpen(true);
    setReceiptModalLoading(true);
    setSelectedReceiptUrl(null);
    setReceiptModalError(null);
    setCurrentReceiptUserId(userId);

    try {
      const url = await getReceiptPublicUrl(userId);
      if (!url) {
        setReceiptModalError('No se encontró ningún comprobante asociado a esta suscripción.');
      } else {
        setSelectedReceiptUrl(url);
      }
    } catch (err: any) {
      console.error('[Admin] openReceiptModal error:', err);
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
    setCurrentReceiptUserId(null);
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
        setCredForm({ email: '', password: '', perfil: '', pin: '' });
        return;
      }

      const cred = credData?.[0];
      setCredForm({
        email: cred?.credential_email || sub.credential_email || '',
        password: '',
        perfil: sub.profile_name || '',
        pin: sub.profile_pin || '',
      });
      setDateForm(sub.next_renewal ? getVETDateString(new Date(sub.next_renewal)) : '');
      setDurationForm(sub.duration_days ?? 30);
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
      if (dateForm) payload.proxima_fecha = getVETDateInputISO(dateForm);
      if (durationForm !== null) payload.duration_days = durationForm;

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

  /**
   * Filtrar suscripciones a notificar: solo estado activo/confirmado y semáforo amarillo
   * (0 a 3 días para vencer). Excluye vencidas (rojo) y activas con mucho margen (verde).
   */
  const yellowSubsToNotify = useMemo(() => {
    return subs.filter(s => {
      const isActive = s.status === 'active' || s.status === 'confirmed' || s.status === 'Activo';
      if (!isActive) return false;
      const status = getTrafficLightStatus(s.next_renewal);
      return status === 'yellow';
    });
  }, [subs]);

  const handleNotifyBulk = async () => {
    if (notifyingBulk) return;
    const targets = yellowSubsToNotify;
    if (targets.length === 0) {
      toast.info('No hay clientes con vencimiento en 3 días o menos.');
      return;
    }

    if (!window.confirm(`Se enviarán ${targets.length} notificación(es) de vencimiento. ¿Continuar?`)) {
      return;
    }

    setNotifyingBulk(true);
    let success = 0;
    let failed = 0;
    const whatsappLinks: string[] = [];

    for (const sub of targets) {
      try {
        const profile: any = (sub as any).profile;
        const clientName = profile?.display_name || profile?.email?.split('@')[0] || 'Cliente';
        const days = getDaysUntilExpiry(sub.next_renewal);
        const expiryDate = sub.next_renewal
          ? new Date(sub.next_renewal).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })
          : 'pronto';
        const dayLabel = days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`;
        const message =
          `Hola ${clientName}, te recordamos que tu servicio de ${sub.service_name} vence ${dayLabel} ` +
          `(${expiryDate}). Renueva ahora para no perder el acceso. — Vortex Streaming`;

        const result = await createSubscriptionExpirationNotification(
          sub.user_id,
          sub.id,
          sub.service_name,
        );

        const waLink = result?.data?.wa_link;
        const finalMessage = result?.data?.message || message;
        if (waLink) {
          whatsappLinks.push(waLink);
        } else {
          const phone = profile?.phone;
          if (phone) {
            whatsappLinks.push(getWhatsAppUrl(finalMessage, phone));
          }
        }

        if (result.error) {
          const messageErr = result.error?.message || result.error?.error || (typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
          console.warn('[BulkNotify] notify-expiration error for', sub.id, messageErr);
          // Aún contamos como éxito si tenemos al menos canal WhatsApp; si no, fallo.
          const phone = profile?.phone;
          if (phone || result?.data?.wa_link) success++; else failed++;
        } else {
          success++;
        }
      } catch (err) {
        console.error('[BulkNotify] Error notificando suscripción', sub.id, err);
        failed++;
      }
    }

    // Abrir hasta 5 ventanas de WhatsApp para evitar bloqueo de pop-ups masivo.
    whatsappLinks.slice(0, 5).forEach((url, idx) => {
      setTimeout(() => window.open(url, '_blank'), idx * 250);
    });

    if (failed === 0) {
      toast.success(`✅ ${success} alerta(s) procesada(s) con éxito.`);
    } else {
      toast.warning(`Procesadas: ${success}. Fallidas: ${failed}.`);
    }

    setNotifyingBulk(false);
  };

  const confirmRenewal = async (sub: Subscription) => {
    setConfirming(sub.id);
    try {
      console.debug('[Admin] Confirming renewal for subscription:', sub.id);

      const result = await approvePayment(sub.id);
      if (!result.ok) {
        throw new Error(result.error || 'Error al confirmar renovación');
      }

      toast.success('✅ Renovación confirmada — estado actualizado a activo');
      fetchData();
    } catch (err: any) {
      console.error('[Admin] confirmRenewal error:', err);
      toast.error(`❌ ${err.message || 'Error al confirmar renovación'}`);
    } finally {
      setConfirming(null);
    }
  };

  const handleApprovePayment = async (subId: string) => {
    setConfirming(subId);
    try {
      const result = await approvePayment(subId);
      if (!result.ok) {
        throw new Error(result.error || 'Error aprobando pago');
      }

      toast.success('Pago aprobado. Suscripción activada.');
      fetchData();
    } catch (err: any) {
      console.error('[Admin] approve error:', err);
      toast.error('Error aprobando pago');
    } finally {
      setConfirming(null);
    }
  };

  const addManualRecord = async () => {
    if (!form.clientName || !form.serviceName || !form.startDate || !form.expiryDate) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    try {
      console.debug('[Admin] Creating manual subscription');

      const startDate = new Date(form.startDate);
      const expiryDate = new Date(form.expiryDate);
      const durationDays = Number.isFinite(startDate.getTime()) && Number.isFinite(expiryDate.getTime())
        ? Math.max(1, Math.round((expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 30;

      // Usar fecha lejana en lugar de NULL (BD no permite NULL)
      const pendingDate = new Date();
      pendingDate.setFullYear(pendingDate.getFullYear() + 100);

      const payload = {
        user_id: null, // Para clientes externos, no hay user_id
        service_name: form.serviceName,
        status: 'pending_approval', // Cambiado: pendiente de aprobación
        next_renewal: pendingDate.toISOString(), // Fecha lejana = marcador de "pendiente"
        duration_days: durationDays,
        credential_email: form.email || null,
        credential_password: form.password || null,
        profile_name: form.profile || null,
        profile_pin: form.pin || null,
        // Nota: Para clientes externos, podríamos necesitar campos adicionales en la tabla
      };

      const { error } = await supabase.from('subscriptions').insert([payload]);

      if (error) throw error;

      toast.success('Suscripción manual creada');
      setShowAdd(false);
      setForm({ clientName: '', serviceName: '', startDate: '', expiryDate: '', email: '', password: '', profile: '', pin: '' });
      fetchData();
    } catch (err: any) {
      console.error('[Admin] addManualRecord error:', err);
      toast.error(`Error: ${err.message || 'Error al crear suscripción'}`);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Activo': return 'bg-emerald-500/20 text-emerald-400';
      case 'active': return 'bg-emerald-500/20 text-emerald-400';
      case 'confirmed': return 'bg-emerald-500/20 text-emerald-400';
      case 'Pendiente de Pago': return 'bg-amber-500/20 text-amber-400';
      case 'expired': return 'bg-destructive/20 text-destructive';
      case 'pending_approval': return 'bg-amber-500/20 text-amber-400';
      case 'procesando_credenciales': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'Activo': return 'Activo';
      case 'active': return 'Activo';
      case 'confirmed': return 'Confirmado';
      case 'Pendiente de Pago': return 'Pendiente de Pago';
      case 'expired': return 'Vencido';
      case 'pending_approval': return 'Pendiente';
      case 'procesando_credenciales': return 'Pendiente de Credenciales';
      default: return status;
    }
  };

  // Intelligent search filter
  const filteredSubs = useMemo(() => {
    let filtered = subs;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }
    
    if (!searchQuery.trim()) return filtered;
    
    const query = searchQuery.toLowerCase().trim();
    return filtered.filter(sub => {
      const clientName = (sub.profile?.display_name || sub.profile?.email || sub.user_id || '').toLowerCase();
      const serviceName = (sub.service_name || '').toLowerCase();
      const uniqueId = `vortex-${sub.id?.slice(0, 8) || 'unknown'}`.toLowerCase();
      
      return (
        clientName.includes(query) ||
        serviceName.includes(query) ||
        uniqueId.includes(query)
      );
    });
  }, [subs, searchQuery, statusFilter]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      await exportSubscriptionsToExcel(
        filteredSubs.map((sub) => ({
          id: sub.id,
          client_label: sub.profile?.display_name || sub.profile?.email || sub.user_id || 'Cliente sin nombre',
          user_id: sub.user_id,
          service_name: sub.service_name,
          credential_email: sub.credential_email,
          credential_password: sub.credential_password,
          profile_name: sub.profile_name || sub.profile?.display_name || null,
          next_renewal: sub.next_renewal || null,
          created_at: sub.created_at,
          status: sub.status,
          price: (sub as any).price ?? 0,
        })),
        `suscripciones-streaming-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success('Reporte exportado a Excel');
    } catch (error) {
      console.error('[Admin] Excel export error:', error);
      toast.error('No se pudo exportar el reporte a Excel');
    } finally {
      setExportingExcel(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNotifyBulk}
            disabled={notifyingBulk || yellowSubsToNotify.length === 0}
            title={
              yellowSubsToNotify.length === 0
                ? 'No hay clientes con vencimiento en 3 días o menos'
                : `Enviar alerta a ${yellowSubsToNotify.length} cliente(s) próximos a vencer`
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {notifyingBulk ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            Notificar Vencimientos ({yellowSubsToNotify.length})
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel || filteredSubs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {exportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Exportar a Excel
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Suscripción Manual
          </button>
        </div>
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

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { value: 'all', label: 'Todas' },
          { value: 'Pendiente de Pago', label: 'Confirmaciones Pendientes' },
          { value: 'Activo', label: 'Activas' },
          { value: 'expired', label: 'Vencidas' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Nueva Suscripción Manual</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre del Cliente</label>
              <input
                value={form.clientName}
                onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border"
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Servicio</label>
              <select
                value={form.serviceName}
                onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border"
              >
                <option value="">Seleccionar servicio...</option>
                {services.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fecha de Inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fecha de Vencimiento</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Usuario/Email</label>
              <input
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border"
                placeholder="usuario@servicio.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border"
                placeholder="Contraseña del servicio"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Perfil (opcional)</label>
              <input
                value={form.profile}
                onChange={e => setForm(f => ({ ...f, profile: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border"
                placeholder="Nombre del perfil"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">PIN (opcional)</label>
              <input
                value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border"
                placeholder="PIN del perfil"
              />
            </div>
          </div>
          <button
            onClick={addManualRecord}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear Suscripción
          </button>
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
                    <th className="text-center px-4 py-2 text-muted-foreground font-medium text-xs">Comprobante</th>
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
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {inlineDateEditingId === s.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={inlineDateValue}
                                onChange={(e) => setInlineDateValue(e.target.value)}
                                className="px-2 py-1 rounded-lg bg-background text-sm border border-border"
                              />
                              <button
                                onClick={() => saveInlineDate(s.id)}
                                disabled={inlineSavingId === s.id}
                                className="inline-flex items-center justify-center p-1 rounded-md bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
                                title="Guardar fecha"
                              >
                                {inlineSavingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={cancelInlineDateEdit} className="inline-flex items-center justify-center p-1 rounded-md bg-secondary/10 text-muted-foreground hover:bg-secondary/20" title="Cancelar">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 justify-start">
                              <span>{s.next_renewal ? new Date(s.next_renewal).toLocaleDateString() : 'N/A'}</span>
                              <button onClick={() => startInlineDateEdit(s)} className="p-1 rounded-md hover:bg-secondary/20" title="Editar fecha manualmente">
                                <Pencil className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => openReceiptModal(s.user_id)}
                            disabled={!s.user_id || (s.user_id in receiptAvailableByUser && !receiptAvailableByUser[s.user_id])}
                            title={
                              !s.user_id || (s.user_id in receiptAvailableByUser && !receiptAvailableByUser[s.user_id])
                                ? 'No hay comprobante disponible'
                                : 'Previsualizar comprobante'
                            }
                            className="inline-flex items-center justify-center rounded-full p-2 text-sm border border-border transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/80"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center"><ExpiryBadge nextRenewal={s.status === 'active' || s.status === 'confirmed' ? s.next_renewal : null} /></td>
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
                            {s.status === 'Pendiente de Pago' && (
                              <button
                                onClick={() => handleApprovePayment(s.id)}
                                disabled={confirming === s.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                title="Aprobar Pago"
                              >
                                {confirming === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Aprobar Pago
                              </button>
                            )}
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
                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Duración (días)</label>
                                <input type="number" min={1} value={durationForm} onChange={e => setDurationForm(Number(e.target.value) || 1)} className="w-full px-3 py-2 rounded-lg bg-background text-sm border border-border" />
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
        {receiptModalOpen && (
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                onClick={closeReceiptModal}
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                aria-label="Cerrar modal de comprobante"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold">Previsualizar comprobante</p>
                    <p className="text-xs text-muted-foreground">Revisa el recibo sin exponer enlaces largos.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeReceiptModal}
                    className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition"
                    aria-label="Cerrar previsualización"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-[calc(100vh-8rem)] overflow-auto p-5">
                  {receiptModalLoading ? (
                    <div className="flex min-h-[240px] items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : receiptModalError ? (
                    <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
                      <p>{receiptModalError}</p>
                    </div>
                  ) : selectedReceiptUrl ? (
                    <div className="space-y-4">
                      <div className="rounded-3xl bg-black/5 p-4">
                        <ReceiptImageViewer
                          receiptUrl={selectedReceiptUrl}
                          altText="Comprobante de pago"
                          className="w-full max-h-[70vh] object-contain"
                        />
                      </div>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleDeleteReceipt}
                          disabled={deletingReceipt}
                          className="w-full rounded-xl px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/20 transition disabled:opacity-50"
                        >
                          {deletingReceipt ? 'Eliminando Comprobante...' : '🗑️ Eliminar comprobante'}
                        </button>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={closeReceiptModal}
                            className="rounded-xl px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-muted-foreground/20 bg-secondary/80 p-6 text-center text-sm text-muted-foreground">
                      No se encontró ningún comprobante disponible para esta suscripción.
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
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
