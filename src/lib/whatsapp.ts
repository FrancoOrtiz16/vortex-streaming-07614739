export const WHATSAPP_NUMBER = '584242644553';

export const getWhatsAppUrl = (message: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const getWhatsAppSupportMessage = () => 'Hola, necesito soporte técnico de Vortex Streaming.';
