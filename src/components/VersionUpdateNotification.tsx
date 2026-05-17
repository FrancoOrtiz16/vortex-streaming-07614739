/**
 * 🔔 VersionUpdateNotification Component
 * Notificación discreta de actualización de versión
 * 
 * Características:
 * - Banner superior discreto y elegante
 * - Actualización automática con animación suave
 * - Opción de actualizar manualmente
 * - Auto-dismiss después de actualización
 */

import React, { useState, useEffect } from 'react';
import useVersionUpdate from '@/hooks/useVersionUpdate';

interface VersionUpdateNotificationProps {
  autoUpdate?: boolean;
  checkInterval?: number;
  position?: 'top' | 'bottom';
  className?: string;
}

export const VersionUpdateNotification: React.FC<VersionUpdateNotificationProps> = ({
  autoUpdate = true,
  checkInterval = 10000,
  position = 'top',
  className = '',
}) => {
  const [showNotification, setShowNotification] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('Nueva versión disponible');

  const { forceUpdate } = useVersionUpdate({
    checkInterval,
    autoUpdate: false, // Controlar manualmente para poder mostrar UI
    onUpdateAvailable: () => {
      console.log('[VersionNotification] Update available - showing notification');
      setShowNotification(true);
      
      if (autoUpdate) {
        // Auto-actualizar después de 2 segundos
        setTimeout(() => {
          handleAutoUpdate();
        }, 2000);
      }
    },
    onUpdateReady: () => {
      console.log('[VersionNotification] Update ready');
      setUpdateMessage('✅ Actualización completada');
      
      // Auto-dismiss después de 3 segundos
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    },
    verbose: false,
  });

  const handleAutoUpdate = () => {
    setIsUpdating(true);
    setUpdateMessage('⏳ Actualizando versión...');
    forceUpdate();
  };

  const handleManualUpdate = () => {
    handleAutoUpdate();
  };

  if (!showNotification) {
    return null;
  }

  const positionClasses = position === 'top' 
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  return (
    <div
      className={`fixed ${positionClasses} z-50 ${className}`}
      style={{
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(${position === 'top' ? '-100%' : '100%'});
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(${position === 'top' ? '-100%' : '100%'});
            opacity: 0;
          }
        }

        .version-notification {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-bottom: 2px solid #3b82f6;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2);
          backdrop-filter: blur(10px);
        }

        .version-notification.closing {
          animation: slideOut 0.3s ease-in forwards;
        }
      `}</style>

      <div className="version-notification px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Contenido izquierdo */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isUpdating ? (
              <div className="flex-shrink-0">
                <div className="animate-spin">
                  <svg
                    className="w-5 h-5 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 text-blue-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {updateMessage}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isUpdating
                  ? 'Por favor espera...'
                  : 'Tu navegador será actualizado automáticamente en breve'}
              </p>
            </div>
          </div>

          {/* Botones (solo si no está actualizando) */}
          {!isUpdating && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                onClick={handleManualUpdate}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 whitespace-nowrap"
                aria-label="Actualizar ahora"
              >
                Actualizar
              </button>
              <button
                onClick={() => setShowNotification(false)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors duration-200"
                aria-label="Cerrar notificación"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionUpdateNotification;
