import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle } from 'lucide-react';
import { getWhatsAppUrl, getWhatsAppSupportMessage } from '@/lib/whatsapp';

const WhatsAppFloat = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <a
      href={getWhatsAppUrl(getWhatsAppSupportMessage())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte técnico por WhatsApp"
      className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all hover:scale-110"
    >
      <MessageCircle className="w-6 h-6" />
    </a>,
    document.body,
  );
};

export default WhatsAppFloat;
