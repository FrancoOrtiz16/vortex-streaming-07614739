import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Clock, TrendingUp, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function SalesSection() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const topCategory = orders.length > 0 ? 'Streaming' : '—';

  // Mock weekly data (replace with real aggregation)
  const weeklyData = [
    { day: 'Lun', ventas: 45 },
    { day: 'Mar', ventas: 62 },
    { day: 'Mié', ventas: 38 },
    { day: 'Jue', ventas: 71 },
    { day: 'Vie', ventas: 55 },
    { day: 'Sáb', ventas: 89 },
    { day: 'Dom', ventas: 43 },
  ];

  const metrics = [
    { label: 'Ventas del Mes', value: `$${totalSales.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Pedidos Pendientes', value: pendingOrders.toString(), icon: Clock, color: 'text-amber-400' },
    { label: 'Producto Top', value: topCategory, icon: TrendingUp, color: 'text-primary' },
    { label: 'Total Pedidos', value: orders.length.toString(), icon: Package, color: 'text-purple-400' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-xl">Métricas de Negocio</h2>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
                <Icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <p className={`font-display font-bold text-2xl ${m.color}`}>{m.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-xl p-6"
      >
        <h3 className="font-display font-semibold text-sm mb-4">Tendencia de Ventas — Última Semana</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(220, 15%, 20%, 0.5)" />
            <XAxis dataKey="day" stroke="hsl(220, 10%, 55%)" fontSize={12} />
            <YAxis stroke="hsl(220, 10%, 55%)" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(220, 18%, 12%)',
                border: '1px solid hsl(220, 15%, 22%)',
                borderRadius: '0.75rem',
                color: 'hsl(220, 10%, 92%)',
              }}
            />
            <Bar dataKey="ventas" fill="hsl(210, 100%, 55%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent orders table */}
      {orders.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl overflow-hidden mt-6"
        >
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-sm">Pedidos Recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Producto</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Cliente</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">Total</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map(o => (
                  <tr key={o.id} className="border-b border-border/30">
                    <td className="px-4 py-2.5">{o.product_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{o.customer_email}</td>
                    <td className="px-4 py-2.5 text-right font-medium gold-text">${Number(o.total).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400'
                        : o.status === 'pending' ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-primary/20 text-primary'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
