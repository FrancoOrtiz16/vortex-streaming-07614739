import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ServiceGrid from '@/components/ServiceGrid';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';

const Index = () => (
  <div className="min-h-screen flex flex-col" style={{ background: 'hsl(222, 47%, 3%)' }}>
    <Header />
    <main className="flex-1">
      <HeroSection />
      <ServiceGrid />
    </main>
    <Footer />
    <WhatsAppFloat />
  </div>
);

export default Index;
