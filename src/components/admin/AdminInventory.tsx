import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Pencil, Trash2, Save, X, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/hooks/useServices';
import { toast } from 'sonner';
import { AdminSectionErrorBoundary } from './AdminSectionErrorBoundary';

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
  group_name: null,
  image_scale: 100,
};

function AdminInventoryContent() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Omit<Service, 'id'> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, price, category, image_url, badge, plan_type, is_available, sort_order, group_name, image_scale')
        .order('sort_order');
      if (error) throw error;
      setServices((data as Service[]) || []);
    } catch (err) {
      console.error('[AdminInventory] Fetch error:', err);
      toast.error('Error cargando servicios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (!editing.name || editing.price <= 0) {
        throw new Error('Nombre y precio son obligatorios');
      }

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
            group_name: editing.group_name || null,
            image_scale: editing.image_scale ?? 100,
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
          group_name: editing.group_name || null,
          image_scale: editing.image_scale ?? 100,
        });
        if (error) throw error;
      }
      toast.success('Servicio guardado');
      setEditing(null);
      await fetchServices();
    } catch (err: any) {
      console.error('[AdminInventory] Save error:', err);
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      toast.success('Servicio eliminado');
      await fetchServices();
    } catch (err) {
      console.error('[AdminInventory] Delete error:', err);
      toast.error('Error al eliminar');
    }
  };

  const toggleAvailability = async (s: Service) => {
    try {
      const { error } = await supabase.from('services').update({ is_available: !s.is_available }).eq('id', s.id);
      if (error) throw error;
      await fetchServices();
    } catch (err) {
      console.error('[AdminInventory] Toggle error:', err);
      toast.error('Error actualizando disponibilidad');
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Cargando servicios...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Inventario ({services.length})</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchServices()}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditing(emptyService)}
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
              {editing.id ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h3>
            <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre"
              value={editing.name}
              onChange={e => setEditing({...editing, name: e.target.value})}
              className="px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              placeholder="Precio"
              value={editing.price}
              onChange={e => setEditing({...editing, price: parseFloat(e.target.value) || 0})}
              className="px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none"
            />
          </div>

          <textarea
            placeholder="Descripción"
            value={editing.description}
            onChange={e => setEditing({...editing, description: e.target.value})}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none resize-none"
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={editing.category}
              onChange={e => setEditing({...editing, category: e.target.value})}
              className="px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none"
            >
              <option value="streaming">Streaming</option>
              <option value="vod">VOD</option>
              <option value="live">Live</option>
            </select>
            <select
              value={editing.plan_type || ''}
              onChange={e => setEditing({...editing, plan_type: e.target.value})}
              className="px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none"
            >
              <option value="Premium Mensual">Premium Mensual</option>
              <option value="Premium Anual">Premium Anual</option>
              <option value="Básico">Básico</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {services.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 border transition-all"
          >
            {s.image_url && <img src={s.image_url} alt={s.name} className="w-12 h-12 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm">{s.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>
            </div>
            <div className="text-right">
              <span className="font-display font-bold text-sm gold-text">${s.price.toFixed(2)}</span>
              <p className="text-xs text-muted-foreground capitalize">{s.category}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => toggleAvailability(s)}
                className="p-2 rounded-lg hover:bg-primary/20 transition-colors"
                title="Disponibilidad"
              >
                {s.is_available ? (
                  <Eye className="w-4 h-4 text-emerald-500" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              <button
                onClick={() => setEditing(s)}
                className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function AdminInventory() {
  return (
    <AdminSectionErrorBoundary sectionName="Inventario">
      <AdminInventoryContent />
    </AdminSectionErrorBoundary>
  );
}
