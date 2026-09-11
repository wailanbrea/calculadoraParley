// Bridge entre CalculadoraParley Web y la Extensión Chrome BSolutions Sync
(function () {
  "use strict";

  // Responder activamente solo a los pings en tiempo real
  window.addEventListener('message', (event) => {
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

  // Notificar al cargar
  window.postMessage({
    type: 'CALCPARLEY_EXTENSION_PONG',
    version: '1.0.0',
    installed: true
  }, '*');

  console.log('⚡ [BSolutions Sync] Extensión conectada activamente con CalculadoraParley');
})();
