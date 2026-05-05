import { Suspense } from 'react';
import StandaloneCatalog from '@/components/shop/StandaloneCatalog';
import EmergencyErrorBoundary from '@/components/EmergencyErrorBoundary';

const Catalog = () => {
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