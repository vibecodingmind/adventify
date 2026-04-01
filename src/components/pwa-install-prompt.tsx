'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getIsInstalled() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function PwaInstallPrompt() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  const handler = useCallback((e: Event) => {
    e.preventDefault();
    deferredPromptRef.current = e as BeforeInstallPromptEvent;
    if (!getIsInstalled()) {
      setCanInstall(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [handler]);

  const handleInstall = async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
      }
    } catch (error) {
      console.error('PWA install error:', error);
    }

    deferredPromptRef.current = null;
  };

  const handleDismiss = () => {
    setCanInstall(false);
  };

  if (!canInstall || getIsInstalled()) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-xl shadow-lg border border-emerald-100 p-4 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">Install Adventify</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Add to your home screen for quick access
          </p>
          <Button
            size="sm"
            onClick={handleInstall}
            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
          >
            Install App
          </Button>
        </div>
      </div>
    </div>
  );
}
