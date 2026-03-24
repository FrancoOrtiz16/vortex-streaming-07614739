export type ProductCategory = 'streaming' | 'gaming';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  image: string;
  badge?: string;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Netflix Premium',
    description: 'Pantalla completa 4K + HDR. Hasta 4 dispositivos simultáneos.',
    price: 15.99,
    category: 'streaming',
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop',
    badge: 'Popular',
  },
  {
    id: '2',
    name: 'Disney+ Anual',
    description: 'Acceso a todo el catálogo de Disney, Marvel, Star Wars y más.',
    price: 89.99,
    category: 'streaming',
    image: 'https://images.unsplash.com/photo-1640499900704-b00dd3de30cd?w=400&h=300&fit=crop',
    badge: 'Oferta',
  },
  {
    id: '3',
    name: 'Spotify Premium',
    description: 'Música sin anuncios, descarga offline y audio de alta calidad.',
    price: 9.99,
    category: 'streaming',
    image: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400&h=300&fit=crop',
  },
  {
    id: '4',
    name: 'HBO Max',
    description: 'Series exclusivas, películas de estreno y documentales premium.',
    price: 12.99,
    category: 'streaming',
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop',
  },
  {
    id: '5',
    name: 'Free Fire - 1080 Diamantes',
    description: 'Recarga directa a tu cuenta. Entrega en menos de 5 minutos.',
    price: 9.99,
    category: 'gaming',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
    badge: 'Rápido',
  },
  {
    id: '6',
    name: 'PUBG Mobile - 600 UC',
    description: 'Unknown Cash para compras dentro del juego.',
    price: 7.99,
    category: 'gaming',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
  },
  {
    id: '7',
    name: 'Roblox - 800 Robux',
    description: 'Robux para personalizar tu avatar y acceder a experiencias premium.',
    price: 9.99,
    category: 'gaming',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
    badge: 'Nuevo',
  },
  {
    id: '8',
    name: 'PlayStation Plus 3 Meses',
    description: 'Juegos mensuales gratis, multijugador online y descuentos exclusivos.',
    price: 24.99,
    category: 'gaming',
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop',
  },
];
