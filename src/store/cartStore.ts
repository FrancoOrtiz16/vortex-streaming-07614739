import { Product } from '@/data/products';

interface CartItem {
  product: Product;
  quantity: number;
}

let listeners: (() => void)[] = [];
let cartItems: CartItem[] = [];

function notify() {
  listeners.forEach(l => l());
}

export function getCartItems() { return cartItems; }

export function addToCart(product: Product) {
  const existing = cartItems.find(i => i.product.id === product.id);
  if (existing) {
    cartItems = cartItems.map(i =>
      i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
    );
  } else {
    cartItems = [...cartItems, { product, quantity: 1 }];
  }
  notify();
}

export function removeFromCart(productId: string) {
  cartItems = cartItems.filter(i => i.product.id !== productId);
  notify();
}

export function clearCart() {
  cartItems = [];
  notify();
}

export function getCartTotal() {
  return cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
}

export function getCartCount() {
  return cartItems.reduce((sum, i) => sum + i.quantity, 0);
}

export function subscribeCart(listener: () => void) {
  listeners.push(listener);
  return () => { listeners = listeners.filter(l => l !== listener); };
}
