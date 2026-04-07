import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Clock, CheckCircle, RefreshCw, Key, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionsByUserId, getSubscriptionCredentials } from '@/integrations/supabase/subscriptions-helpers';
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
  subscription_code?: string | null;
  profile_name?: string | null;
  profile_pin?: string | null;
}

interface DecryptedCreds {
  credential_email: string | null;
  credential_password: string | null;
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
  const [credentials, setCredentials] = useState<Record<string, DecryptedCreds>>({});
  const [loadingCreds, setLoadingCreds] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (user && user.id) {
      setLoading(true);
      console.debug('[ClientDashboard] Loading data for user:', user.id);

      Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        getSubscriptionsByUserId(user.id),
        supabase.from('services').select('*').eq('is_available', true),
      ])
        .then(([ordersRes, { data: subsData, error: subsError }, servicesRes]) => {
          // Handle orders
          setOrders((ordersRes.data as Order[]) || []);

          // Handle subscriptions with new wrapper
          if (subsError) {
            console.error('[ClientDashboard] Subscriptions query error:', subsError);
            toast.error('Error cargando suscripciones');
            setSubs([]);
          } else {
            setSubs((subsData as Subscription[]) || []);
          }

          // Handle services
          setServices((servicesRes.data as Service[]) || []);
          setLoading(false);

          // Fetch decrypted credentials for active subs
          const activeSubs = (subsData as Subscription[] || []).filter(s => s.status === 'active');
          if (activeSubs.length > 0) {
            setLoadingCreds(true);
            Promise.all(
              activeSubs.map(async (s) => {
                const { data: credData, error: credError } = await getSubscriptionCredentials(s.id);
                if (credError) {
                  console.error('[ClientDashboard] Credentials RPC error:', credError);
                  return { id: s.id, cred: { credential_email: null, credential_password: null } };
                }
                const cred = credData?.[0];
                return {
                  id: s.id,
                  cred: {
                    credential_email: cred?.credential_email || null,
                    credential_password: cred?.credential_password || null,
                  },
                };
              })
            ).then((results) => {
              const credsMap: Record<string, DecryptedCreds> = {};
              results.forEach(r => {
                credsMap[r.id] = r.cred;
              });
              setCredentials(credsMap);
              setLoadingCreds(false);
            });
          }
        })
        .catch((err) => {
          console.error('[ClientDashboard] Data loading error:', err);
          toast.error('Error cargando datos');
          setLoading(false);
        });
    }
  }, [user, authLoading, navigate]);

  const findService = (serviceName: string) => {
    return services.find(s => s.name.toLowerCase() === serviceName.toLowerCase()) 
      || services.find(s => serviceName.toLowerCase().includes(s.name.toLowerCase()));
  };

  const normalizeServicePrefix = (name: string) => {
    const cleaned = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return cleaned.length >= 4 ? cleaned.slice(0, 4) : cleaned.padEnd(4, 'X');
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'expired':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'pending_approval':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'pending':
        return 'bg-slate-700/40 text-slate-200 border-slate-700/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'expired':
        return 'Vencido';
      case 'pending_approval':
        return 'Pendiente';
      case 'pending':
        return 'En espera';
      default:
        return status;
    }
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

          {/* Historial de Suscripciones */}
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Historial de Suscripciones
          </h2>
          <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden">
            {subs.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                No tienes servicios activos aún.
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {subs.map((sub) => {
                  const service = findService(sub.service_name);
                  const code = sub.subscription_code || `VORTEX-${sub.id.slice(0, 8).toUpperCase()}`;
                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="px-4 py-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                    >
                      {/* Service Logo + Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {service?.image_url ? (
                            <img src={service.image_url} alt={service.name} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white text-sm">{sub.service_name}</div>
                          <div className="text-xs text-slate-400 truncate">{code}</div>
                        </div>
                      </div>

                      {/* Date + Status */}
                      <div className="flex items-center gap-3 flex-wrap justify-end">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Vencimiento</div>
                          <div className="text-sm font-medium text-white">{new Date(sub.next_renewal).toLocaleDateString()}</div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColor(sub.status)}`}>
                          {statusLabel(sub.status)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
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
