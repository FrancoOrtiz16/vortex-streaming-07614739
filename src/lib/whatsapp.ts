export const WHATSAPP_NUMBER = '584242644553';

export const getWhatsAppUrl = (message: string, number: string = WHATSAPP_NUMBER) => {
  const sanitized = number.replace(/[^0-9]/g, '');
  return `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
};

export const getWhatsAppSupportMessage = () => 'Hola, necesito soporte técnico de Vortex Streaming.';
