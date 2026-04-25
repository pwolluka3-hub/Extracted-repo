'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const bootstrap = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));

          if ('caches' in window) {
            const cacheKeys = await window.caches.keys();
            await Promise.all(
              cacheKeys
                .filter((key) => key.startsWith('nexusai-shell-'))
                .map((key) => window.caches.delete(key))
            );
          }

          const registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('[v0] Service Worker registered:', registration.scope);
          void registration.update();
        } catch (error) {
          console.warn('[v0] Service Worker registration failed:', error);
        }
      };

      void bootstrap();
    }
  }, []);

  return null;
}
