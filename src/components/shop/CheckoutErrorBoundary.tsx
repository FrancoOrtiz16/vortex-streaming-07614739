import * as React from 'react';

interface CheckoutErrorBoundaryProps {
  children: React.ReactNode;
}

interface CheckoutErrorBoundaryState {
  hasError: boolean;
}

export class CheckoutErrorBoundary extends React.Component<
  CheckoutErrorBoundaryProps,
  CheckoutErrorBoundaryState
> {
  constructor(props: CheckoutErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CheckoutErrorBoundary] Captured error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: CheckoutErrorBoundaryProps) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    return this.props.children;
  }
}
