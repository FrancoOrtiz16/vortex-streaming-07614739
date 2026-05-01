import { useState, memo } from 'react';
import { Pencil, Save, X, Loader2, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExpiryBadge } from '@/components/ExpiryBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { approvePayment } from '@/services/orderService';

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
  profile_name: string | null;
  profile_pin: string | null;
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
    case 'pending_approval': return 'Pendiente';
    case 'procesando_credenciales': return 'Pend. Credenciales';
    default: return status || 'Desconocido';
  }
};

const ServiceRow = ({ data, onChanged }: Props) => {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<'save' | 'confirm' | 'delete' | 'pay' | null>(null);
  const [form, setForm] = useState({
    credential_email: data.credential_email || '',
    credential_password: '',
    profile_name: data.profile_name || '',
    profile_pin: data.profile_pin || '',
    next_renewal: data.next_renewal ? data.next_renewal.slice(0, 10) : '',
  });

  const handleSave = async () => {
    setBusy('save');
    try {
      const payload: Record<string, string | null> = {
        credential_email: form.credential_email || null,
        profile_name: form.profile_name || null,
        profile_pin: form.profile_pin || null,
      };
      if (form.credential_password) payload.credential_password = form.credential_password;
      if (form.next_renewal) payload.next_renewal = new Date(form.next_renewal).toISOString();
      const { error } = await supabase.from('subscriptions').update(payload).eq('id', data.id);
      if (error) throw error;
      toast.success('Credenciales actualizadas');
      setEditing(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar');
    } finally {
      setBusy(null);
    }
  };

  const handleConfirm = async () => {
    setBusy('confirm');
    try {
      const { error } = await supabase.from('subscriptions').update({ status: 'active' }).eq('id', data.id);
      if (error) throw error;
      toast.success('Suscripción activada');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al confirmar');
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
      toast.success('Eliminada');
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar');
    } finally {
      setBusy(null);
    }
  };

  const handleApprovePayment = async () => {
    if (!data.order_id) return;
    setBusy('pay');
    const res = await approvePayment(data.order_id);
    setBusy(null);
    if (res.ok) {
      toast.success('Pago aprobado');
      onChanged();
    } else {
      toast.error(res.error || 'Error');
    }
  };

  return (
    <>
      <TableRow className="hover:bg-secondary/40 border-b border-border/40">
        <TableCell className="font-medium text-white">{data.client_label}</TableCell>
        <TableCell className="font-bold text-white">{data.service_name}</TableCell>
        <TableCell>
          <Badge variant={statusVariant(data.status)} className="text-xs uppercase">
            {statusLabel(data.status)}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {data.last_renewal ? new Date(data.last_renewal).toLocaleDateString() : 'N/A'}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {data.next_renewal ? new Date(data.next_renewal).toLocaleDateString() : 'N/A'}
        </TableCell>
        <TableCell>
          <ExpiryBadge nextRenewal={data.next_renewal || ''} />
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <button onClick={() => setEditing((v) => !v)} title={editing ? 'Cancelar' : 'Editar'}
              className="p-1 text-primary hover:bg-primary/10 rounded">
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
            {data.order_id && (
              <button onClick={handleApprovePayment} disabled={busy === 'pay'} title="Aprobar pago"
                className="p-1 text-blue-400 hover:bg-blue-500/10 rounded disabled:opacity-50">
                {busy === 'pay' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              </button>
            )}
            {(data.status === 'pending_approval' || data.status === 'procesando_credenciales') && (
              <button onClick={handleConfirm} disabled={busy === 'confirm'} title="Activar"
                className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded disabled:opacity-50">
                {busy === 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            )}
            <button onClick={handleDelete} disabled={busy === 'delete'} title="Eliminar"
              className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-50">
              {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </TableCell>
      </TableRow>
      {editing && (
        <TableRow className="bg-secondary/20">
          <TableCell colSpan={7} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="email" placeholder="Correo cuenta" value={form.credential_email}
                onChange={(e) => setForm({ ...form, credential_email: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input type="password" placeholder="Nueva contraseña" value={form.credential_password}
                onChange={(e) => setForm({ ...form, credential_password: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input type="text" placeholder="Perfil" value={form.profile_name}
                onChange={(e) => setForm({ ...form, profile_name: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input type="text" placeholder="PIN" value={form.profile_pin}
                onChange={(e) => setForm({ ...form, profile_pin: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input type="date" value={form.next_renewal}
                onChange={(e) => setForm({ ...form, next_renewal: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSave} disabled={busy === 'save'}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </button>
              <button onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm">
                Cancelar
              </button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default memo(ServiceRow);