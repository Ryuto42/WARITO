// ネイティブ(Capacitor)では SW 未使用: controllerchange が起動直後のリロードループを起こすため
var isNativeShell = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if (isNativeShell) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (rs) {
      rs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
  }
} else if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });

  const register = () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      setInterval(() => {
        reg.update();
      }, 60 * 60 * 1000);
    });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}
