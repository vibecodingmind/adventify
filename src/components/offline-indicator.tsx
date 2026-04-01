'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

let previousOnlineStatus = true;

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  const current = navigator.onLine;
  previousOnlineStatus = current;
  return current;
}

function getServerSnapshot() {
  return true;
}

export function OfflineIndicator() {
  const isOnline = useSyncExternalStore(subscribeToOnlineStatus, getOnlineSnapshot, getServerSnapshot);
  const wasOffline = !isOnline;

  // We derive "back online" state from the online status directly
  // The indicator shows when offline or during brief online moments
  // For simplicity, only show the offline banner when actually offline
  // and show a "back online" indicator using a CSS animation approach

  const statusLabel = isOnline ? null : (
    <div className="bg-amber-500 text-white">
      <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>You are offline. Some features may be unavailable.</span>
      </div>
    </div>
  );

  return statusLabel;
}
