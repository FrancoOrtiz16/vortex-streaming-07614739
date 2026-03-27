import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Clock, CheckCircle, RefreshCw, Key, Eye, EyeOff } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { products } from '@/data/products';
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

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: 'Pendiente', icon: Clock, className: 'text-amber-400' },
  completed: { label: 'Completado', icon: CheckCircle, className: 'text-emerald-400' },
  paid: { label: 'Pagado', icon: CheckCircle, className: 'text-primary' },
};

const ClientDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (user) {
      Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).order('next_renewal', { ascending: true }),
      ]).then(([ordersRes, subsRes]) => {
        setOrders((ordersRes.data as Order[]) || []);
        setSubs((subsRes.data as Subscription[]) || []);
        setLoading(false);
      });
    }
  }, [user, authLoading, navigate]);

  const handleRenew = (serviceName: string) => {
    const product = products.find(p => p.name.toLowerCase().includes(serviceName.toLowerCase()));
    if (product) {
      addItem(product);
      toast.success(`${product.name} añadido al carrito`);
      navigate('/cart');
    } else {
      toast.info('Producto no encontrado en el catálogo actual');
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
          <div className="text-muted-foreground text-sm">Cargando...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Inicio
          </Link>

          <h1 className="font-display font-bold text-2xl mb-1">Mi Panel</h1>
          <p className="text-sm text-muted-foreground mb-8">Servicios activos y pedidos.</p>

          {/* Mis Servicios */}
          <h2 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Mis Servicios
          </h2>
          <div className="space-y-3 mb-10">
            {subs.length === 0 ? (
              <div className="glass rounded-xl p-6 text-center text-muted-foreground text-sm">
                No tienes servicios activos aún.
              </div>
            ) : (
              subs.map((sub, i) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <span className="font-display font-semibold text-sm">{sub.service_name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Vence: {new Date(sub.next_renewal).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExpiryBadge nextRenewal={sub.next_renewal} />
                    </div>
                  </div>

                  {/* Mis Accesos */}
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                      <Key className="w-3.5 h-3.5" />
                      Mis Accesos
                    </div>
                    {sub.status === 'active' && sub.credential_email ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14">Email:</span>
                          <code className="text-xs bg-secondary px-2 py-1 rounded">{sub.credential_email}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14">Clave:</span>
                          <code className="text-xs bg-secondary px-2 py-1 rounded">
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
                      <p className="text-xs text-muted-foreground italic">
                        Tus credenciales aparecerán aquí al aprobarse el pago.
                      </p>
                    )}
                  </div>

                  {(sub.status === 'expired' || isExpiredOrSoon(sub.next_renewal)) && (
                    <button
                      onClick={() => handleRenew(sub.service_name)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-neon text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Renovar
                    </button>
                  )}
                </motion.div>
              ))
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
