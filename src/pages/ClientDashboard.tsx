import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Clock, CheckCircle, RefreshCw, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CredentialKeyModal from '@/components/CredentialKeyModal';
import CredentialService from '@/components/services/CredentialService';
import { supabase } from '@/integrations/supabase/client';
import { getUserSubscriptions, getSubscriptionCredentials } from '@/integrations/supabase/subscriptions-helpers';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ExpiryBadge } from '@/components/ExpiryBadge';
import { useCart } from '@/hooks/useCart';
import { CartProduct } from '@/store/cartStore';

interface Subscription {
  id: string;
  service_name: string;
  status: string;
  proxima_fecha?: string;
  email_cuenta?: string | null;
  password_cuenta?: string | null;
  perfil?: string | null;
  pin?: string | null;
  created_at: string;
}

interface Order {
  id: string;
  product_name: string;
  status: string;
  total: number;
  created_at: string;
}

interface DecryptedCreds {
  email_cuenta: string | null;
  password_cuenta: string | null;
  perfil: string | null;
  pin: string | null;
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
  procesando_credenciales: { label: 'Pendiente de Credenciales', icon: Clock, className: 'text-blue-400' },
  confirmed: { label: 'Confirmado', icon: CheckCircle, className: 'text-emerald-400' },
};

const ClientDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const { addItem } = useCart();

  const [renewing, setRenewing] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, DecryptedCreds>>({});
  const [loadingCreds, setLoadingCreds] = useState(false);

  const loadDashboardData = async () => {
    if (!user?.id || !isMountedRef.current) return;

    setLoading(true);
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) setLoading(false);
    }, 8000);
    console.debug('[ClientDashboard] Loading data for user:', user.id);

    try {
      const [{ data: subsData, error: subsError }, servicesRes, ordersRes] = await Promise.all([
        getUserSubscriptions(user.id),
        supabase.from('services').select('id, name, price, image_url, plan_type, is_available').eq('is_available', true),
        supabase.from('orders').select('id, product_name, status, total, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (!isMountedRef.current) return;

      if (subsError) {
        console.error('[ClientDashboard] Subscriptions query error:', subsError);
        if (!(subsError?.status === 400 || subsError?.code === 400 || subsError?.code === 'PGRST204')) {
          toast.error('Error cargando suscripciones');
        }
        setSubs([]);
      } else {
        setSubs((subsData as Subscription[]) || []);
      }

      setServices((servicesRes.data as Service[]) || []);
      setOrders((ordersRes.data as Order[]) || []);

      if (isMountedRef.current) clearTimeout(timeoutId);
      
      const confirmedSubs = (subsData as Subscription[] || []).filter(s => s?.status === 'confirmed');
      if (confirmedSubs.length > 0) {
        setLoadingCreds(true);
        const results = await Promise.all(
          confirmedSubs.map(async (s) => {
            const { data: credData, error: credError } = await getSubscriptionCredentials(s.id);
            if (credError) {
              console.error('[ClientDashboard] Credentials RPC error:', credError);
              return { id: s.id, cred: { email_cuenta: null, password_cuenta: null, perfil: null, pin: null } };
            }
            const cred = credData?.[0];
            return {
              id: s.id,
              cred: {
                email_cuenta: cred?.email_cuenta || null,
                password_cuenta: cred?.password_cuenta || null,
                perfil: cred?.perfil || null,
                pin: cred?.pin || null,
              },
            };
          })
        );

        if (!isMountedRef.current) return;

        const credsMap: Record<string, DecryptedCreds> = {};
        results.forEach(r => {
          credsMap[r.id] = r.cred;
        });
        setCredentials(credsMap);
        setLoadingCreds(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('[ClientDashboard] Data loading error:', err);
      toast.error('Error cargando datos');
    } finally {
      if (isMountedRef.current) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (user && user.id) {
      loadDashboardData();
      window.addEventListener('focus', loadDashboardData);
      return () => {
        isMountedRef.current = false;
        window.removeEventListener('focus', loadDashboardData);
      };
    }

    return () => {
      isMountedRef.current = false;
    };
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
      case 'procesando_credenciales':
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
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
      case 'procesando_credenciales':
        return 'Pendiente de Credenciales';
      case 'confirmed':
        return 'Confirmado';
      default:
        return status;
    }
  };


  const handleRenew = async (sub: Subscription) => {
    if (!user) return;
    const service = findService(sub.service_name);
    const price = service?.price || 0;
    const uniqueServiceId = `VORTEX-${sub.id.slice(0, 8).toUpperCase()}`;

    setRenewing(sub.id);
    try {
      const renewalProduct: CartProduct = {
        id: `renewal-${sub.id}`,
        name: sub.service_name,
        description: `Renovación de servicio ${uniqueServiceId}`,
        price,
        category: 'renewal',
        image: service?.image_url || '/logo192.png',
        badge: 'Renovación',
        renewal: true,
        subscription_id: sub.id,
        unique_service_id: uniqueServiceId,
        renewal_note: `Renovando servicio: ${uniqueServiceId}`,
        expires_at: sub.proxima_fecha,
      };

      addItem(renewalProduct);
      toast.success('Servicio añadido al carrito para renovación.');
      navigate('/cart');
    } catch (err: any) {
      console.error('[ClientDashboard] Renew to cart error:', err);
      toast.error(err.message || 'Error agregando renovación al carrito');
    } finally {
      setRenewing(null);
    }
  };



  const isExpiredOrSoon = (nextRenewal: string) => {
    const diff = new Date(nextRenewal).getTime() - Date.now();
    return diff <= 3 * 24 * 60 * 60 * 1000;
  };

  // Display each subscription individually
  const subscriptions = subs;

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
          <p className="text-sm text-muted-foreground mb-8">Servicios activos.</p>

          {/* Historial de Pedidos */}
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Historial de Pedidos
          </h2>
          <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden mb-8">
            {orders.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                No tienes pedidos aún.
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {orders?.map((order) => (
                  <div key={order.id} className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{order.product_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-sm gold-text">${Number(order.total).toFixed(2)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusConfig[order.status]?.className || 'text-muted-foreground'}`}>
                          {statusConfig[order.status]?.label || order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                {subscriptions?.filter(s => s?.id)?.map((sub) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-4 py-4 border-b border-white/5 last:border-b-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{sub?.service_name || 'Servicio'}</p>
                          <p className="text-xs text-muted-foreground">ID: VORTEX-{sub?.id?.slice(0, 8)?.toUpperCase() || 'N/A'}</p>
                        </div>
                      </div>
                      <ExpiryBadge nextRenewal={sub?.proxima_fecha || sub?.created_at || new Date().toISOString()} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColor(sub?.status)}`}>
                          {statusLabel(sub?.status)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {sub?.id && sub?.status === 'confirmed' && (
                          <CredentialService
                            subscriptionId={sub?.id}
                            serviceName={sub?.service_name}
                            triggerLabel="🔑 Credenciales"
                            variant="button"
                          />
                        )}
                        {sub?.proxima_fecha && isExpiredOrSoon(sub.proxima_fecha || sub.created_at) && (
                          <button
                            onClick={() => handleRenew(sub)}
                            disabled={renewing === sub?.id}
                            className="text-xs px-3 py-1 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors disabled:opacity-50"
                          >
                            {renewing === sub?.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Renovar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClientDashboard;
