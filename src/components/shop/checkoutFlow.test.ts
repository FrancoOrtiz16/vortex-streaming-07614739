import { describe, expect, it } from 'vitest';
import { canSubmitCheckout, getCheckoutActionLabel } from './checkoutFlow';

describe('checkout flow fallback', () => {
  it('keeps the payment flow available when the contact check is unavailable', () => {
    const selectedMethod = { id: 'binance' } as any;

    expect(canSubmitCheckout({ selectedMethod, submitting: false, uploading: false })).toBe(true);
    expect(getCheckoutActionLabel({ phoneLoading: true, hasPhone: false, receiptUrl: null })).toBe('Confirmar pago');
  });
});
