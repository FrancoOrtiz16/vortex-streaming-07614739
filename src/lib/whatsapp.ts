export const WHATSAPP_NUMBER = '04242644553';

const normalizeWhatsAppNumber = (number: string) => {
  const digits = number.replace(/[^0-9]/g, '');
  return digits.length === 11 && digits.startsWith('0') ? `58${digits.slice(1)}` : digits;
};

export const getWhatsAppUrl = (message: string, number: string = WHATSAPP_NUMBER) => {
  const sanitized = normalizeWhatsAppNumber(number);
  const encoded = encodeURIComponent(message);
  return sanitized
    ? `whatsapp://send?phone=${sanitized}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;
};

export const getWhatsAppSupportMessage = () => 'Hola, necesito soporte técnico de Vortex Streaming.';
