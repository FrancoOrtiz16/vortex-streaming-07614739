import React from 'react';
import { motion } from 'framer-motion';
import { Eye, ArrowLeft } from 'lucide-react';

interface AdminPreviewBarProps {
  onReturnToPanel?: () => void;
  customLabel?: string;
}

export function AdminPreviewBar({ onReturnToPanel, customLabel = 'Modo Previsualización Admin' }: AdminPreviewBarProps) {
  const handleReturnToPanel = onReturnToPanel || (() => {
    window.history.back();
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="sticky top-0 z-50 bg-gradient-to-r from-purple-600/95 to-blue-600/95 backdrop-blur-md border-b border-purple-500/30 px-4 py-3 shadow-lg"
    >
      <div className="mx-auto max-w-[1480px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-display font-bold text-white text-sm md:text-base flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {customLabel}
          </span>
          <span className="text-xs text-purple-200">Cambios en tiempo real</span>
        </div>
        <button
          onClick={handleReturnToPanel}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/20 hover:border-white/40"
          title="Volver al Panel de Administración"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Panel
        </button>
      </div>
    </motion.div>
  );
}
