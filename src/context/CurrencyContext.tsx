import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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
// Tasa de cambio FIJA en código (sin dependencias de BD para evitar bloqueos)
const FIXED_USD_VES_RATE = 700;

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
  const [rate] = useState<number>(FIXED_USD_VES_RATE);
  const loadingRate = false;

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
