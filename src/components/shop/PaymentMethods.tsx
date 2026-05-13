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
    <div className="space-y-2">
      {methods.map((m, i) => (
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
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              {normalizeMethodType(m.method_type)}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

export default PaymentMethods;
