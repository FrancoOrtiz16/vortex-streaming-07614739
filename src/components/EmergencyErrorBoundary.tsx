import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * ErrorBoundary de Emergencia para Vortex Streaming
 * 
 * Características:
 * - Captura errores de componentes hijos
 * - Muestra lo que se puede (Header, Menu, etc)
 * - Permite reintentar
 * - Logging detallado para debugging
 */
export class EmergencyErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    console.error('[EmergencyErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[EmergencyErrorBoundary] Component stack:', errorInfo.componentStack);
    const newCount = this.state.errorCount + 1;
    this.setState({ errorCount: newCount });

    if (newCount > 3) {
      console.error('[EmergencyErrorBoundary] Too many errors, possible infinite loop');
    }
  }

  handleReset = () => {
    console.log('[EmergencyErrorBoundary] Resetting error state');
    this.setState({
      hasError: false,
      error: null,
    });
    window.location.reload();
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError) {
      // Si ya hay muchos errores, algo está muy mal
      if (errorCount > 3) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-[#030303]">
            <div className="text-center px-4">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Sistema en Mantenimiento</h1>
              <p className="text-muted-foreground mb-6">
                Estamos experimentando problemas. Por favor, intenta más tarde.
              </p>
              <button
                onClick={this.handleReset}
                className="px-6 py-2 rounded-lg gradient-neon text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Recargar Página
              </button>
            </div>
          </div>
        );
      }

      // Mostrar error amigable dependiendo del nivel
      if (level === 'page') {
        return (
          <div className="min-h-screen bg-[#030303] text-white flex flex-col">
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Error en la página</h2>
                <p className="text-muted-foreground mb-4 max-w-md">
                  {error?.message || 'Algo salió mal. Por favor intenta recargar.'}
                </p>
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white font-semibold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Component level: mostrar fallback si existe, si no, un error discreto
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <strong>Error:</strong> {error?.message || 'Error desconocido'}
        </div>
      );
    }

    return <>{children}</>;
  }
}

export default EmergencyErrorBoundary;
