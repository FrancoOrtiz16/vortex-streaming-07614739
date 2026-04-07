export interface CartProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  badge?: string;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

let listeners: (() => void)[] = [];
let cartItems: CartItem[] = [];

function notify() {
  listeners.forEach(l => l());
}

export function getCartItems() { return cartItems; }

export function addToCart(product: CartProduct) {
  if (!product?.id) return;
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

export function getCartSubtotal() {
  return cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
}

export function getCartDiscount() {
  const subtotal = getCartSubtotal();
  const totalItems = getCartCount();
  return totalItems >= 2 ? subtotal * 0.1 : 0;
}

export function getCartTotal() {
  return getCartSubtotal() - getCartDiscount();
}

export function getCartCount() {
  return cartItems.reduce((sum, i) => sum + i.quantity, 0);
}

export function subscribeCart(listener: () => void) {
  listeners.push(listener);
  return () => { listeners = listeners.filter(l => l !== listener); };
}
