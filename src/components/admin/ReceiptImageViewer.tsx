import { useState, useEffect, memo } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceiptImageViewerProps {
  receiptUrl: string | null | undefined;
  altText?: string;
  className?: string;
  maxRetries?: number;
}

/**
 * ReceiptImageViewer
 * 
 * Componente resiliente para mostrar URLs de comprobantes de pago.
 * Maneja:
 * - Errores 404 (bucket no encontrado)
 * - URLs vacías/null
 * - Reintentos automáticos
 * - Fallback visual elegante
 */
export const ReceiptImageViewer = memo(function ReceiptImageViewer({
  receiptUrl,
  altText = 'Comprobante de pago',
  className = 'w-full h-32 object-cover rounded-lg',
  maxRetries = 3,
}: ReceiptImageViewerProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [shouldShowFallback, setShouldShowFallback] = useState(false);

  useEffect(() => {
    if (!receiptUrl) {
      setStatus('error');
      setShouldShowFallback(true);
      return;
    }

    setStatus('loading');
    setShouldShowFallback(false);
    setRetryCount(0);

    const img = new Image();
    const timeoutId = setTimeout(() => {
      if (status === 'loading') {
        setStatus('error');
      }
    }, 8000); // Timeout 8 segundos

    img.onload = () => {
      clearTimeout(timeoutId);
      setStatus('success');
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      
      if (retryCount < maxRetries) {
        // Reintentar después de 2 segundos
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setStatus('loading');
        }, 2000);
      } else {
        setStatus('error');
        setShouldShowFallback(true);
      }
    };

    img.src = receiptUrl;

    return () => clearTimeout(timeoutId);
  }, [receiptUrl, retryCount, maxRetries]);

  const handleRetry = () => {
    setRetryCount(0);
    setStatus('loading');
    setShouldShowFallback(false);
  };

  if (!receiptUrl) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-secondary/20 border border-dashed border-muted-foreground/30 rounded-lg',
        className
      )}>
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">
            No hay comprobante adjunto
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className={cn(
        'flex items-center justify-center bg-secondary/10 rounded-lg',
        className
      )}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            {retryCount > 0 ? `Reintentando (${retryCount}/${maxRetries})...` : 'Cargando...'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={cn(
        'flex items-center justify-center bg-destructive/10 border border-destructive/30 rounded-lg',
        className
      )}>
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-destructive font-medium">
              No se pudo cargar el comprobante
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {shouldShowFallback 
                ? 'Es posible que esté en proceso de sincronización o el enlace sea inválido.' 
                : 'Intenta recargar'}
            </p>
            {shouldShowFallback && (
              <button
                onClick={handleRetry}
                className="mt-2 flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // status === 'success'
  return (
    <div className="relative group rounded-lg overflow-hidden">
      <img 
        src={receiptUrl} 
        alt={altText}
        className={cn(className, 'transition-all')}
      />
      <div className="absolute top-2 right-2 bg-emerald-500/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
      </div>
    </div>
  );
});

export default ReceiptImageViewer;
