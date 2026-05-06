import { useState, memo } from 'react';
import { Pencil, Save, X, Loader2, Trash2, CheckCircle2, Bell } from 'lucide-react';
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
  notified_at?: string | null;
  credential_email: string | null;
  credential_password: string | null;
  profile_name: string | null;
  profile_pin: string | null;
  profile_phone?: string | null;
  client_label: string;
  order_id?: string | null;
}

interface Props {
  data: ServiceRowData;
  onChanged: () => void;
}

const statusVariant = (status?: string | null) => {
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

const statusLabel = (status?: string | null) => {
  switch (status) {
    case 'active': return 'Activo';
    case 'confirmed': return 'Confirmado';
    case 'expired': return 'Vencido';
    case 'pending_approval': return 'Pendiente de Pago';
    case 'procesando_credenciales': return 'Pend. Credenciales';
    default: return status || 'Desconocido';
  }
};

const ServiceRow = ({ data, onChanged }: Props) => {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<'save' | 'notify' | 'delete' | 'pay' | null>(null);
  const [form, setForm] = useState({
    credential_email: data.credential_email || '',
    profile_name: data.profile_name || '',
    profile_pin: data.profile_pin || '',
    credential_password: data.credential_password || '', // Para edición
    next_renewal: data.next_renewal ? data.next_renewal.slice(0, 10) : '',
  });

  // Calcular el estado del semáforo
  const trafficLightStatus = getTrafficLightStatus(data.next_renewal);
  const trafficLightColor = getTrafficLightColor(trafficLightStatus);
  const trafficLightInfo = getTrafficLightInfo(trafficLightStatus);
  const daysRemaining = getDaysUntilExpiry(data.next_renewal);

  const handleSave = async () => {
    setBusy('save');
    try {
      const payload: Record<string, string | null> = {
        credential_email: form.credential_email || null,
        profile_name: form.profile_name || null,
        profile_pin: form.profile_pin || null,
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

      toast.success('✅ Notificación creada y fecha de recordatorio actualizada');

      if (data.profile_phone) {
        const message = `Hola, tu servicio ${data.service_name} está por vencer. Ingresa aquí para renovarlo y no perder tu acceso.`;
        window.open(getWhatsAppUrl(message, data.profile_phone), '_blank');
      }

      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear notificación');
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

  return (
    <>
      <TableRow className="hover:bg-secondary/40 border-b border-border/40">
        <TableCell className="font-medium text-white text-sm">{data.client_label}</TableCell>
        <TableCell className="font-bold text-white text-sm">{data.service_name}</TableCell>
        <TableCell>
          <Badge variant={statusVariant(data.status)} className="text-xs uppercase">
            {statusLabel(data.status)}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {data.last_renewal ? new Date(data.last_renewal).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' }) : 'N/A'}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {data.next_renewal ? new Date(data.next_renewal).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' }) : 'N/A'}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {data.notified_at ? new Date(data.notified_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' }) : 'Nunca'}
        </TableCell>

        {/* SEMÁFORO - Traffic Light */}
        <TableCell>
          <div
            className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${trafficLightColor}`}
            title={trafficLightInfo.tooltip}
          >
            <span>{trafficLightInfo.icon}</span>
            <span>{trafficLightInfo.label}</span>
            {daysRemaining >= 0 && (
              <span className="text-xs opacity-80">({daysRemaining}d)</span>
            )}
          </div>
        </TableCell>

        {/* Contraseña */}
        <TableCell>
          <PasswordViewer password={data.credential_password} />
        </TableCell>

        {/* Acciones */}
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            {/* Botón Editar/Cancelar */}
            <button
              onClick={() => setEditing((v) => !v)}
              title={editing ? 'Cancelar edición' : 'Editar credenciales'}
              className="p-1 text-primary hover:bg-primary/10 rounded transition"
            >
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>

            {/* Botón Aprobar Pago - Solo si está pendiente */}
            {(data.status === 'pending_approval' || data.status === 'procesando_credenciales') && (
              <button
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

            {/* Botón Notificar Vencimiento - Solo si quedan 3 días o menos */}
            {daysRemaining <= 3 && daysRemaining >= 0 && (
              <button
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
          <TableCell colSpan={9} className="p-4">
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