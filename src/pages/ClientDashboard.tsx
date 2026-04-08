import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Clock, CheckCircle, RefreshCw, Key, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  last_renewal: string;
  next_renewal: string;
  profile_name?: string | null;
  profile_pin?: string | null;
  credential_email?: string | null;
  credential_password?: string | null;
  combo_id?: string | null;
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
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const { addItem } = useCart();

  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [renewing, setRenewing] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, DecryptedCreds>>({});
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  const loadDashboardData = async () => {
    if (!user?.id || !isMountedRef.current) return;

    setLoading(true);
    console.debug('[ClientDashboard] Loading data for user:', user.id);

    try {
      const [{ data: subsData, error: subsError }, servicesRes] = await Promise.all([
        getUserSubscriptions(user.id),
        supabase.from('services').select('*').eq('is_available', true),
      ]);

      if (!isMountedRef.current) return;

      if (subsError) {
        console.error('[ClientDashboard] Subscriptions query error:', subsError);
        toast.error('Error cargando suscripciones');
        setSubs([]);
      } else {
        setSubs((subsData as Subscription[]) || []);
      }

      setServices((servicesRes.data as Service[]) || []);

      const activeSubs = (subsData as Subscription[] || []).filter(s => s.status === 'active');
      if (activeSubs.length > 0) {
        setLoadingCreds(true);
        const results = await Promise.all(
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
      if (isMountedRef.current) setLoading(false);
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
    const diff = new Date(nextRenewal).getTime() - Date.now();
    return diff <= 3 * 24 * 60 * 60 * 1000;
  };

  // Group subscriptions by combo_id to display grouped services
  const groupedSubs = {
    combos: subs
      .filter(sub => sub.combo_id)
      .reduce((acc: Record<string, Subscription[]>, sub) => {
        const key = sub.combo_id!;
        if (!acc[key]) acc[key] = [];
        acc[key].push(sub);
        return acc;
      }, {}),
    individual: subs.filter(sub => !sub.combo_id),
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
          <p className="text-sm text-muted-foreground mb-8">Servicios activos.</p>

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
                {/* Combos grouped by combo_id */}
                {Object.entries(groupedSubs.combos).map(([comboId, comboSubs]) => (
                  <motion.div
                    key={comboId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <div className="px-4 py-3 bg-primary/5 border-b border-primary/10">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Combo • {comboSubs.length} servicio{comboSubs.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    {comboSubs.map((sub, idx) => (
                      <SubscriptionRow
                        key={sub.id}
                        sub={sub}
                        findService={findService}
                        onSelectCredentials={() => setSelectedSubscription(sub)}
                        onRenew={() => handleRenew(sub)}
                        isRenewing={renewing === sub.id}
                        statusColor={statusColor}
                        statusLabel={statusLabel}
                        isLast={idx === comboSubs.length - 1 && Object.keys(groupedSubs.combos).length === Object.keys(groupedSubs.combos).length - 1 && groupedSubs.individual.length === 0}
                      />
                    ))}
                  </motion.div>
                ))}

                {/* Individual services */}
                {groupedSubs.individual.map((sub) => (
                  <SubscriptionRow
                    key={sub.id}
                    sub={sub}
                    findService={findService}
                    onSelectCredentials={() => setSelectedSubscription(sub)}
                    onRenew={() => handleRenew(sub)}
                    isRenewing={renewing === sub.id}
                    statusColor={statusColor}
                    statusLabel={statusLabel}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
      <Dialog open={!!selectedSubscription} onOpenChange={(open) => { if (!open) setSelectedSubscription(null); }}>
        <DialogContent className="glass border-border sm:rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Credenciales de {selectedSubscription?.service_name || 'servicio'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Aquí están los datos guardados para este servicio.
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Correo</p>
                <p className="rounded-xl bg-secondary/60 p-3 text-sm text-white break-all">{selectedSubscription.credential_email || 'No hay correo guardado'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Contraseña</p>
                <p className="rounded-xl bg-secondary/60 p-3 text-sm text-white break-all">{selectedSubscription.credential_password || 'No hay contraseña guardada'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Perfil</p>
                <p className="rounded-xl bg-secondary/60 p-3 text-sm text-white break-all">{selectedSubscription.profile_name || 'No hay perfil asignado'}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Subscription Row Component for displaying individual or grouped services
function SubscriptionRow({
  sub,
  findService,
  onSelectCredentials,
  onRenew,
  isRenewing,
  statusColor,
  statusLabel,
  isLast = false,
}: {
  sub: Subscription;
  findService: (name: string) => any;
  onSelectCredentials: () => void;
  onRenew: () => void;
  isRenewing: boolean;
  statusColor: (status: string) => string;
  statusLabel: (status: string) => string;
  isLast?: boolean;
}) {
  const service = findService(sub.service_name);
  const code = `VORTEX-${sub.id.slice(0, 8).toUpperCase()}`;
  const nextRenewal = sub.next_renewal || '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="px-4 py-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
    >
      {/* Service Logo + Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {service?.image_url ? (
            <img src={service.image_url} alt={service.name} className="w-full h-full object-contain" />
          ) : (
            <Package className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{sub.service_name}</span>
            <button
              onClick={onSelectCredentials}
              className="inline-flex items-center justify-center rounded-full p-1.5 bg-secondary/70 text-primary hover:bg-secondary transition-colors"
              title="Ver credenciales"
            >
              <Key className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-slate-400 truncate">{code}</div>
        </div>
      </div>

      {/* Date + Status */}
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <div className="text-right">
          <div className="text-xs text-slate-400">Vencimiento</div>
          <div className="text-sm font-medium text-white">{nextRenewal ? new Date(nextRenewal).toLocaleDateString() : 'N/A'}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRenew}
            disabled={isRenewing}
            className="inline-flex items-center justify-center rounded-full border border-primary bg-slate-950/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.03em] text-white shadow-[0_0_0_1px_rgba(59,130,246,0.45)] transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Renovar
          </button>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColor(sub.status)}`}>
            {statusLabel(sub.status)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default ClientDashboard;
