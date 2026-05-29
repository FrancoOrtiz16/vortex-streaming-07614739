interface CheckoutActionState {
  phoneLoading?: boolean;
  hasPhone?: boolean;
  receiptUrl?: string | null;
}

export const getCheckoutActionLabel = ({
  phoneLoading,
  hasPhone,
  receiptUrl,
}: CheckoutActionState) => {
  if (phoneLoading && !hasPhone) {
    return 'Confirmar pago';
  }

  if (receiptUrl) {
    return 'Confirmar y enviar por WhatsApp';
  }

  return 'Confirmar pago';
};

interface SubmitState {
  selectedMethod: { id?: string } | null;
  submitting?: boolean;
  uploading?: boolean;
}

export const canSubmitCheckout = ({
  selectedMethod,
  submitting = false,
  uploading = false,
}: SubmitState) => {
  return Boolean(selectedMethod?.id) && !submitting && !uploading;
};
