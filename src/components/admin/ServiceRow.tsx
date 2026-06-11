import { useState, memo, useEffect } from 'react';
import { Pencil, Save, X, Loader2, Trash2, CheckCircle2, Bell, Eye } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExpiryBadge } from '@/components/ExpiryBadge';
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

/**
 * ServiceRow — Fila independiente de servicio (Sandboxing).
 * Cada fila gestiona su propio estado de edición/confirmación/eliminación.
 * Si una fila falla, las demás siguen funcionando.
 */

export interface ServiceRowData {
  id: string;
  user_id: string;
  service_name: string;
  status: string | null;
  next_renewal: string | null;
  last_renewal: string | null;
  credential_email: string | null;
  credential_password: string | null;
  profile_name: string | null;
  profile_pin: string | null;
  subscription_code?: string | null;
  receipt_url?: string | null;
  phone?: string | null;
  profile_phone?: string | null;
  client_label: string;
  order_id?: string | null;
  product_type?: string;
}

interface Props {
  data: ServiceRowData;
  onChanged: () => void;
  highlight?: boolean;
  hasReceipt?: boolean;
  onOpenReceipt?: (subscriptionId?: string, userId?: string, label?: string) => void;
  onDeleteReceipt?: (subscriptionId?: string, userId?: string) => void;
}

const statusVariant = (status?: string | null, productType?: string) => {
  // Para gaming_recharge, usar variantes específicas
  if (productType === 'gaming_recharge') {
    switch (status) {
      case 'pending_delivery':
        return 'secondary' as const;
      case 'completed':
      case 'delivered':
        return 'default' as const;
      default:
        return 'outline' as const;
    }
  }

  // Para subscription, usar variantes estándar
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
    case 'pending_approval': return 'Pendiente de Pago';
    case 'procesando_credenciales': return 'Pend. Credenciales';
    default: return status || 'Desconocido';
  }
};

