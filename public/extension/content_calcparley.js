// Bridge entre CalculadoraParley Web y la Extensión Chrome BSolutions Sync
(function () {
  "use strict";

  // Marcar en el DOM que la extensión está activa
  document.documentElement.setAttribute('data-bsolutions-sync-installed', 'true');
  window.sessionStorage.setItem('__BSOLUTIONS_PARLEY_EXT__', '1.0.0');

  // Notificar al componente React que la extensión está lista
  window.dispatchEvent(new CustomEvent('bsolutions_sync_extension_ready', {
    detail: { version: '1.0.0', status: 'ready' }
  }));

  // Escuchar peticiones desde la aplicación web
  window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'CALCPARLEY_CHECK_EXTENSION') {
      window.postMessage({
        type: 'CALCPARLEY_EXTENSION_PONG',
        version: '1.0.0',
        installed: true
      }, '*');
    }

    if (event.data.type === 'CALCPARLEY_TRIGGER_SYNC') {
      try {
        chrome.runtime.sendMessage({
          action: 'START_FULL_SYNC',
          targetApi: event.data.targetApi || (window.location.origin + '/api.php')
        }, (response) => {
          if (chrome.runtime.lastError) {
            window.postMessage({
              type: 'CALCPARLEY_SYNC_RESULT',
              success: false,
              error: chrome.runtime.lastError.message
            }, '*');
          } else {
            window.postMessage({
              type: 'CALCPARLEY_SYNC_RESULT',
              ...response
            }, '*');
          }
        });
      } catch (err) {
        window.postMessage({
          type: 'CALCPARLEY_SYNC_RESULT',
          success: false,
          error: err.message
        }, '*');
      }
    }
  });

  // Saludo en consola para verificar funcionamiento
  console.log('⚡ [BSolutions Sync] Extensión conectada con CalculadoraParley v1.0.0');
})();
