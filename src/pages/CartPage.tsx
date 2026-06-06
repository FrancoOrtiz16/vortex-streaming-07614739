import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCurrency } from '@/context/CurrencyContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CheckoutDialog from '@/components/shop/CheckoutDialog';
import { CheckoutErrorBoundary } from '@/components/shop/CheckoutErrorBoundary';
import { toast } from 'sonner';

const formatDurationLabel = (days?: number) => {
  // Sistema estandarizado: todas las suscripciones son de 30 días
  return days === 30 ? '1 Mes' : '';
};

const CartPage = () => {
  const { items, total, subtotal, discount, removeItem, clear } = useCart();
  const { formatMoney } = useCurrency();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const renewalItems = items.filter(item => item.product.renewal);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('vortex_checkout_open_v1');
    if (saved === 'true') {
      setCheckoutOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('vortex_checkout_open_v1', checkoutOpen ? 'true' : 'false');
  }, [checkoutOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Seguir comprando
          </Link>

          <h1 className="font-display font-bold text-2xl mb-6">Tu Carrito</h1>
          {renewalItems.length > 0 && (
            <div className="mb-4 rounded-2xl border border-primary/30 bg-slate-950/70 p-4 text-sm text-primary">
              Renovando servicio: {renewalItems.map(item => item.product.unique_service_id || item.product.subscription_id).join(', ')}. Este pago actualizará la fecha de expiración existente.
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">Tu carrito está vacío.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {items.map((item, i) => (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass rounded-xl p-4 flex flex-col gap-4 lg:flex-row lg:items-center"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <img
                        src={item.product.image || '/logo192.png'}
                        alt={item.product.name}
                        className="w-16 h-12 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-sm truncate">{item.product.name}</h3>
                        {item.product.description && (
                          <p className="text-[11px] text-muted-foreground truncate">{item.product.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Cant: {item.quantity}</p>
                        {!!item.product.duration_days && !item.product.renewal && (
                          <p className="text-[11px] text-primary mt-1">
                            Duración: {formatDurationLabel(item.product.duration_days)}
                          </p>
                        )}
                        {item.product.renewal && (
                          <p className="text-[11px] text-primary mt-1">
                            Renovando servicio: {item.product.unique_service_id || item.product.subscription_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 justify-between">
                      <span className="font-display font-bold gold-text text-sm whitespace-nowrap">
                        {formatMoney(item.product.price * item.quantity, 'USD')}
                      </span>
                      <button
                        onClick={() => removeItem(item.product.cart_key || item.product.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="glass rounded-xl p-4 space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-display font-semibold text-sm">
                    {formatMoney(subtotal, 'USD')}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-green-400">
                    <span className="text-sm">Descuento 10% (2+ productos)</span>
                    <span className="font-display font-semibold text-sm">
                      {`-${formatMoney(discount, 'USD')}`}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-display font-bold text-xl gold-text">
                    {formatMoney(total, 'USD')}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { clear(); toast.info('Carrito vaciado'); }}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Vaciar
                </button>
                <button
                  onClick={() => setCheckoutOpen(true)}
                  className="flex-1 py-2.5 rounded-xl gradient-neon text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Proceder al Pago
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <CheckoutErrorBoundary key={checkoutOpen ? 'checkout-open' : 'checkout-closed'}>
        <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
      </CheckoutErrorBoundary>
    </div>
  );
};

export default CartPage;
