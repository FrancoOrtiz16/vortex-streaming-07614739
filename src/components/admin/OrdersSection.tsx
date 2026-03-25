import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function OrdersSection() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const confirmOrder = async (orderId: string) => {
    setConfirming(orderId);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          expiry_date: expiryDate.toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Pedido confirmado — vence en 30 días');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Error al confirmar');
    } finally {
      setConfirming(null);
    }
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
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-xl">Pedidos ({orders.length})</h2>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">Sin pedidos aún.</p>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Producto</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Cliente</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Total</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Estado</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Vencimiento</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/30"
                  >
                    <td className="px-4 py-3">{o.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.customer_email}</td>
                    <td className="px-4 py-3 text-right font-medium gold-text">${Number(o.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400'
                        : o.status === 'pending' ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-primary/20 text-primary'
                      }`}>
                        {o.status === 'completed' ? 'Completado' : o.status === 'pending' ? 'Pendiente' : o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {o.expiry_date ? new Date(o.expiry_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.status === 'pending' && (
                        <button
                          onClick={() => confirmOrder(o.id)}
                          disabled={confirming === o.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                        >
                          {confirming === o.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Confirmar
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
