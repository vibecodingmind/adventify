// PWA Utility functions

/**
 * Register the service worker
 */
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'activated' &&
                navigator.serviceWorker.controller
              ) {
                // New service worker activated, could show update notification
                console.log('New service worker activated');
              }
            });
          }
        });
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    });
  }
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Get cached data from IndexedDB/localStorage
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(`adventify_cache_${key}`);
    if (!item) return null;
    const parsed = JSON.parse(item);
    // Check if expired (default 1 hour)
    if (parsed.expiry && Date.now() > parsed.expiry) {
      localStorage.removeItem(`adventify_cache_${key}`);
      return null;
    }
    return parsed.data as T;
  } catch {
    return null;
  }
}

/**
 * Set cached data in localStorage
 */
export async function setCachedData<T>(
  key: string,
  data: T,
  ttlMs: number = 3600000 // Default 1 hour
): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const item = {
      data,
      expiry: Date.now() + ttlMs,
    };
    localStorage.setItem(`adventify_cache_${key}`, JSON.stringify(item));
  } catch (error) {
    console.error('Failed to cache data:', error);
  }
}

/**
 * Remove cached data
 */
export async function removeCachedData(key: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`adventify_cache_${key}`);
  } catch {
    // ignore
  }
}

/**
 * Clear all Adventify cached data
 */
export async function clearAllCachedData(): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith('adventify_cache_')
    );
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}
