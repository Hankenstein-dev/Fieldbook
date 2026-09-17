import { nativeAndroid } from './native/platform';
import { registerSW } from 'virtual:pwa-register';

let available = false;
export const appUpdateAvailable = () => available;
function announceUpdate() {
  available = true;
  window.dispatchEvent(new Event('fieldbook-update'));
}

if (!nativeAndroid) {
  registerSW({
    immediate: true,
    onNeedRefresh: announceUpdate,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      if (registration.waiting) announceUpdate();
      // A tab can stay open throughout a deployment. Check when the user returns.
      let lastCheck = 0;
      const check = () => {
        if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 15000) return;
        lastCheck = Date.now();
        void registration.update().catch(() => undefined);
      };
      window.addEventListener('focus', check);
      document.addEventListener('visibilitychange', check);
    },
  });
}

export async function applyAppUpdate() {
  if (!('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  // Explicitly fetch the latest worker before reloading the cached app shell.
  await registration?.update();
  const worker = registration?.installing ?? registration?.waiting;
  if (worker) {
    // Listen directly: Workbox can classify an update from another tab as external,
    // in which case its default reload callback is not always invoked.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('The update could not finish. Please try again.'));
      }, 60000);
      function cleanup() {
        clearTimeout(timer);
        worker!.removeEventListener('statechange', changed);
      }
      function changed() {
        if (worker!.state === 'installed') worker!.postMessage({ type: 'SKIP_WAITING' });
        if (worker!.state === 'activated') {
          cleanup();
          resolve();
        }
        if (worker!.state === 'redundant') {
          cleanup();
          reject(new Error('The update could not be installed.'));
        }
      }
      worker.addEventListener('statechange', changed);
      changed();
    });
  }
  window.location.reload();
}
