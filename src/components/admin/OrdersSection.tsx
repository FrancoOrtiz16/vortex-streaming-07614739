import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle, Loader2, Clock, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExpiryBadge } from '@/components/ExpiryBadge';

export function OrdersSection() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, user_id, customer_email, product_name, total, status, created_at, updated_at, expiry_date')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const setCredField = (orderId: string, field: 'email' | 'password', value: string) => {
    setCredentials(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }));
  };

  const confirmOrder = async (order: any) => {
    setConfirming(order.id);
    try {
      const now = new Date();

      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 30);

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'procesando_credenciales',
          expiry_date: expiryDate.toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      if (order.user_id) {
        const subData: any = {
          user_id: order.user_id,
          service_name: order.product_name,
          status: 'procesando_credenciales',
          proxima_fecha: expiryDate.toISOString(),
        };

        await supabase.from('subscriptions').insert(subData);
      }

      toast.success('Pago aprobado — procesando credenciales');
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
        <div className="space-y-3">
          {orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-display font-semibold text-sm">{o.product_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {o.customer_email} · {o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-bold text-sm gold-text">${Number(o.total).toFixed(2)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400'
                    : o.status === 'procesando_credenciales' ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {o.status === 'completed' ? 'Completado' : o.status === 'procesando_credenciales' ? 'Procesando Credenciales' : 'Pendiente'}
                  </span>
                  {o.expiry_date && <ExpiryBadge nextRenewal={o.expiry_date} />}
                </div>
              </div>

              {o.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <button
                    onClick={() => confirmOrder(o)}
                    disabled={confirming === o.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                  >
                    {confirming === o.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Aprobar Pago
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
