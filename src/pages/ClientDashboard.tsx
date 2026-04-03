import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Clock, CheckCircle, RefreshCw, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ExpiryBadge } from '@/components/ExpiryBadge';

interface Order {
  id: string;
  product_name: string;
  created_at: string;
  status: string;
  total: number;
}

interface Subscription {
  id: string;
  service_name: string;
  status: string;
  last_renewal: string;
  next_renewal: string;
  credential_email?: string | null;
  credential_password?: string | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
  image_url: string;
  plan_type: string;
  is_available: boolean;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: 'Pendiente', icon: Clock, className: 'text-amber-400' },
  completed: { label: 'Completado', icon: CheckCircle, className: 'text-emerald-400' },
  paid: { label: 'Pagado', icon: CheckCircle, className: 'text-primary' },
};

const ClientDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [renewing, setRenewing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (user) {
      Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).order('next_renewal', { ascending: true }),
        supabase.from('services').select('*').eq('is_available', true),
      ]).then(([ordersRes, subsRes, servicesRes]) => {
        setOrders((ordersRes.data as Order[]) || []);
        setSubs((subsRes.data as Subscription[]) || []);
        setServices((servicesRes.data as Service[]) || []);
        setLoading(false);
      });
    }
  }, [user, authLoading, navigate]);

  const findService = (serviceName: string) => {
    return services.find(s => s.name.toLowerCase() === serviceName.toLowerCase()) 
      || services.find(s => serviceName.toLowerCase().includes(s.name.toLowerCase()));
  };

  const handleRenew = async (sub: Subscription) => {
    if (!user) return;
    const service = findService(sub.service_name);
    const price = service?.price || 0;

    setRenewing(sub.id);
    try {
      // Create a new order as pending
      const { error: orderErr } = await supabase.from('orders').insert({
        user_id: user.id,
        customer_email: user.email || '',
        product_name: sub.service_name,
        total: price,
        status: 'pending',
      });
      if (orderErr) throw orderErr;

      // Set subscription to pending_approval and create payment history
      const { data: historyData, error: historyErr } = await supabase
        .from('payment_history')
        .insert({
          subscription_id: sub.id,
          user_id: user.id,
          amount: price,
          status: 'pending_approval'
        }).select().single();
      if (historyErr) throw historyErr;

      const { error: subErr } = await supabase
        .from('subscriptions')
        .update({ status: 'pending_approval' })
        .eq('id', sub.id);
      if (subErr) throw subErr;

      toast.success('Solicitud de renovación creada. Completa el pago para activar.');
      navigate('/cart');
    } catch (err: any) {
      toast.error(err.message || 'Error al renovar');
    } finally {
      setRenewing(null);
    }
  };

  const isExpiredOrSoon = (nextRenewal: string) => {
    const diff = new Date(nextRenewal).getTime() - Date.now();
    return diff <= 3 * 24 * 60 * 60 * 1000;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Inicio
          </Link>

          <h1 className="font-display font-bold text-2xl mb-1">Mi Panel</h1>
          <p className="text-sm text-muted-foreground mb-8">Servicios activos y pedidos.</p>

          {/* Mis Servicios */}
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Mis Servicios
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {subs.length === 0 ? (
              <div className="sm:col-span-2 glass rounded-xl p-8 text-center text-muted-foreground text-sm">
                No tienes servicios activos aún.
              </div>
            ) : (
              subs.map((sub, i) => {
                const service = findService(sub.service_name);
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass rounded-2xl overflow-hidden flex flex-col"
                  >
                    {/* Service image */}
                    <div className="relative h-32 bg-secondary/50">
                      {service?.image_url ? (
                        <img src={service.image_url} alt={sub.service_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <ExpiryBadge nextRenewal={sub.next_renewal} />
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sub.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 backdrop-blur-sm'
                          : sub.status === 'pending' ? 'bg-amber-500/20 text-amber-400 backdrop-blur-sm'
                          : 'bg-destructive/20 text-destructive backdrop-blur-sm'
                        }`}>
                          {sub.status === 'active' ? 'Activo' : sub.status === 'pending' ? 'Pendiente' : 'Vencido'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-display font-semibold text-sm">{sub.service_name}</h3>
                        {service && (
                          <span className="font-display font-bold text-sm text-primary">${service.price.toFixed(2)}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-3">
                        Vence: {new Date(sub.next_renewal).toLocaleDateString()}
                        {service?.plan_type && ` · ${service.plan_type}`}
                      </p>

                      {/* Credenciales */}
                      <div className="mt-auto pt-3 border-t border-border/30">
                        <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                          <Key className="w-3.5 h-3.5" />
                          Mis Accesos
                        </div>
                        {sub.status === 'active' && sub.credential_email ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground w-12">Email:</span>
                              <code className="text-[11px] bg-secondary px-2 py-1 rounded flex-1 truncate">{sub.credential_email}</code>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground w-12">Clave:</span>
                              <code className="text-[11px] bg-secondary px-2 py-1 rounded flex-1">
                                {showPassword[sub.id] ? sub.credential_password : '••••••••'}
                              </code>
                              <button
                                onClick={() => setShowPassword(prev => ({ ...prev, [sub.id]: !prev[sub.id] }))}
                                className="p-1 rounded hover:bg-secondary transition-colors"
                                aria-label={showPassword[sub.id] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                              >
                                {showPassword[sub.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">
                            {sub.status === 'pending' 
                            ? 'Renovación en proceso — tus credenciales se conservan.'
                              : 'Tus credenciales aparecerán aquí al aprobarse el pago.'}
                          </p>
                        )}
                      </div>

                      {(sub.status === 'expired' || isExpiredOrSoon(sub.next_renewal)) && sub.status !== 'pending' && (
                        <button
                          onClick={() => handleRenew(sub)}
                          disabled={renewing === sub.id}
                          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {renewing === sub.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Renovar Servicio
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Historial de Pedidos */}
          <h2 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Historial de Pedidos
          </h2>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="glass rounded-xl p-6 text-center text-muted-foreground text-sm">
                No tienes pedidos aún.
              </div>
            ) : (
              orders.map((order, i) => {
                const s = statusConfig[order.status] || statusConfig.pending;
                const Icon = s.icon;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="glass rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="font-display font-semibold text-sm">{order.product_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString()} · ${order.total}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${s.className}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {s.label}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClientDashboard;