const ServiceRow = ({ data, onChanged, highlight = false, hasReceipt = false, onOpenReceipt }: Props) => {
  const EDIT_STATE_KEY = `admin_subscription_edit_${data.id}_v1`;
  const EDIT_FORM_KEY = `admin_subscription_form_${data.id}_v1`;

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
      profile_name: data.profile_name || '',
      profile_pin: data.profile_pin || '',
      subscription_code: data.subscription_code || '',
      credential_password: data.credential_password || '',
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

  // Cargar el estado de verificación del cliente
  // Calcular el estado del semáforo
  const isPendingApproval = data.status === 'pending_approval' || data.status === 'procesando_credenciales';
  const isGamingRecharge = data.product_type === 'gaming_recharge';
  
  // Para gaming: mostrar estado específico
  const trafficLightStatus = isPendingApproval 
    ? 'yellow' 
    : (isGamingRecharge ? (data.status === 'pending_delivery' ? 'yellow' : 'green') : getTrafficLightStatus(data.next_renewal));
  
  const trafficLightColor = isPendingApproval 
    ? 'bg-amber-500/20 text-amber-100' 
    : (isGamingRecharge && data.status === 'pending_delivery' ? 'bg-amber-500/20 text-amber-100' : getTrafficLightColor(trafficLightStatus));
  
  const trafficLightInfo = isPendingApproval
    ? { icon: '🟡', label: 'Pendiente', tooltip: 'Suscripción aguardando aprobación administrativa' }
    : (isGamingRecharge && data.status === 'pending_delivery' 
      ? { icon: '🟡', label: 'Pendiente', tooltip: 'Recarga pendiente por procesar' }
      : getTrafficLightInfo(trafficLightStatus));
  
  const daysRemaining = !isPendingApproval && !isGamingRecharge && data.next_renewal ? getDaysUntilExpiry(data.next_renewal) : null;

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
        profile_name: form.profile_name || null,
        profile_pin: form.profile_pin || null,
        subscription_code: form.subscription_code || null,
        credential_password: form.credential_password || null,
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

  /**
   * Aprobar pago: cambiar estado a 'active' y establecer próxima renovación
   */
  const handleApprovePendingPayment = async () => {
    setBusy('pay');
    try {
      const result = await approvePayment(data.id);
      if (!result.ok) {
        throw new Error(result.error || 'Error al aprobar pago');
      }
      toast.success('✅ Pago aprobado - Suscripción activada');
      setEditing(true); // Habilitar edición de credenciales
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
    if (!window.confirm('¿Eliminar esta suscripción? Esta acción no se puede deshacer.')) return;
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

  /**
   * Verificar/desverificar cliente
   */
  return (
    <>
      <TableRow className={`hover:bg-secondary/40 border-b border-border/40 transition-colors ${highlight ? 'animate-pulse bg-emerald-500/10' : ''}`}>
        <TableCell className="font-medium text-white text-sm">{data.client_label}</TableCell>
        <TableCell className="font-bold text-white text-sm">{data.service_name}</TableCell>
        <TableCell>
          <Badge variant={statusVariant(data.status, data.product_type)} className="text-xs uppercase">
            {statusLabel(data.status, data.product_type)}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {isGamingRecharge ? 'N/A' : (data.last_renewal ? new Date(data.last_renewal).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' }) : 'N/A')}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {isGamingRecharge ? 'N/A' : (data.next_renewal ? new Date(data.next_renewal).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' }) : 'N/A')}
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenReceipt?.(data.id, data.user_id, data.client_label)}
              disabled={!hasReceipt}
              title={hasReceipt ? 'Ver comprobante' : 'No hay comprobante disponible'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-sm transition hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteReceipt?.(data.id, data.user_id)}
              disabled={!hasReceipt}
              title={hasReceipt ? 'Eliminar vínculo de comprobante' : 'No hay comprobante disponible'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-destructive-400/20 bg-destructive-500/10 text-destructive-300 shadow-sm transition hover:bg-destructive-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </TableCell>

        {/* SEMÁFORO - Traffic Light */}
        <TableCell>
          <div
            className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${trafficLightColor}`}
            title={trafficLightInfo.tooltip}
          >
            <span>{trafficLightInfo.icon}</span>
            <span>{trafficLightInfo.label}</span>
            {daysRemaining !== null && (
              <span className="text-xs opacity-80">({daysRemaining}d)</span>
            )}
          </div>
        </TableCell>

        {/* VERIFICACIÓN - Admin Approval Status */}

        {/* Contraseña */}
        <TableCell>
          <PasswordViewer password={data.credential_password} />
        </TableCell>

        {/* Acciones */}
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            {/* Botón Editar/Cancelar */}
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              title={editing ? 'Cancelar edición' : 'Editar credenciales'}
              className="p-1 text-primary hover:bg-primary/10 rounded transition"
            >
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>

            {/* Botón Aprobar Pago - Solo si está pendiente (subscription) o pending_delivery (gaming) */}
            {((data.status === 'pending_approval' || data.status === 'procesando_credenciales' || data.status === 'pending_delivery') && !isGamingRecharge) && (
              <button
                type="button"
                onClick={handleApprovePendingPayment}
                disabled={busy === 'pay'}
                title="Aprobar pago y activar suscripción"
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition"
              >
                {busy === 'pay' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Aprobar
              </button>
            )}

            {/* Botón Marcar como Entregado - Solo si gaming_recharge está pendiente */}
            {isGamingRecharge && data.status === 'pending_delivery' && (
              <button
                type="button"
                onClick={async () => {
                  setBusy('pay');
                  try {
                    const { error } = await supabase
                      .from('subscriptions')
                      .update({ status: 'delivered' })
                      .eq('id', data.id);
                    if (error) throw error;
                    toast.success('✅ Recarga marcada como entregada');
                    onChanged();
                  } catch (err: any) {
                    toast.error(err?.message || 'Error al marcar como entregado');
                  } finally {
                    setBusy(null);
                  }
                }}
                disabled={busy === 'pay'}
                title="Marcar recarga como entregada"
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition"
              >
                {busy === 'pay' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Marcar Entregado
              </button>
            )}

            {/* Botón Notificar Vencimiento - Solo si quedan 3 días o menos (no para gaming) */}
            {!isGamingRecharge && daysRemaining <= 3 && daysRemaining >= 0 && (
              <button
                type="button"
                onClick={handleNotifyExpiration}
                disabled={busy === 'notify'}
                title="Notificar al cliente sobre el vencimiento"
                className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition"
              >
                {busy === 'notify' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                Notificar Vencimiento
              </button>
            )}

            {/* Botón Eliminar */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy === 'delete'}
              title="Eliminar suscripción"
              className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-50 transition"
            >
              {busy === 'delete' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </TableCell>
      </TableRow>

      {/* Fila de edición - Credenciales */}
      {editing && (
        <TableRow className="bg-secondary/20">
          <TableCell colSpan={8} className="p-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">
                Editar Credenciales y Fechas
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="email"
                  placeholder="Email/Usuario"
                  value={form.credential_email}
                  onChange={(e) =>
                    setForm({ ...form, credential_email: e.target.value })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={form.credential_password}
                  onChange={(e) =>
                    setForm({ ...form, credential_password: e.target.value })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Nombre de perfil"
                  value={form.profile_name}
                  onChange={(e) =>
                    setForm({ ...form, profile_name: e.target.value })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="ID-Externo"
                  value={form.subscription_code}
                  onChange={(e) => setForm({ ...form, subscription_code: e.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="PIN/Código"
                  value={form.profile_pin}
                  onChange={(e) => setForm({ ...form, profile_pin: e.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="date"
                  value={form.next_renewal}
                  onChange={(e) =>
                    setForm({ ...form, next_renewal: e.target.value })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 lg:col-span-4"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy === 'save'}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2 hover:bg-primary/90 transition"
                >
                  {busy === 'save' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default memo(ServiceRow);