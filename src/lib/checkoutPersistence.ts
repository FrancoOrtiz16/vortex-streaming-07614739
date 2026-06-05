export interface SavedCheckoutMethod {
  id: string;
  method_name: string;
  method_type: string;
  account_info: string;
  instructions: string | null;
}

interface CheckoutDraft {
  selectedMethod: SavedCheckoutMethod | null;
  currency: string;
  receiptUrl: string | null;
  checkoutOpen: boolean;
  savedAt: number;
}

const CHECKOUT_DRAFT_KEY = 'vortex_checkout_draft_v1';
const CHECKOUT_DRAFT_TTL_MS = 10 * 60 * 1000; // 10 minutos

function isDraftFresh(draft: Partial<CheckoutDraft> | null): draft is CheckoutDraft {
  return (
    Boolean(draft) &&
    typeof draft.savedAt === 'number' &&
    Date.now() - draft.savedAt <= CHECKOUT_DRAFT_TTL_MS
  );
}

export function loadCheckoutDraft(): Omit<CheckoutDraft, 'savedAt'> | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CheckoutDraft> | null;
    if (!isDraftFresh(parsed)) {
      clearCheckoutDraft();
      return null;
    }

    return {
      selectedMethod: parsed.selectedMethod ?? null,
      currency: typeof parsed.currency === 'string' ? parsed.currency : 'USD',
      receiptUrl: typeof parsed.receiptUrl === 'string' ? parsed.receiptUrl : null,
      checkoutOpen: Boolean(parsed.checkoutOpen),
    };
  } catch (error) {
    console.warn('[checkoutPersistence] Error loading draft:', error);
    clearCheckoutDraft();
    return null;
  }
}

export function saveCheckoutDraft(draft: Omit<CheckoutDraft, 'savedAt'>): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      CHECKOUT_DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
  } catch (error) {
    console.warn('[checkoutPersistence] Error saving draft:', error);
  }
}

export function clearCheckoutDraft(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch (error) {
    console.warn('[checkoutPersistence] Error clearing draft:', error);
  }
}
