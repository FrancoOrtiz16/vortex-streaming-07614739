import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Loader2, Copy, CheckCircle, ArrowLeft, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PaymentMethod {
  id: string;
  method_name: string;
  method_type: string;
  account_info: string;
  instructions: string | null;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WHATSAPP_NUMBER = '584241772003';

const CheckoutDialog = ({ open, onOpenChange }: CheckoutDialogProps) => {
  const { user } = useAuth();
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedMethod(null);
      supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => {
          setMethods((data as PaymentMethod[]) || []);
          setLoading(false);
        });
    }
  }, [open]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirm = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para confirmar tu compra');
      navigate('/auth');
      return;
    }

    setSubmitting(true);
    try {
      const productNames = items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        customer_email: user.email || '',
        product_name: productNames,
        total,
        status: 'pending',
      });
      if (error) throw error;

      const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Cliente';
      const selectedMethodObj = methods.find(m => m.id === selectedMethod);
      const methodText = selectedMethodObj ? ` usando ${selectedMethodObj.method_name}` : '';
      const message = `Hola Vortex Streaming, mi nombre es ${displayName}, acabo de comprar ${productNames} por un total de $${total.toFixed(2)}${methodText}. Adjunto el comprobante de pago.`;
      const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      clear();
      onOpenChange(false);
      toast.success('Pedido registrado. Envía tu comprobante por WhatsApp.');
      window.open(waLink, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const selected = methods.find(m => m.id === selectedMethod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border sm:rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Confirmar Pago
          </DialogTitle>
          <DialogDescription className="text-xs">
            {selectedMethod ? 'Datos de pago para tu método seleccionado' : 'Selecciona tu método de pago preferido'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : methods.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay métodos de pago configurados aún.
          </p>
        ) : !selectedMethod ? (
          /* Step 1: Choose method */
          <div className="space-y-2">
            {methods.map((m, i) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedMethod(m.id)}
                className="w-full rounded-xl bg-secondary/60 border border-border p-4 text-left hover:border-primary/50 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg gradient-neon flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {m.method_name.charAt(0)}
                </div>
                <div>
                  <p className="font-display font-semibold text-sm">{m.method_name}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{m.method_type}</p>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          /* Step 2: Show selected method details */
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMethod}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={() => setSelectedMethod(null)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Cambiar método
              </button>

              {selected && (
                <div className="rounded-xl bg-secondary/60 border border-primary/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display font-semibold text-base">{selected.method_name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-primary/10">
                      {selected.method_type}
                    </span>
                  </div>

                  {/* Parse account_info for structured display */}
                  <div className="space-y-2">
                    {selected.account_info.split('\n').filter(Boolean).map((line, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
                        <code className="text-sm text-foreground flex-1 break-all">{line}</code>
                        <button
                          onClick={() => handleCopy(line, `${selected.id}-${idx}`)}
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
                          aria-label="Copiar"
                        >
                          {copiedId === `${selected.id}-${idx}` ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  {selected.instructions && (
                    <p className="text-[11px] text-muted-foreground mt-3 p-2 rounded-lg bg-background/50">
                      {selected.instructions}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-medium">Total:</span>
          <span className="font-display font-bold text-lg gold-text">${total.toFixed(2)}</span>
        </div>

        <button
          onClick={handleConfirm}
          disabled={submitting || methods.length === 0 || !selectedMethod}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MessageCircle className="w-4 h-4" />
          )}
          Confirmar y enviar comprobante por WhatsApp
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
