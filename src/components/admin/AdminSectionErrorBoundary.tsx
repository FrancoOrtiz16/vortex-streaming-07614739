import { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AdminSectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
  onRetry?: () => void;
}

/**
 * Specialized ErrorBoundary for Admin Sections
 * Ensures that one section's failure doesn't crash others
 * Provides visual feedback and recovery options
 */
function AdminSectionErrorFallback({ 
  error, 
  sectionName,
  onRetry 
}: { 
  error: Error; 
  sectionName: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-sm text-destructive mb-1">
            Error en {sectionName}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {error.message || 'Ha ocurrido un error inesperado'}
          </p>
          <code className="text-[10px] bg-background/40 rounded px-2 py-1 block mb-3 overflow-x-auto text-destructive/70 max-h-16 overflow-y-auto">
            {error.stack?.split('\n')[0]}
          </code>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminSectionErrorBoundary({ 
  children, 
  sectionName,
  onRetry
}: AdminSectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <AdminSectionErrorFallback 
          error={error} 
          sectionName={sectionName}
          onRetry={onRetry}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
