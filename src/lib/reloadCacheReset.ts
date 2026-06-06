const CART_STORAGE_KEY = 'vortex_cart_items_v1';

const isReloadNavigation = (): boolean => {
  if (typeof window === 'undefined') return false;

  const navEntries = performance.getEntriesByType('navigation');
  if (navEntries.length > 0) {
    return (navEntries[0] as PerformanceNavigationTiming).type === 'reload';
  }

  const nav = (performance as any).navigation;
  return nav?.type === 1;
};

const clearAppStorage = () => {
  if (typeof window === 'undefined') return;

  const preservedKeys = new Set([CART_STORAGE_KEY]);
  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (!preservedKeys.has(key)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  window.sessionStorage.clear();
};

const clearBrowserCaches = async () => {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  } catch (error) {
    console.warn('[reloadCacheReset] Error clearing Cache API:', error);
  }
};

const runReloadCacheReset = async () => {
  if (!isReloadNavigation()) return;

  clearAppStorage();
  await clearBrowserCaches();
};

void runReloadCacheReset();
