import { Suspense } from 'react';
import StandaloneCatalog from '@/components/StandaloneCatalog';
import EmergencyErrorBoundary from '@/components/EmergencyErrorBoundary';
import { initializeCacheControl } from '@/lib/cacheControl';

const Catalog = () => {
  // Auto-limpieza: integrar lógica de cacheControl
  initializeCacheControl();

  return (
    <EmergencyErrorBoundary level="page">
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'hsl(222, 47%, 3%)' }}
      >
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando catálogo...</div>}>
          <StandaloneCatalog />
        </Suspense>
      </div>
    </EmergencyErrorBoundary>
  );
};

export default Catalog;