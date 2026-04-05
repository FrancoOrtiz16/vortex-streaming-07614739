import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ProductGrid from '@/components/ProductGrid';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';

const Index = () => (
  <div className="min-h-screen flex flex-col" style={{ background: 'hsl(222, 47%, 3%)' }}>
    <Header />
    <main className="flex-1">
      <HeroSection />
      <ProductGrid />
    </main>
    <Footer />
    <WhatsAppFloat />
  </div>
);

export default Index;
