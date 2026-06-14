import { registerSW } from 'virtual:pwa-register';

export const registerServiceWorker = () => {
  if (!import.meta.env.PROD) return;

  registerSW({
    immediate: true,
    onRegisteredSW(_, registration) {
      registration?.update().catch(() => undefined);
    },
  });
};
