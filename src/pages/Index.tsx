import { Suspense } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ProductGrid from '@/components/ProductGrid';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import EmergencyErrorBoundary from '@/components/EmergencyErrorBoundary';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Cargando catálogo...</p>
    </div>
  </div>
);

const Index = () => {
  return (
    <EmergencyErrorBoundary level="page">
      <div 
        className="min-h-screen flex flex-col" 
        style={{ background: 'hsl(222, 47%, 3%)' }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Header />
        </Suspense>
        
        <main className="flex-1">
          <Suspense fallback={<LoadingFallback />}>
            <HeroSection />
          </Suspense>
          
          <Suspense fallback={<LoadingFallback />}>
            <EmergencyErrorBoundary level="component">
              <ProductGrid />
            </EmergencyErrorBoundary>
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <Footer />
        </Suspense>

        <Suspense fallback={null}>
          <WhatsAppFloat />
        </Suspense>
      </div>
    </EmergencyErrorBoundary>
  );
};

export default Index;
