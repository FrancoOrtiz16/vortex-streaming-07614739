import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Pencil, Trash2, Save, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/hooks/useServices';
import { toast } from 'sonner';

const emptyService: Omit<Service, 'id'> & { id?: string } = {
  name: '',
  description: '',
  price: 0,
  category: 'streaming',
  image_url: '',
  badge: null,
  plan_type: 'Premium Mensual',
  is_available: true,
  sort_order: 0,
};

export function InventorySection() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Omit<Service, 'id'> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('sort_order');
    setServices((data as Service[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        const { error } = await supabase
          .from('services')
          .update({
            name: editing.name,
            description: editing.description,
            price: editing.price,
            category: editing.category,
            image_url: editing.image_url,
            badge: editing.badge,
            plan_type: editing.plan_type,
            is_available: editing.is_available,
            sort_order: editing.sort_order,
          })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('services').insert({
          name: editing.name,
          description: editing.description,
          price: editing.price,
          category: editing.category,
          image_url: editing.image_url,
          badge: editing.badge,
          plan_type: editing.plan_type,
          is_available: editing.is_available,
          sort_order: editing.sort_order,
        });
        if (error) throw error;
      }
      toast.success('Servicio guardado');
      setEditing(null);
      fetchServices();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Servicio eliminado');
      fetchServices();
    }
  };

  const toggleAvailability = async (s: Service) => {
    await supabase.from('services').update({ is_available: !s.is_available }).eq('id', s.id);
    fetchServices();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Inventario ({services.length})</h2>
        </div>
        <button
          onClick={() => setEditing({ ...emptyService })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo Servicio
        </button>
      </div>

      {editing && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="glass rounded-xl p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">
              {editing.id ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h3>
            <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre</label>
              <input
                value={editing.name}
                onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Precio</label>
              <input
                type="number"
                step="0.01"
                value={editing.price}
                onChange={e => setEditing(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categoría</label>
              <select
                value={editing.category}
                onChange={e => setEditing(prev => prev ? { ...prev, category: e.target.value } : null)}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              >
                <option value="streaming">Streaming</option>
                <option value="gaming">Gaming</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo de Plan</label>
              <input
                value={editing.plan_type}
                onChange={e => setEditing(prev => prev ? { ...prev, plan_type: e.target.value } : null)}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">URL de Imagen</label>
              <input
                value={editing.image_url}
                onChange={e => setEditing(prev => prev ? { ...prev, image_url: e.target.value } : null)}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Badge (opcional)</label>
              <input
                value={editing.badge || ''}
                onChange={e => setEditing(prev => prev ? { ...prev, badge: e.target.value || null } : null)}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Popular, Nuevo, Oferta..."
              />
            </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div>
               <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descripción</label>
               <textarea
                 value={editing.description}
                 onChange={e => setEditing(prev => prev ? { ...prev, description: e.target.value } : null)}
                 rows={2}
                 className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
               />
             </div>
             <div>
               <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Orden de Prioridad</label>
               <input
                 type="number"
                 value={editing.sort_order}
                 onChange={e => setEditing(prev => prev ? { ...prev, sort_order: parseInt(e.target.value) || 0 } : null)}
                 className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                 placeholder="1 = primero"
               />
               <p className="text-[10px] text-muted-foreground mt-1">Menor número = aparece primero en el catálogo</p>
             </div>
           </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={editing.is_available}
                onChange={e => setEditing(prev => prev ? { ...prev, is_available: e.target.checked } : null)}
                className="rounded"
              />
              <span className="text-muted-foreground">Disponible</span>
            </label>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar
          </button>
        </motion.div>
      )}

      <div className="space-y-2">
        {services.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`glass rounded-xl p-4 flex items-center gap-4 ${!s.is_available ? 'opacity-50' : ''}`}
          >
            {s.image_url && (
              <img src={s.image_url} alt={s.name} className="w-10 h-10 rounded-lg object-contain bg-secondary p-1" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm truncate">{s.name}</h3>
             <p className="text-xs text-muted-foreground">{s.category} · {s.plan_type} · Orden: {s.sort_order}</p>
            </div>
            <span className="font-display font-bold text-sm gold-text">${s.price.toFixed(2)}</span>
            <div className="flex gap-1">
              <button onClick={() => toggleAvailability(s)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title={s.is_available ? 'Ocultar' : 'Mostrar'}>
                {s.is_available ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              <button onClick={() => setEditing(s)} className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
