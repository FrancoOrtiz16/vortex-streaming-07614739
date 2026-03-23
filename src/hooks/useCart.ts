import { useSyncExternalStore } from 'react';
import {
  subscribeCart,
  getCartItems,
  getCartCount,
  getCartTotal,
  addToCart,
  removeFromCart,
  clearCart,
} from '@/store/cartStore';
import { Product } from '@/data/products';

export function useCart() {
  const items = useSyncExternalStore(subscribeCart, getCartItems);
  const count = useSyncExternalStore(subscribeCart, getCartCount);
  const total = useSyncExternalStore(subscribeCart, getCartTotal);

  return {
    items,
    count,
    total,
    addItem: (product: Product) => addToCart(product),
    removeItem: (id: string) => removeFromCart(id),
    clear: () => clearCart(),
  };
}
