import { useState, memo, useEffect } from 'react';
import { Pencil, Save, X, Loader2, Trash2, CheckCircle2, Bell, User, Package, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { approvePayment } from '@/services/orderService';
import PasswordViewer from './PasswordViewer';
import { createSubscriptionExpirationNotification } from '@/integrations/supabase/subscriptions-helpers';
import { getWhatsAppUrl } from '@/lib/whatsapp';
import {
  getTrafficLightStatus,
  getTrafficLightColor,
  getTrafficLightInfo,
  getDaysUntilExpiry,
  getVETDateInputISO,
} from '@/lib/trafficLightUtils';
import type { ServiceRowData } from './ServiceRow';

interface Props {
  data: ServiceRowData;
  onChanged: () => void;
  highlight?: boolean;
  hasReceipt?: boolean;
  onOpenReceipt?: (subscriptionId?: string, userId?: string, label?: string) => void;
  onDeleteReceipt?: (subscriptionId?: string, userId?: string) => void;
}

const statusLabel = (status?: string | null, productType?: string) => {
  // Para gaming_recharge, mostrar estados específicos
  if (productType === 'gaming_recharge') {
    switch (status) {
      case 'pending_delivery': return 'Pendiente por recargar';
      case 'completed': return 'Entregado / Completado';
      case 'delivered': return 'Entregado / Completado';
      default: return status || 'Desconocido';
    }
  }

  // Para subscription, mostrar estados estándar
  switch (status) {
    case 'active': return 'Activo';
    case 'confirmed': return 'Confirmado';
    case 'expired': return 'Vencido';
    case 'pending_approval': return 'Pendiente Pago';
    case 'procesando_credenciales': return 'Pend. Cred.';
    default: return status || 'Desconocido';
  }
};

const statusColor = (status?: string | null) => {
  switch (status) {
    case 'active':
    case 'confirmed':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'expired':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'pending_approval':
    case 'procesando_credenciales':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    default:
      return 'bg-white/10 text-slate-300 border-white/10';
  }
};

const MobileServiceCard = ({ data, onChanged, highlight = false, hasReceipt = false, onOpenReceipt }: Props) => {
  const EDIT_STATE_KEY = `admin_mobile_subscription_edit_${data.id}_v1`;
  const EDIT_FORM_KEY = `admin_mobile_subscription_form_${data.id}_v1`;

  const [editing, setEditing] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(EDIT_STATE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState<'save' | 'notify' | 'delete' | 'pay' | null>(null);
  const [form, setForm] = useState(() => {
    const base = {
      credential_email: data.credential_email || '',
      credential_password: data.credential_password || '',
      profile_name: data.profile_name || '',
      profile_pin: data.profile_pin || '',
      externalId: data.subscription_code || '',
      next_renewal: data.next_renewal ? data.next_renewal.slice(0, 10) : '',
    };

    if (typeof window === 'undefined') return base;

    try {
      const raw = window.sessionStorage.getItem(EDIT_FORM_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return { ...base, ...parsed };
    } catch {
      return base;
    }
  });

  const isPending = data.status === 'pending_approval' || data.status === 'procesando_credenciales';
  const tlStatus = isPending ? 'yellow' : getTrafficLightStatus(data.next_renewal);
  const tlColor = isPending ? 'bg-amber-500/20 text-amber-100' : getTrafficLightColor(tlStatus);
  const tlInfo = isPending
    ? { icon: '🟡', label: 'Pendiente', tooltip: 'Suscripción aguardando aprobación administrativa' }
    : getTrafficLightInfo(tlStatus);
  const daysRemaining = !isPending && data.next_renewal ? getDaysUntilExpiry(data.next_renewal) : null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(EDIT_STATE_KEY, String(editing));
      window.sessionStorage.setItem(EDIT_FORM_KEY, JSON.stringify(form));
    } catch {
      // ignore write failures
    }
  }, [editing, form, data.id]);

  const handleSave = async () => {
    setBusy('save');
    try {
      const payload: Record<string, string | null> = {
        credential_email: form.credential_email || null,
        credential_password: form.credential_password || null,
        profile_name: form.profile_name || null,
        profile_pin: form.profile_pin || null,
        subscription_code: form.externalId || null,
      };
      if (form.next_renewal) payload.next_renewal = getVETDateInputISO(form.next_renewal);
      const { error } = await supabase.from('subscriptions').update(payload).eq('id', data.id);
      if (error) throw error;
      toast.success('✅ Credenciales actualizadas');
      setEditing(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar');
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = async () => {
    setBusy('pay');
    try {
      const result = await approvePayment(data.id);
      if (!result.ok) throw new Error(result.error || 'Error al aprobar pago');
      toast.success('✅ Pago aprobado');
      setEditing(true);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al aprobar pago');
    } finally {
      setBusy(null);
    }
  };

  const handleNotifyExpiration = async () => {
    setBusy('notify');
    try {
      if (!data.user_id) {
        throw new Error('No se encontró el usuario asociado');
      }

      const result = await createSubscriptionExpirationNotification(
        data.user_id,
        data.id,
        data.service_name,
      );

      if (result.error) {
        throw result.error;
      }

      toast.success('✅ Enlace de WhatsApp generado');

      const waLink = result?.data?.wa_link;
      if (waLink) {
        window.open(waLink, '_blank');
      } else {
        const whatsappPhone = data.phone || data.profile_phone;
        const fallbackMessage = result?.data?.message || `Hola, tu servicio ${data.service_name} está por vencer. Ingresa aquí para renovarlo y no perder tu acceso.`;
        if (whatsappPhone) {
          window.open(getWhatsAppUrl(fallbackMessage, whatsappPhone), '_blank');
        }
      }

      onChanged();
    } catch (err: any) {
      const message = err?.message || err?.error || (typeof err === 'string' ? err : JSON.stringify(err ?? 'Error al crear notificación'));
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar esta suscripción?')) return;
    setBusy('delete');
    try {
      const { error } = await supabase.from('subscriptions').delete().eq('id', data.id);
      if (error) throw error;
      toast.success('✅ Suscripción eliminada');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4 space-y-2.5 sm:space-y-3 shadow-[0_0_15px_rgba(59,130,246,0.05)] transition-all ${highlight ? 'animate-pulse ring-2 ring-emerald-400/30' : ''}`}>
      {/* Header: Cliente + Servicio */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <User className="w-2.5 sm:w-3 h-2.5 sm:h-3 shrink-0" />
            <span className="truncate">{data.client_label}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 mt-1">
            <Package className="w-3 sm:w-4 h-3 sm:h-4 text-primary shrink-0" />
            <span className="font-bold text-white text-xs sm:text-sm truncate">{data.service_name}</span>
          </div>
        </div>
        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${statusColor(data.status)} shrink-0`}>
          {statusLabel(data.status, data.product_type)}
        </span>
      </div>

      {/* Semáforo + Próxima renovación */}
      <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs">
        <div className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-semibold ${tlColor}`}>
          <span className="text-sm sm:text-base">{tlInfo.icon}</span>
          <span className="truncate">{tlInfo.label}</span>
          {daysRemaining !== null && <span className="opacity-80">({daysRemaining}d)</span>}
        </div>
        <span className="text-muted-foreground whitespace-nowrap">
          {data.next_renewal ? new Date(data.next_renewal).toLocaleDateString('es-ES') : 'Sin fecha'}
        </span>
      </div>

      {/* Contraseña */}
      <div className="flex min-w-0 items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/5 border border-white/5">
        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Contraseña</span>
        <div className="min-w-0">
          <PasswordViewer password={data.credential_password} />
        </div>
      </div>

      {/* Acciones principales */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenReceipt?.(data.id, data.user_id, data.client_label)}
            disabled={!hasReceipt}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            {hasReceipt ? 'Ver comprobante' : 'Sin comprobante'}
          </button>
          <button
            type="button"
            onClick={() => onDeleteReceipt?.(data.id, data.user_id)}
            disabled={!hasReceipt}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-destructive-400/30 bg-destructive-500/10 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-destructive-300 transition hover:bg-destructive-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            {hasReceipt ? 'Eliminar' : 'No disponible'}
          </button>
        </div>
        {isPending && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={busy === 'pay'}
            className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition"
          >
            {busy === 'pay' ? <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" /> : <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            Aprobar Pago
          </button>
        )}
        {daysRemaining !== null && daysRemaining <= 3 && (
          <button
            type="button"
            onClick={handleNotifyExpiration}
            disabled={busy === 'notify'}
            className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition"
          >
            {busy === 'notify' ? <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" /> : <Bell className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            Notificar Vencimiento
          </button>
        )}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 text-xs sm:text-sm font-semibold transition"
          >
            {editing ? <X className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Pencil className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            {editing ? 'Cerrar' : 'Llave'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy === 'delete'}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/25 text-xs sm:text-sm font-semibold disabled:opacity-50 transition"
          >
            {busy === 'delete' ? <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" /> : <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            Eliminar
          </button>
        </div>
      </div>

      {/* Editor expandible */}
      {editing && (
        <div className="space-y-2 pt-2.5 sm:pt-3 border-t border-white/10\">
          <input
            type="email"
            placeholder="Email/Usuario"
            value={form.credential_email}
            onChange={(e) => setForm({ ...form, credential_email: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Contraseña"
            value={form.credential_password}
            onChange={(e) => setForm({ ...form, credential_password: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
            <input
              type="text"
              placeholder="Perfil"
              value={form.profile_name}
              onChange={(e) => setForm({ ...form, profile_name: e.target.value })}
              className="rounded-lg border border-border bg-background px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="ID-Externo"
              value={form.externalId}
              onChange={(e) => setForm({ ...form, externalId: e.target.value })}
              className="rounded-lg border border-border bg-background px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="PIN"
              value={form.profile_pin}
              onChange={(e) => setForm({ ...form, profile_pin: e.target.value })}
              className="sm:col-span-2 rounded-lg border border-border bg-background px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>
          <input
            type="date"
            value={form.next_renewal}
            onChange={(e) => setForm({ ...form, next_renewal: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={busy === 'save'}
            className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition"
          >
            {busy === 'save' ? <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" /> : <Save className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            Guardar Credenciales
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(MobileServiceCard);