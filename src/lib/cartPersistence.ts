const CART_STORAGE_KEY = 'vortex_cart_items_v1';
const BROADCAST_CHANNEL_NAME = 'vortex_cart_channel';

export function loadCartItemsFromStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.warn('[cartPersistence] Error parsing cart from storage', error);
    return [];
  }
}

export function saveCartItemsToStorage(items: unknown[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: 'CART_UPDATED', payload: items });
      channel.close();
    }
  } catch (error) {
    console.warn('[cartPersistence] Error saving cart to storage', error);
  }
}

export function subscribeCartStorage(listener: (items: unknown[]) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== CART_STORAGE_KEY) return;
    if (!event.newValue) {
      listener([]);
      return;
    }

    try {
      const parsed = JSON.parse(event.newValue);
      listener(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.warn('[cartPersistence] Error parsing storage event payload', error);
    }
  };

  const handleBroadcast = (event: MessageEvent) => {
    if (!event.data || event.data.type !== 'CART_UPDATED') return;
    listener(Array.isArray(event.data.payload) ? event.data.payload : []);
  };

  window.addEventListener('storage', handleStorageEvent);

  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(BROADCAST_CHANNEL_NAME) : null;
  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
      channel.close();
    }
  };
}
