import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '584241772003';

const WhatsAppFloat = () => (
  <a
    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, necesito soporte técnico de Vortex Streaming.')}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Soporte técnico por WhatsApp"
    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all hover:scale-110"
  >
    <MessageCircle className="w-6 h-6" />
  </a>
);

export default WhatsAppFloat;
