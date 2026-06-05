import type { ProductCategory } from './products';

export interface FallbackProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: ProductCategory;
  badge?: string | null;
  plan_type?: string | null;
  orden_prioridad?: number | null;
  is_available?: boolean;
  group_name?: string | null;
}

/**
 * Catálogo de respaldo (Sandboxing).
 * Se usa cuando la base de datos falla. Nunca se renderiza pantalla negra.
 */
export const fallbackProducts: FallbackProduct[] = [
  { id: 'fb-1', name: 'Netflix Premium', description: 'Plan Premium 4K', price: 5.99, image_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop', category: 'streaming', badge: 'Popular', plan_type: 'Premium Mensual', orden_prioridad: 1, is_available: true, group_name: null },
  { id: 'fb-2', name: 'Disney+ Estándar', description: 'Plan Estándar', price: 4.5, image_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=400&h=300&fit=crop', category: 'streaming', badge: null, plan_type: 'Premium Mensual', orden_prioridad: 2, is_available: true, group_name: null },
  { id: 'fb-3', name: 'Spotify Premium', description: 'Música sin anuncios', price: 3.5, image_url: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400&h=300&fit=crop', category: 'streaming', badge: null, plan_type: 'Premium Mensual', orden_prioridad: 3, is_available: true, group_name: null },
  { id: 'fb-4', name: 'HBO Max', description: 'Plan Estándar', price: 4.99, image_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop', category: 'streaming', badge: null, plan_type: 'Premium Mensual', orden_prioridad: 4, is_available: true, group_name: null },
  { id: 'fb-5', name: 'Free Fire 1080 Diamantes', description: 'Recarga directa', price: 9.99, image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop', category: 'gaming', badge: 'Rápido', plan_type: 'Recarga', orden_prioridad: 5, is_available: true, group_name: null },
  { id: 'fb-6', name: 'PlayStation Plus 3 Meses', description: 'Suscripción 3 meses', price: 24.99, image_url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop', category: 'gaming', badge: null, plan_type: 'Suscripción', orden_prioridad: 6, is_available: true, group_name: null },
];