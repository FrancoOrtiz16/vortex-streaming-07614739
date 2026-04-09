import * as React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Captured error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[250px] flex flex-col items-center justify-center rounded-3xl border border-destructive/30 bg-black/70 p-8 text-center text-white">
          <p className="text-lg font-semibold text-destructive">Se produjo un error al cargar la sección.</p>
          <p className="mt-3 text-sm text-slate-400">Recarga la página o vuelve a intentar más tarde.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
