import { useSyncExternalStore } from 'react';
import {
  subscribeCart,
  getCartItems,
  getCartCount,
  getCartTotal,
  getCartSubtotal,
  getCartDiscount,
  addToCart,
  removeFromCart,
  clearCart,
} from '@/store/cartStore';
import { Product } from '@/data/products';

export function useCart() {
  const items = useSyncExternalStore(subscribeCart, getCartItems);
  const count = useSyncExternalStore(subscribeCart, getCartCount);
  const total = useSyncExternalStore(subscribeCart, getCartTotal);
  const subtotal = useSyncExternalStore(subscribeCart, getCartSubtotal);
  const discount = useSyncExternalStore(subscribeCart, getCartDiscount);

  return {
    items,
    count,
    total,
    subtotal,
    discount,
    addItem: (product: Product) => addToCart(product),
    removeItem: (id: string) => removeFromCart(id),
    clear: () => clearCart(),
  };
}
