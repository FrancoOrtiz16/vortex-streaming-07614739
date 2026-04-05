import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Loader2, Copy, CheckCircle, ArrowLeft, CreditCard, Upload, ImageIcon } from 'lucide-react';
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
import { useExchangeRate } from '@/hooks/useExchangeRate';

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
  const { rate, convertToVES } = useExchangeRate();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedMethod(null);
      setReceiptFile(null);
      setReceiptPreview(null);
      setReceiptUrl(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));

    // Upload to storage
    if (!user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file);
    if (error) {
      toast.error('Error subiendo comprobante');
      setReceiptFile(null);
      setReceiptPreview(null);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
    setReceiptUrl(urlData.publicUrl);
    setUploading(false);
    toast.success('Comprobante cargado');
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

      // Process each item for subscription logic
      const selectedMethodObj = methods.find(m => m.id === selectedMethod);
      for (const item of items) {
        // Check existing sub
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('service_name', item.product.name)
          .maybeSingle();

        let subscriptionId: string;
        if (existingSub) {
          // Update existing
          const { error: updateErr } = await supabase
            .from('subscriptions')
            .update({ status: 'pending_approval' })
            .eq('id', existingSub.id);
          if (updateErr) console.error('Update sub error:', updateErr);
          subscriptionId = existingSub.id;
        } else {
          // Create new
          const { data: newSub, error: insertErr } = await supabase
            .from('subscriptions')
            .insert({
              user_id: user.id,
              service_name: item.product.name,
              status: 'pending_approval'
            }).select().single();
          if (insertErr || !newSub) continue;
          subscriptionId = newSub.id;
        }

        // Insert payment_history
        await supabase
          .from('payment_history')
          .insert({
            subscription_id: subscriptionId,
            user_id: user.id,
            amount: item.product.price * item.quantity,
            status: 'pending_approval',
            receipt_url: receiptUrl,
            method: selectedMethodObj?.method_name || 'unknown'
          });
      }

      const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Cliente';
      const confirmedMethod = methods.find(m => m.id === selectedMethod);
      const methodText = confirmedMethod ? ` usando ${confirmedMethod.method_name}` : '';
      const receiptText = receiptUrl ? `\nComprobante: ${receiptUrl}` : '';
      const message = `Hola Vortex Streaming, mi nombre es ${displayName}, acabo de comprar ${productNames} por un total de $${total.toFixed(2)}${methodText}.${receiptText}`;
      const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      clear();
      onOpenChange(false);
      toast.success('Pedido registrado. Envía tu comprobante por WhatsApp.');
      window.open(waLink, '_blank');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const selected = methods.find(m => m.id === selectedMethod);
  const canSubmit = !!selectedMethod && !!receiptUrl && !submitting && !uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border sm:rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Confirmar Pago
          </DialogTitle>
          <DialogDescription className="text-xs">
            {selectedMethod ? 'Datos de pago y comprobante' : 'Selecciona tu método de pago preferido'}
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
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
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
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMethod}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <button
                onClick={() => { setSelectedMethod(null); setReceiptFile(null); setReceiptPreview(null); setReceiptUrl(null); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
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

              {/* Receipt upload */}
              <div className="rounded-xl border border-dashed border-border p-4">
                <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  Subir Comprobante de Pago
                </p>
                {receiptPreview ? (
                  <div className="relative">
                    <img src={receiptPreview} alt="Comprobante" className="w-full h-32 object-cover rounded-lg" />
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                    {receiptUrl && (
                      <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 rounded-lg bg-secondary/40 hover:bg-secondary/60 cursor-pointer transition-colors">
                    <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-[11px] text-muted-foreground">Toca para subir captura</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {(() => {
const isVES = selected && ['Pago Móvil', 'Transferencia Bancaria', 'pago móvil', 'transferencia bancaria'].some(name => 
  name === selected.method_name || 
  selected.method_type.toLowerCase().includes('pago móvil') || 
  selected.method_type.toLowerCase().includes('transferencia')
);
          return (
            <div className="pt-2 border-t border-border space-y-1">
              {isVES ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Monto a pagar:</span>
                    <span className="font-display font-bold text-lg text-primary">{(total * rate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <span>(Equivalente a $${total.toFixed(2)})</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total:</span>
                  <span className="font-display font-bold text-lg text-primary">${total.toFixed(2)}</span>
                </div>
              )}
            </div>
          );
        })()}

        <button
          onClick={handleConfirm}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
            canSubmit
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MessageCircle className="w-4 h-4" />
          )}
          {receiptUrl ? 'Confirmar y enviar por WhatsApp' : 'Sube el comprobante para continuar'}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
