import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, MessageCircle, Loader2, Copy, CheckCircle } from 'lucide-react';
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

const WHATSAPP_NUMBER = '584121234567'; // Cambia al número real

const CheckoutDialog = ({ open, onOpenChange }: CheckoutDialogProps) => {
  const { user } = useAuth();
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
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

      // Create order in DB
      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        customer_email: user.email || '',
        product_name: productNames,
        total,
        status: 'pending',
      });

      if (error) throw error;

      // Build WhatsApp message
      const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Cliente';
      const message = `Hola Vortex Streaming, mi nombre es ${displayName}, acabo de comprar ${productNames} por un total de $${total.toFixed(2)}. Adjunto el comprobante de pago.`;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border sm:rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Confirmar Pago</DialogTitle>
          <DialogDescription className="text-xs">
            Realiza el pago a cualquiera de estos métodos y envía tu comprobante.
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
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {methods.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl bg-secondary/60 border border-border p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-semibold text-sm">{m.method_name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.method_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-foreground flex-1 break-all">{m.account_info}</code>
                  <button
                    onClick={() => handleCopy(m.account_info, m.id)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    {copiedId === m.id ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {m.instructions && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">{m.instructions}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-medium">Total:</span>
          <span className="font-display font-bold text-lg gold-text">${total.toFixed(2)}</span>
        </div>

        <button
          onClick={handleConfirm}
          disabled={submitting || methods.length === 0}
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
