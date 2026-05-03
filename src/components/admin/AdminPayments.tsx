import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Plus, Save, Trash2, X, Loader2, RefreshCw, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminSectionErrorBoundary } from './AdminSectionErrorBoundary';
import type { Tables } from '@/integrations/supabase/types';

type PaymentMethod = Tables<'payment_methods'>;

const methodTypes = ['Zelle', 'Binance', 'Pago Móvil', 'PayPal', 'Transferencia'];

function AdminPaymentsContent() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PaymentMethod> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMethods = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setMethods((data as any) || []);
    } catch (err) {
      console.error('[AdminPayments] Fetch error:', err);
      toast.error('Error cargando métodos de pago');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.method_name || !editing.method_type || !editing.account_info) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (editing.id) {
        const { error } = await supabase
          .from('payment_methods')
          .update({
            method_name: editing.method_name,
            method_type: editing.method_type,
            account_info: editing.account_info,
            instructions: editing.instructions,
            is_active: editing.is_active ?? true,
          })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_methods').insert({
          method_name: editing.method_name!,
          method_type: editing.method_type!,
          account_info: editing.account_info!,
          instructions: editing.instructions,
          is_active: editing.is_active ?? true,
          sort_order: methods.length,
        });
        if (error) throw error;
      }

      toast.success('Método de pago guardado');
      setEditing(null);
      await fetchMethods();
    } catch (err: any) {
      console.error('[AdminPayments] Save error:', err);
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id);
      if (error) throw error;
      toast.success('Método eliminado');
      await fetchMethods();
    } catch (err) {
      console.error('[AdminPayments] Delete error:', err);
      toast.error('Error eliminando');
    }
  };

  const toggleActive = async (method: PaymentMethod) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !method.is_active })
        .eq('id', method.id);
      if (error) throw error;
      await fetchMethods();
    } catch (err) {
      console.error('[AdminPayments] Toggle error:', err);
      toast.error('Error actualizando');
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Cargando métodos de pago...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Ajustes de Pago ({methods.length})</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchMethods()}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditing({ method_name: '', method_type: 'Zelle', account_info: '', instructions: '', is_active: true })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo
          </button>
        </div>
      </div>

      {editing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass rounded-xl p-5 border border-primary/20 space-y-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">
              {editing.id ? 'Editar Método' : 'Nuevo Método de Pago'}
            </h3>
            <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre</label>
              <input
                value={editing.method_name || ''}
                onChange={e => setEditing(prev => ({ ...prev, method_name: e.target.value }))}
                placeholder="Ej: Zelle Principal"
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
              <select
                value={editing.method_type || 'Zelle'}
                onChange={e => setEditing(prev => ({ ...prev, method_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              >
                {methodTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Datos de Cuenta
              </label>
              <input
                value={editing.account_info || ''}
                onChange={e => setEditing(prev => ({ ...prev, account_info: e.target.value }))}
                placeholder="correo@zelle.com o número de cuenta"
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Instrucciones de Pago (opcional)
              </label>
              <textarea
                value={editing.instructions || ''}
                onChange={e => setEditing(prev => ({ ...prev, instructions: e.target.value }))}
                rows={3}
                placeholder="Instrucciones que verá el cliente..."
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex-1 py-2 rounded-xl border border-border hover:bg-secondary text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {methods.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
            No hay métodos de pago configurados
          </div>
        ) : (
          methods.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 border transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm">{m.method_name}</h3>
                <p className="text-xs text-muted-foreground truncate">{m.method_type} · {m.account_info}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                m.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive'
              }`}>
                {m.is_active ? 'Activo' : 'Inactivo'}
              </span>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(m)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  title="Alternar actividad"
                >
                  {m.is_active ? (
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => setEditing(m)}
                  className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export function AdminPayments() {
  return (
    <AdminSectionErrorBoundary sectionName="Pagos">
      <AdminPaymentsContent />
    </AdminSectionErrorBoundary>
  );
}
