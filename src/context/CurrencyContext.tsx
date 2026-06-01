import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type CurrencyCode = 'USD' | 'VES';

interface CurrencyContextValue {
  currency: CurrencyCode;
  rate: number;
  loadingRate: boolean;
  setCurrency: (currency: CurrencyCode) => void;
  convertToVES: (usd: number) => number;
  formatMoney: (value: number, currency?: CurrencyCode) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'vortex_currency_v1';
const RATE_STORAGE_KEY = 'vortex_usd_ves_rate_v1';
// Fallback inicial si aún no hay valor cargado de la BD
const FALLBACK_RATE = 95;

const parseCurrency = (value: string | null): CurrencyCode => {
  return value === 'VES' ? 'VES' : 'USD';
};

const formatMoneyValue = (value: number, currency: CurrencyCode = 'USD') => {
  if (currency === 'VES') {
    return `${value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Bs.`;
  }

  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [rate, setRate] = useState<number>(() => {
    if (typeof window === 'undefined') return FALLBACK_RATE;
    const cached = window.localStorage.getItem(RATE_STORAGE_KEY);
    const parsed = cached ? parseFloat(cached) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_RATE;
  });
  const [loadingRate, setLoadingRate] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    const applyRate = (raw: unknown) => {
      const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
      if (Number.isFinite(parsed) && parsed > 0) {
        setRate(parsed);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(RATE_STORAGE_KEY, String(parsed));
        }
      }
    };

    (async () => {
      try {
        const { data } = await supabase
          .from('app_settings' as any)
          .select('value')
          .eq('key', 'usd_ves_rate')
          .maybeSingle();
        if (!cancelled && data) applyRate((data as any).value);
      } catch (err) {
        console.warn('[Currency] Error cargando tasa', err);
      } finally {
        if (!cancelled) setLoadingRate(false);
      }
    })();

    const channel = supabase
      .channel('app_settings_rate')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.usd_ves_rate' },
        (payload: any) => {
          const newVal = payload?.new?.value;
          if (newVal !== undefined) applyRate(newVal);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  const value = useMemo(
    () => ({
      currency,
      rate,
      loadingRate,
      setCurrency: setCurrencyState,
      convertToVES: (usd: number) => usd * rate,
      formatMoney: formatMoneyValue,
    }),
    [currency, rate, loadingRate],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
