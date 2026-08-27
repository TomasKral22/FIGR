import { registerSW } from 'virtual:pwa-register';

export const registerServiceWorker = () => {
  if (!import.meta.env.PROD || window.desktopApp || window.location.protocol === 'file:') return;

  registerSW({
    immediate: true,
    onRegisteredSW(_, registration) {
      registration?.update().catch(() => undefined);
    },
  });
};
