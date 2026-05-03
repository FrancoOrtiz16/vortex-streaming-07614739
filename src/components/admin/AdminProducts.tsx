import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Plus, Pencil, Trash2,
  Image as ImageIcon, Save, X, RefreshCw
} from 'lucide-react';
import { products as initialProducts, Product } from '@/data/products';
import { toast } from 'sonner';
import { AdminSectionErrorBoundary } from './AdminSectionErrorBoundary';

function AdminProductsContent() {
  const [catalog, setCatalog] = useState<Product[]>(initialProducts);
  const [editing, setEditing] = useState<Product | null>(null);

  const handleDelete = useCallback((id: string) => {
    try {
      setCatalog(prev => prev.filter(p => p.id !== id));
      toast.success('Producto eliminado');
    } catch (err) {
      console.error('[AdminProducts] Delete error:', err);
      toast.error('Error al eliminar producto');
    }
  }, []);

  const handleSave = useCallback((product: Product) => {
    try {
      setCatalog(prev => {
        const exists = prev.find(p => p.id === product.id);
        if (exists) return prev.map(p => p.id === product.id ? product : p);
        return [...prev, { ...product, id: Date.now().toString() }];
      });
      setEditing(null);
      toast.success('Producto guardado');
    } catch (err) {
      console.error('[AdminProducts] Save error:', err);
      toast.error('Error al guardar producto');
    }
  }, []);

  const handleReset = useCallback(() => {
    try {
      setCatalog(initialProducts);
      setEditing(null);
      toast.success('Catálogo restablecido al valor por defecto');
    } catch (err) {
      console.error('[AdminProducts] Reset error:', err);
      toast.error('Error al restablecer catálogo');
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Catálogo de Productos ({catalog.length})</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Restablecer catálogo"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setEditing({ id: '', name: '', description: '', price: 0, category: 'streaming', image: '' })
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo
          </button>
        </div>
      </div>

      {editing && (
        <ProductForm product={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}

      <div className="space-y-2">
        {catalog.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="glass rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 border transition-all"
          >
            <img src={p.image} alt={p.name} className="w-14 h-10 rounded-lg object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm truncate">{p.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{p.category}</p>
            </div>
            <span className="font-display font-bold text-sm gold-text whitespace-nowrap">${p.price.toFixed(2)}</span>
            <div className="flex gap-1 shrink-0">
              <button 
                onClick={() => setEditing(p)} 
                className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors"
                title="Editar producto"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => handleDelete(p.id)} 
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Eliminar producto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {catalog.length === 0 && !editing && (
        <div className="glass rounded-xl p-8 text-center">
          <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm mb-4">No hay productos en el catálogo</p>
          <button
            onClick={() =>
              setEditing({ id: '', name: '', description: '', price: 0, category: 'streaming', image: '' })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar Producto
          </button>
        </div>
      )}
    </div>
  );
}

function ProductForm({
  product,
  onSave,
  onCancel,
}: {
  product: Product;
  onSave: (p: Product) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(product);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }
    const url = URL.createObjectURL(file);
    setForm(prev => ({ ...prev, image: url }));
    toast.info('Imagen cargada localmente.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="glass rounded-xl p-5 border border-primary/20"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm">
          {product.id ? 'Editar Producto' : 'Nuevo Producto'}
        </h3>
        <button onClick={onCancel} className="p-1 rounded-lg hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nombre del producto"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none"
          />
          <input
            type="number"
            placeholder="Precio"
            value={form.price}
            onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})}
            step="0.01"
            min="0"
            className="px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none"
          />
        </div>

        <textarea
          placeholder="Descripción"
          value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none resize-none"
          rows={2}
        />

        <select
          value={form.category}
          onChange={e => setForm({...form, category: e.target.value})}
          className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:border-primary focus:outline-none"
        >
          <option value="streaming">Streaming</option>
          <option value="vod">VOD</option>
          <option value="live">Live</option>
          <option value="otros">Otros</option>
        </select>

        <div className="border-2 border-dashed border-border rounded-lg p-4">
          <label className="flex flex-col items-center justify-center cursor-pointer">
            {form.image ? (
              <div className="text-center">
                <img src={form.image} alt="preview" className="w-20 h-20 object-cover rounded-lg mb-2" />
                <p className="text-xs text-muted-foreground">Toca para cambiar imagen</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sube una imagen</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onSave(form)}
            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function AdminProducts() {
  return (
    <AdminSectionErrorBoundary sectionName="Productos">
      <AdminProductsContent />
    </AdminSectionErrorBoundary>
  );
}
