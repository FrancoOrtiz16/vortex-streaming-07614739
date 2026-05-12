import { Suspense, lazy } from 'react';

const StandaloneCatalog = lazy(() => import('@/components/shop/StandaloneCatalog'));

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
  <Suspense fallback={<CatalogSkeleton />}>
    <StandaloneCatalog />
  </Suspense>
);

export default CatalogVault;