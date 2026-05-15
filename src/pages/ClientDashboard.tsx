import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Clock, CheckCircle, RefreshCw, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CredentialService from '@/components/services/CredentialService';
import { supabase } from '@/integrations/supabase/client';
import { getUserSubscriptions } from '@/integrations/supabase/subscriptions-helpers';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ExpiryBadge } from '@/components/ExpiryBadge';
import { useCart } from '@/hooks/useCart';
import { CartProduct } from '@/store/cartStore';
import { getDaysUntilExpiry } from '@/lib/trafficLightUtils';

interface Subscription {
  id: string;
  service_name: string;
  status: string;
  next_renewal?: string;
  credential_email?: string | null;
  credential_password?: string | null;
  profile_name?: string | null;
  profile_pin?: string | null;
  created_at: string;
}

interface Order {
  id: string;
  product_name: string;
  status: string;
  total: number;
  created_at: string;
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
  approved: { label: 'Aprobado', icon: CheckCircle, className: 'text-emerald-400' },
  'Aprobado/Confirmado': { label: 'Aprobado', icon: CheckCircle, className: 'text-emerald-400' },
};

const ClientDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const { addItem } = useCart();

  const [renewing, setRenewing] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id || !isMountedRef.current) return;

    setLoading(true);
    // CORRECCIÓN 1: Timeout AGRESIVO de 2 segundos en lugar de 8 para NO bloquear la UI
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        console.warn('[ClientDashboard] ⚠️ TIMEOUT DE SEGURIDAD: Forzando renderizado después de 2s');
        setLoading(false);
      }
    }, 2000);
    console.debug('[ClientDashboard] Loading data for user:', user.id);

    try {
      // CORRECCIÓN 2: LIMPIEZA QUIRÚRGICA - Eliminar lectura de tabla 'services'
      // Solo obtener subscriptions y orders con campos vigentes del esquema.
      const [{ data: subsData, error: subsError }, ordersRes] = await Promise.all([
        getUserSubscriptions(user.id),
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

      // NO cargar services - se carga desde StandaloneCatalog que maneja mejor los errores
      setOrders((ordersRes.data as Order[]) || []);

      if (isMountedRef.current) clearTimeout(timeoutId);
      
      // Las credenciales se cargan bajo demanda desde CredentialService para no bloquear el dashboard.
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
  }, [user?.id]);

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
  }, [user, authLoading, navigate, loadDashboardData]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`orders-user-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.debug('[ClientDashboard] Realtime order insert:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.debug('[ClientDashboard] Realtime order update:', payload);
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.debug('[ClientDashboard] Realtime subscription change:', payload);
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadDashboardData]);

  useEffect(() => {
    const loadPhone = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase.from('profiles').select('phone, profile_phone').eq('user_id', user.id).limit(1).single();
        const phone = data && (data.phone || data.profile_phone) ? (data.phone || data.profile_phone) : null;
        setProfilePhone(phone);
      } catch (err) {
        console.warn('[ClientDashboard] Error fetching profile phone', err);
        setProfilePhone(null);
      }
    };
    loadPhone();
  }, [user?.id]);

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

  const fetchServiceByName = async (serviceName: string): Promise<Service | null> => {
    if (!serviceName) return null;

    const normalizedName = serviceName.trim();
    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, image_url, plan_type, is_available')
      .ilike('name', `%${normalizedName}%`)
      .limit(1);

    if (error) {
      console.error('[ClientDashboard] fetchServiceByName error:', error);
      return null;
    }

    const serviceRow = (data as any[])[0];
    if (!serviceRow) return null;

    return {
      id: serviceRow.id,
      name: serviceRow.name,
      price: Number(serviceRow.price ?? 0),
      image_url: serviceRow.image_url ?? '/logo192.png',
      plan_type: serviceRow.plan_type,
      is_available: serviceRow.is_available,
    };
  };

  const handleRenew = async (sub: Subscription) => {
    if (!user) return;
    const uniqueServiceId = `VORTEX-${sub.id.slice(0, 8).toUpperCase()}`;
    setRenewing(sub.id);

    try {
      const service = await fetchServiceByName(sub.service_name);
      if (!service) {
        toast.error(`No se encontró el servicio '${sub.service_name}' en el catálogo.`);
        return;
      }

      if (!service.price || service.price <= 0) {
        toast.error(`El servicio '${service.name}' no tiene un precio definido en el catálogo.`);
        return;
      }

      const renewalProduct: CartProduct = {
        id: `renewal-${sub.id}`,
        name: service.name,
        description: `Renovación de servicio ${service.name} (${uniqueServiceId})`,
        price: service.price,
        category: 'renewal',
        image: service.image_url || '/logo192.png',
        badge: 'Renovación',
        renewal: true,
        subscription_id: sub.id,
        unique_service_id: uniqueServiceId,
        renewal_note: `Renovando servicio: ${uniqueServiceId}`,
        expires_at: sub.next_renewal,
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
    const daysLeft = getDaysUntilExpiry(nextRenewal);
    return daysLeft <= 3;
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

          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="font-display font-bold text-2xl">Mi Panel</h1>
            {user && profilePhone && (
              <div className="flex items-center gap-1 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="uppercase text-xs">Verificado</span>
              </div>
            )}
            {user && !profilePhone && (
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span className="uppercase text-xs">Añade WhatsApp</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {user && (
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
              >
                {profilePhone ? 'Editar WhatsApp' : 'Añadir WhatsApp'}
              </button>
            )}
          </div>
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
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}</p>
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
                      <ExpiryBadge nextRenewal={sub.status === 'active' || sub.status === 'confirmed' ? sub.next_renewal : null} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColor(sub?.status)}`}>
                          {statusLabel(sub?.status)}
                        </span>
                      </div>
                       <div className="flex gap-2">
                        {sub?.id && (
                          <CredentialService
                            subscriptionId={sub?.id}
                            serviceName={sub?.service_name}
                            triggerLabel="🔑 Credenciales"
                            variant="button"
                          />
                        )}
                        {sub?.id && (
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
