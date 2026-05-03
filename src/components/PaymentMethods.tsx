import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentMethod {
  id: string;
  method_name: string;
  method_type: string;
  account_info: string;
  instructions: string | null;
}

// Manual fallback methods (used if Supabase is slow or fails).
// Only amount + service name are required upstream — no combo_id / subscription_code.
const FALLBACK_METHODS: PaymentMethod[] = [
  {
    id: 'fallback-pago-movil',
    method_name: 'Pago Móvil',
    method_type: 'pago móvil',
    account_info: 'Banco: Banesco (0134)\nCédula: V-30.000.000\nTeléfono: 0424-1772003',
    instructions: 'Envía el monto exacto en Bs. y sube el comprobante.',
  },
  {
    id: 'fallback-zelle',
    method_name: 'Zelle',
    method_type: 'zelle',
    account_info: 'Email: vortex.streaming@pago.com\nTitular: Vortex Streaming',
    instructions: 'Envía el monto en USD y sube la captura de confirmación.',
  },
  {
    id: 'fallback-binance',
    method_name: 'Binance Pay',
    method_type: 'crypto',
    account_info: 'Binance ID: 784512309\nUSDT (red BSC / TRC20)',
    instructions: 'Envía USDT y sube la captura del TXID.',
  },
];

const FETCH_TIMEOUT_MS = 2500;

interface Props {
  selectedId: string | null;
  onSelect: (method: PaymentMethod) => void;
}

const PaymentMethods = ({ selectedId, onSelect }: Props) => {
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn('[PaymentMethods] Timeout 2.5s — usando métodos manuales');
      setMethods(FALLBACK_METHODS);
      setUsedFallback(true);
      setLoading(false);
    }, FETCH_TIMEOUT_MS);

    supabase
      .from('payment_methods')
      .select('id, method_name, method_type, account_info, instructions')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error || !data || data.length === 0) {
          console.warn('[PaymentMethods] Fallback activado:', error?.message || 'sin métodos');
          setMethods(FALLBACK_METHODS);
          setUsedFallback(true);
        } else {
          setMethods(data as PaymentMethod[]);
        }
        setLoading(false);
      });

    return () => {
      settled = true;
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {usedFallback && (
        <p className="text-[10px] text-amber-400/80 mb-1">
          Modo offline: mostrando métodos manuales.
        </p>
      )}
      {(methods || []).map((m, i) => (
        <motion.button
          key={m.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onSelect(m)}
          className={`w-full rounded-xl bg-secondary/60 border p-4 text-left transition-all flex items-center gap-3 ${
            selectedId === m.id ? 'border-primary' : 'border-border hover:border-primary/50'
          }`}
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
  );
};

export default PaymentMethods;
export { FALLBACK_METHODS };