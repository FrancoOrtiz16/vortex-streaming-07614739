import * as React from 'react';

interface CheckoutErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
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
    this.props.onReset();
  }

  componentDidUpdate(prevProps: CheckoutErrorBoundaryProps) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
