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
  sort_order?: number | null;
}

const PREFERRED_METHOD_ORDER = [
  'Pago Móvil',
  'Transferencia',
  'Zelle',
  'Binance',
  'Zinli',
  'PayPal',
];

const normalizeMethodType = (value: string) =>
  value.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();

const getMethodRank = (method: PaymentMethod) => {
  const normalized = normalizeMethodType(method.method_type).toLowerCase();
  const preferredIndex = PREFERRED_METHOD_ORDER.findIndex(
    (item) => item.toLowerCase() === normalized
  );
  return preferredIndex >= 0 ? preferredIndex : PREFERRED_METHOD_ORDER.length;
};

interface Props {
  selectedId: string | null;
  onSelect: (method: PaymentMethod) => void;
}

const PaymentMethods = ({ selectedId, onSelect }: Props) => {
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('payment_methods')
      .select('id, method_name, method_type, account_info, instructions, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) {
          console.error('[PaymentMethods] Error loading payment methods:', error.message);
          setError(error.message || 'Error al cargar los métodos de pago.');
          setMethods([]);
        } else if (!data || data.length === 0) {
          setError('No hay métodos de pago activos disponibles.');
          setMethods([]);
        } else {
          const fetchedMethods = data as PaymentMethod[];
          const orderedMethods = fetchedMethods.slice().sort((a, b) => {
            const orderA = a.sort_order ?? 999;
            const orderB = b.sort_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;

            const rankA = getMethodRank(a);
            const rankB = getMethodRank(b);
            if (rankA !== rankB) return rankA - rankB;

            return normalizeMethodType(a.method_type).localeCompare(normalizeMethodType(b.method_type));
          });
          setMethods(orderedMethods);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PaymentMethods] Error fetching payment methods:', err);
        setError(err.message || 'Error al cargar los métodos de pago.');
        setMethods([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!methods || methods.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/60 p-4 text-sm text-muted-foreground">
        No hay métodos de pago disponibles en este momento. Intenta más tarde.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {methods.map((m, i) => (
        <motion.button
          key={m.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(m)}
          className={`w-full rounded-2xl border-2 p-5 text-left transition-all duration-200 flex items-center gap-4 group ${
            selectedId === m.id
              ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-primary shadow-lg shadow-primary/20'
              : 'bg-secondary/40 border-border/50 hover:border-primary/40 hover:bg-secondary/60'
          }`}
        >
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-200 ${
            selectedId === m.id
              ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg'
              : 'bg-secondary/80 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
          }`}>
            {m.method_name.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-base leading-tight">{m.method_name}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
              {normalizeMethodType(m.method_type)}
            </p>
          </div>
          {selectedId === m.id && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
            >
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
};

export default PaymentMethods;
