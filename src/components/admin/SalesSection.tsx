import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Clock, TrendingUp, Package, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  status: string;
  created_at: string;
  proxima_fecha?: string;
}

interface ServicePrice {
  [key: string]: number;
}

export function SalesSection() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice>({});
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced');

  // Fetch initial data
  const fetchSubscriptionsAndPrices = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      const [{ data: subsData, error: subsError }, { data: servicesData, error: servicesError }] = await Promise.all([
        supabase.from('subscriptions').select('id, user_id, service_name, status, created_at, proxima_fecha').order('created_at', { ascending: false }),
        supabase.from('services').select('name, price'),
      ]);

      if (subsError) throw subsError;

      setSubscriptions((subsData as Subscription[]) || []);

      const prices: ServicePrice = {};
      (servicesData || []).forEach((s: any) => {
        prices[s.name.toLowerCase()] = s.price;
      });
      setServicePrices(prices);

      setSyncStatus('synced');
      setLoading(false);
    } catch (err) {
      console.error('[SalesSection] Fetch error:', err);
      toast.error('Error cargando métricas');
      setSyncStatus('error');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionsAndPrices();
  }, [fetchSubscriptionsAndPrices]);

  // Supabase Realtime subscription
  useEffect(() => {
    console.debug('[SalesSection] Setting up Realtime channel');
    
    const channel = supabase
      .channel('subscriptions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        (payload) => {
          console.debug('[SalesSection] Realtime event:', payload.eventType, payload.new);
          
          setSubscriptions(prev => {
            if (payload.eventType === 'INSERT') {
              return [payload.new as Subscription, ...prev];
            } else if (payload.eventType === 'UPDATE') {
              return prev.map(sub => 
                sub.id === (payload.new as Subscription).id 
                  ? (payload.new as Subscription)
                  : sub
              );
            } else if (payload.eventType === 'DELETE') {
              return prev.filter(sub => sub.id !== (payload.old as Subscription).id);
            }
            return prev;
          });

          setSyncStatus('updated');
          setTimeout(() => setSyncStatus('synced'), 1000);
        }
      )
      .subscribe((status) => {
        console.debug('[SalesSection] Realtime status:', status);
      });

    return () => {
      console.debug('[SalesSection] Cleaning up Realtime channel');
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate metrics
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());

  const monthlyRevenue = useMemo(() => {
    return subscriptions
      .filter(sub => new Date(sub.created_at) >= thisMonth)
      .reduce((sum, sub) => {
        const price = servicePrices[sub.service_name.toLowerCase()] || 0;
        return sum + price;
      }, 0);
  }, [subscriptions, servicePrices, thisMonth]);

  const pendingCount = useMemo(() => {
    return subscriptions.filter(sub => 
      sub.status === 'pending_approval' || sub.status === 'pending'
    ).length;
  }, [subscriptions]);

  const topService = useMemo(() => {
    if (subscriptions.length === 0) return '—';
    const counts: ServicePrice = {};
    subscriptions.forEach(sub => {
      counts[sub.service_name] = (counts[sub.service_name] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => 
      counts[a] > counts[b] ? a : b
    );
  }, [subscriptions]);

  // Weekly sales data
  const weeklyData = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const dayData: { [key: string]: number } = {};
    
    days.forEach((day, idx) => {
      const dayDate = new Date(thisWeekStart);
      dayDate.setDate(thisWeekStart.getDate() + idx);
      const dayStart = new Date(dayDate).setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayDate).setHours(23, 59, 59, 999);

      const daySales = subscriptions
        .filter(sub => {
          const subDate = new Date(sub.created_at).getTime();
          return subDate >= dayStart && subDate <= dayEnd;
        })
        .reduce((sum, sub) => {
          const price = servicePrices[sub.service_name.toLowerCase()] || 0;
          return sum + price;
        }, 0);

      dayData[day] = Math.round(daySales); 
    });

    return days.map(day => ({ day, ventas: dayData[day] }));
  }, [subscriptions, servicePrices, thisWeekStart]);

  const metrics = [
    { label: 'Ventas del Mes', value: `$${monthlyRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Pedidos Pendientes', value: pendingCount.toString(), icon: Clock, color: 'text-amber-400' },
    { label: 'Producto Top', value: topService, icon: TrendingUp, color: 'text-primary' },
    { label: 'Total Pedidos', value: subscriptions.length.toString(), icon: Package, color: 'text-purple-400' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Métricas de Negocio</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            syncStatus === 'synced' ? 'bg-emerald-400' :
            syncStatus === 'updated' ? 'bg-primary' :
            'bg-destructive'
          }`} />
          <span className="text-muted-foreground">
            {syncStatus === 'synced' && 'En sincronización'}
            {syncStatus === 'updated' && 'Actualizado'}
            {syncStatus === 'error' && 'Error'}
          </span>
        </div>
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
              className="glass rounded-xl p-5 relative overflow-hidden"
            >
              {/* Glow effect on update */}
              {syncStatus === 'updated' && (
                <motion.div
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-primary/20"
                />
              )}
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

      {/* Recent subscriptions table */}
      {subscriptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl overflow-hidden mt-6"
        >
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-sm">Suscripciones Recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Servicio</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Usuario</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">Precio</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Creado</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.slice(0, 10).map(sub => {
                  const price = servicePrices[sub.service_name.toLowerCase()] || 0;
                  const shortUserId = sub.user_id.slice(0, 8).toUpperCase();
                  return (
                    <tr key={sub.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{sub.service_name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{shortUserId}...</td>
                      <td className="px-4 py-2.5 text-right font-medium gold-text">${price.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sub.status === 'active' ? 'bg-emerald-500/20 text-emerald-400'
                          : sub.status === 'pending_approval' || sub.status === 'pending' ? 'bg-amber-500/20 text-amber-400'
                          : sub.status === 'expired' ? 'bg-destructive/20 text-destructive'
                          : 'bg-primary/20 text-primary'
                        }`}>
                          {sub.status === 'pending_approval' ? 'Pendiente' : sub.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
