import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type PaymentMethod = Tables<'payment_methods'>;

const methodTypes = ['Zelle', 'Binance', 'Pago Móvil', 'PayPal', 'Transferencia'];

export function PaymentsSection() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PaymentMethod> | null>(null);

  const fetchMethods = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, method_name, method_type, account_info, instructions, is_active, sort_order, created_at')
      .order('sort_order', { ascending: true });
    if (error) { toast.error('Error cargando métodos de pago'); return; }
    setMethods(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMethods(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.method_name || !editing.method_type || !editing.account_info) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

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
      if (error) { toast.error('Error actualizando'); return; }
    } else {
      const { error } = await supabase.from('payment_methods').insert({
        method_name: editing.method_name!,
        method_type: editing.method_type!,
        account_info: editing.account_info!,
        instructions: editing.instructions,
        is_active: editing.is_active ?? true,
        sort_order: methods.length,
      });
      if (error) { toast.error('Error creando método'); return; }
    }

    toast.success('Método de pago guardado');
    setEditing(null);
    fetchMethods();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) { toast.error('Error eliminando'); return; }
    toast.success('Método eliminado');
    fetchMethods();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Ajustes de Pago</h2>
        </div>
        <button
          onClick={() => setEditing({ method_name: '', method_type: 'Zelle', account_info: '', instructions: '', is_active: true })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo
        </button>
      </div>

      {editing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass rounded-xl p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">
              {editing.id ? 'Editar Método' : 'Nuevo Método de Pago'}
            </h3>
            <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                Datos de Cuenta (número, email, dirección)
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
                Instrucciones de Pago
              </label>
              <textarea
                value={editing.instructions || ''}
                onChange={e => setEditing(prev => ({ ...prev, instructions: e.target.value }))}
                rows={3}
                placeholder="Instrucciones que verá el cliente al momento de pagar..."
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar
          </button>
        </motion.div>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm">Cargando...</p>
        ) : methods.length === 0 ? (
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
              className="glass rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm">{m.method_name}</h3>
                <p className="text-xs text-muted-foreground">{m.method_type} · {m.account_info}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                m.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive'
              }`}>
                {m.is_active ? 'Activo' : 'Inactivo'}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing(m)}
                  className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
