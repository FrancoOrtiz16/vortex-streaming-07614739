import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Plus, Pencil, Trash2,
  Image as ImageIcon, Save, X
} from 'lucide-react';
import { products as initialProducts, Product } from '@/data/products';
import { toast } from 'sonner';

export function ProductsSection() {
  const [catalog, setCatalog] = useState<Product[]>(initialProducts);
  const [editing, setEditing] = useState<Product | null>(null);

  const handleDelete = (id: string) => {
    setCatalog(prev => prev.filter(p => p.id !== id));
    toast.success('Producto eliminado');
  };

  const handleSave = (product: Product) => {
    setCatalog(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.map(p => p.id === product.id ? product : p);
      return [...prev, { ...product, id: Date.now().toString() }];
    });
    setEditing(null);
    toast.success('Producto guardado');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Catálogo ({catalog.length})</h2>
        </div>
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
            className="glass rounded-xl p-4 flex items-center gap-4"
          >
            <img src={p.image} alt={p.name} className="w-14 h-10 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-sm truncate">{p.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{p.category}</p>
            </div>
            <span className="font-display font-bold text-sm gold-text">${p.price.toFixed(2)}</span>
            <div className="flex gap-1">
              <button onClick={() => setEditing(p)} className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
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
    const url = URL.createObjectURL(file);
    setForm(prev => ({ ...prev, image: url }));
    toast.info('Imagen cargada localmente.');
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="glass rounded-xl p-5 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm">
          {product.id ? 'Editar Producto' : 'Nuevo Producto'}
        </h3>
        <button onClick={onCancel} className="p-1 rounded-lg hover:bg-secondary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre</label>
          <input
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Precio</label>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={e => setForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categoría</label>
          <select
            value={form.category}
            onChange={e => setForm(prev => ({ ...prev, category: e.target.value as 'streaming' | 'gaming' }))}
            className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="streaming">Streaming</option>
            <option value="gaming">Gaming</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Imagen</label>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-sm cursor-pointer hover:border-primary transition-colors">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Subir imagen</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descripción</label>
        <textarea
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
        />
      </div>

      {form.image && (
        <div className="mb-4">
          <img src={form.image} alt="Preview" className="w-24 h-18 rounded-lg object-cover" />
        </div>
      )}

      <button
        onClick={() => onSave(form)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        <Save className="w-3.5 h-3.5" />
        Guardar
      </button>
    </motion.div>
  );
}
