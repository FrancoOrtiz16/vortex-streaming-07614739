import { Component, type ErrorInfo, type ReactNode, Suspense, lazy } from 'react';
import { ShoppingCart, AlertTriangle } from 'lucide-react';
import { fallbackProducts, type FallbackProduct } from '@/data/fallbackProducts';

/**
 * CatalogVault — Catálogo invulnerable y 100% aislado (Sandboxing).
 * - Si el componente real (StandaloneCatalog) lanza error, se muestra el fallback hardcoded.
 * - No comparte estado global con el panel de administración.
 */

const StandaloneCatalog = lazy(() => import('@/components/StandaloneCatalog'));

interface VaultState {
  hasError: boolean;
}

class CatalogErrorBoundary extends Component<{ children: ReactNode }, VaultState> {
  state: VaultState = { hasError: false };

  static getDerivedStateFromError(): VaultState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CatalogVault] error capturado, usando fallback:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) return <FallbackCatalog reason="Servicio temporalmente no disponible" />;
    return this.props.children;
  }
}

const FallbackCard = ({ product }: { product: FallbackProduct }) => (
  <div className="rounded-2xl border border-white/10 bg-[#0f1729] p-4 flex flex-col">
    <div className="h-32 mb-3 overflow-hidden rounded-xl bg-black/40 flex items-center justify-center">
      <img src={product.image_url} alt={product.name} className="object-contain h-full" loading="lazy" />
    </div>
    <h3 className="font-display font-bold text-white text-sm mb-1">{product.name}</h3>
    <div className="font-display font-bold text-2xl mb-3" style={{ color: '#3b82f6', textShadow: '0 0 12px rgba(59,130,246,0.7)' }}>
      ${product.price.toFixed(2)}
    </div>
    <button
      disabled
      className="mt-auto w-full flex h-9 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-slate-300"
    >
      <ShoppingCart className="w-3.5 h-3.5" />
      Próximamente
    </button>
  </div>
);

const FallbackCatalog = ({ reason }: { reason?: string }) => (
  <section id="catalogo" className="py-16">
    <div className="mx-auto max-w-[1480px] px-4">
      <div className="mb-6 rounded-3xl bg-[#111111] px-8 py-8">
        <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
          Catálogo de <span className="text-blue-500">Streaming</span> y Gaming
        </h2>
        <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          {reason || 'Mostrando catálogo de respaldo'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {fallbackProducts.map((p) => <FallbackCard key={p.id} product={p} />)}
      </div>
    </div>
  </section>
);

const CatalogSkeleton = () => (
  <section className="py-16">
    <div className="mx-auto max-w-[1480px] px-4">
      <div className="h-32 rounded-3xl bg-white/5 animate-pulse mb-6" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  </section>
);

const CatalogVault = () => (
  <CatalogErrorBoundary>
    <Suspense fallback={<CatalogSkeleton />}>
      <StandaloneCatalog />
    </Suspense>
  </CatalogErrorBoundary>
);

export default CatalogVault;