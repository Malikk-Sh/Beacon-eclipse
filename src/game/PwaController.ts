export class PwaController {
  register(): void {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => registration.update())
        .catch((error) => console.warn('PWA service worker registration failed', error));
    }, { once: true });
  }
}
