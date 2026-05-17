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
const DEFAULT_RATE = 95;

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
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === 'undefined') return 'USD';
    return parseCurrency(window.localStorage.getItem(CURRENCY_STORAGE_KEY));
  });
  const [rate, setRate] = useState<number>(DEFAULT_RATE);
  const [loadingRate, setLoadingRate] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  useEffect(() => {
    const loadRate = async () => {
      setLoadingRate(true);
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'usd_ves_rate')
          .single();

        if (!error && data?.value) {
          const parsedRate = Number(data.value);
          if (!Number.isNaN(parsedRate) && parsedRate > 0) {
            setRate(parsedRate);
          } else {
            console.warn('[CurrencyProvider] Tasa inválida en app_settings:', data.value);
          }
        } else {
          console.warn('[CurrencyProvider] No se pudo cargar la tasa USD→VES:', error?.message || 'sin datos');
        }
      } catch (err) {
        console.error('[CurrencyProvider] Error cargando tasa de cambio:', err);
      } finally {
        setLoadingRate(false);
      }
    };

    loadRate();
  }, []);

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
