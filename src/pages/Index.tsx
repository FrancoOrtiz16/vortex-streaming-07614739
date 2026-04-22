import { Suspense } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import StandaloneCatalog from '@/components/StandaloneCatalog';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import EmergencyErrorBoundary from '@/components/EmergencyErrorBoundary';

const Index = () => {
  return (
    <EmergencyErrorBoundary level="page">
      <div 
        className="min-h-screen flex flex-col" 
        style={{ background: 'hsl(222, 47%, 3%)' }}
      >
        <Suspense fallback={null}>
          <Header />
        </Suspense>
        
        <main className="flex-1">
          <HeroSection />
          <StandaloneCatalog />
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
