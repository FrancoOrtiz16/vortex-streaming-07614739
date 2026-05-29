import { useMemo } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import type { PaymentMethod } from '@/components/shop/PaymentMethods';

export type PaymentMethodInput = PaymentMethod | string | null | undefined;

export const DEFAULT_EXCHANGE_RATE = 95;

const normalizePaymentMethod = (paymentMethod?: PaymentMethodInput) => {
  if (!paymentMethod) return '';

  const rawValue = typeof paymentMethod === 'object'
    ? paymentMethod.method_type || paymentMethod.method_name || ''
    : String(paymentMethod);

  return rawValue
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
};

export const shouldUseVES = (paymentMethod?: PaymentMethodInput) => {
  const normalized = normalizePaymentMethod(paymentMethod);
  return /(pago movil|pagomovil|transferencia)/.test(normalized);
};

export const getSafeExchangeRate = (exchangeRate?: number, fallbackRate?: number) => {
  if (typeof exchangeRate === 'number' && !Number.isNaN(exchangeRate) && exchangeRate > 0) {
    return exchangeRate;
  }

  if (typeof fallbackRate === 'number' && !Number.isNaN(fallbackRate) && fallbackRate > 0) {
    return fallbackRate;
  }

  return DEFAULT_EXCHANGE_RATE;
};

const formatMoney = (value: number, useVES: boolean) => {
  if (useVES) {
    return `${value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Bs.`;
  }

  return `$ ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatConvertedAmount = (
  amountUsd: number,
  paymentMethod?: PaymentMethodInput,
  exchangeRate?: number,
) => {
  const baseAmount = Number(amountUsd) || 0;
  const useVES = shouldUseVES(paymentMethod);
  const safeRate = getSafeExchangeRate(exchangeRate, DEFAULT_EXCHANGE_RATE);
  const convertedAmount = useVES ? baseAmount * safeRate : baseAmount;

  return formatMoney(convertedAmount, useVES);
};

export function useCurrencyConverter(
  amountUsd: number,
  paymentMethod?: PaymentMethodInput,
  exchangeRate?: number,
) {
  const { rate } = useCurrency();

  return useMemo(() => {
    const baseAmount = Number(amountUsd) || 0;
    const useVES = shouldUseVES(paymentMethod);
    const safeRate = getSafeExchangeRate(exchangeRate, rate);
    const convertedAmount = useVES ? baseAmount * safeRate : baseAmount;

    return {
      amount: convertedAmount,
      formatted: formatMoney(convertedAmount, useVES),
      isVES: useVES,
      exchangeRate: safeRate,
    };
  }, [amountUsd, exchangeRate, paymentMethod, rate]);
}
