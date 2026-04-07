import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CheckoutDialog from '@/components/CheckoutDialog';
import { toast } from 'sonner';

const CartPage = () => {
  const { items, total, removeItem, clear } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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
                    className="glass rounded-xl p-4 flex items-center gap-4"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-sm truncate">{item.product.name}</h3>
                      <p className="text-xs text-muted-foreground">Cant: {item.quantity}</p>
                    </div>
                    <span className="font-display font-bold gold-text text-sm whitespace-nowrap">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="glass rounded-xl p-4 space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-display font-semibold text-sm">${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-green-400">
                    <span className="text-sm">Descuento 10% (2+ productos)</span>
                    <span className="font-display font-semibold text-sm">-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-display font-bold text-xl gold-text">${total.toFixed(2)}</span>
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
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </div>
  );
};

export default CartPage;
