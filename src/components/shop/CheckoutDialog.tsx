import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, CreditCard, Upload, ImageIcon, CheckCircle2 as CheckCircle, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { createNewSubscriptionInstance, renewExistingSubscription } from '@/lib/subscriptionManager';
import PaymentMethods, { PaymentMethod as PMType } from './PaymentMethods';
import PaymentDetailsCard from './PaymentDetailsCard';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { getWhatsAppUrl } from '@/lib/whatsapp';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CheckoutDialog = ({ open, onOpenChange }: CheckoutDialogProps) => {
  const { user } = useAuth();
  const { items, total, subtotal, discount, clear } = useCart();
  const { rate, convertToVES } = useExchangeRate();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PMType | null>(null);
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
    }
  }, [open]);

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
    // Quick validation
    if (!user || !user.id) {
      toast.error('Debes iniciar sesión para confirmar tu compra');
      navigate('/auth');
      return;
    }

    if (!items || items.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }

    if (!selectedMethod) {
      toast.error('Selecciona un método de pago');
      return;
    }

    setSubmitting(true);
    try {
      console.debug('[Checkout] Starting order creation');
      
      // Step 1: Create order
      const formatDurationLabel = (days?: number) => {
        // Sistema estandarizado: todas las suscripciones son de 30 días
        return days === 30 ? '1 Mes' : '';
      };

      const productNames = items
        .map(i => i.product.renewal
          ? `${i.product.name} (Renovación: ${i.product.unique_service_id || i.product.subscription_id}) x${i.quantity}`
          : `${i.product.name}${i.product.duration_days ? ` (${formatDurationLabel(i.product.duration_days)})` : ''} x${i.quantity}`
        )
        .join(', ');
      const { error: orderErr } = await supabase.from('orders').insert({
        user_id: user.id,
        customer_email: user.email || '',
        product_name: productNames,
        total,
        status: 'pending',
      });

      if (orderErr) {
        throw new Error(`Order error: ${orderErr.message}`);
      }
      console.debug('[Checkout] Order created');

      // Step 2: Procesar cada item del carrito.
      // - Renovaciones: actualizar la suscripción existente.
      // - Compras nuevas: crear SIEMPRE una fila independiente por unidad (multi-instancia).
      const renewalItems = items.filter(i => i.product.renewal && i.product.subscription_id);
      const newOrderItems = items.filter(i => !i.product.renewal);

      for (const item of newOrderItems) {
        for (let i = 0; i < item.quantity; i++) {
          const { error: insertError } = await createNewSubscriptionInstance({
            userId: user.id,
            serviceName: item.product.name,
            status: 'pending_approval',
            durationDays: item.product.duration_days ?? 30,
          });
          if (insertError) {
            throw new Error(`No se pudo crear la suscripción: ${insertError.message}`);
          }
        }
      }

      for (const item of renewalItems) {
        const subscriptionId = item.product.subscription_id!;
        const { error: updateError } = await renewExistingSubscription(subscriptionId);
        if (updateError) {
          throw new Error(`Renewal update error: ${updateError.message}`);
        }
      }

      // Refresh Supabase session to recognize new permissions
      await supabase.auth.refreshSession();

      // Step 3: Send WhatsApp & clear
      const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Cliente';
      const methodText = selectedMethod ? ` usando ${selectedMethod.method_name}` : '';
      const receiptText = receiptUrl ? `\nComprobante: ${receiptUrl}` : '';
      const message = `Hola Vortex Streaming, mi nombre es ${displayName}, acabo de comprar ${productNames} por un total de $${total.toFixed(2)}${methodText}.${receiptText}`;
      const whatsappUrl = getWhatsAppUrl(message);

      clear();
      onOpenChange(false);
      toast.success('✅ Pedido registrado. Envía tu comprobante por WhatsApp.');
      window.open(whatsappUrl, '_blank');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[Checkout] Error:', err);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const selected = selectedMethod;
  // Botón habilitado en cuanto hay método seleccionado; recordamos al usuario subir comprobante.
  const canSubmit = !!selectedMethod && !!receiptUrl && !submitting && !uploading;
  const canPick = !!selectedMethod && !submitting;

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

        {!selectedMethod ? (
          <PaymentMethods
            selectedId={null}
            onSelect={(m) => setSelectedMethod(m)}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMethod.id}
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
                <PaymentDetailsCard
                  methodName={selected.method_name}
                  methodType={selected.method_type}
                  accountInfo={selected.account_info}
                  instructions={selected.instructions}
                />
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
                    <span className="text-sm font-medium">Subtotal:</span>
                    <span className="text-sm">${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">Descuento (10%):</span>
                      <span className="text-sm text-green-600">-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Monto a pagar:</span>
                    <span className="font-display font-bold text-lg text-primary">{(total * rate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <span>(Equivalente a ${total.toFixed(2)})</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Subtotal:</span>
                    <span className="text-sm">${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">Descuento (10%):</span>
                      <span className="text-sm text-green-600">-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total:</span>
                    <span className="font-display font-bold text-lg text-primary">${total.toFixed(2)}</span>
                  </div>
                </>
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
