// Script para popup.html
document.addEventListener('DOMContentLoaded', async () => {
  const statusCris = document.getElementById('status-cris');
  const statusBol = document.getElementById('status-bol');
  const btnSync = document.getElementById('btn-sync');
  const btnText = document.getElementById('btn-text');
  const logBox = document.getElementById('log-box');

  // Comprobar estado de pestañas
  chrome.runtime.sendMessage({ action: 'CHECK_STATUS' }, (res) => {
    if (res && res.crisOpen) {
      statusCris.textContent = 'Pestaña Abierta';
      statusCris.className = 'badge badge-ok';
    } else {
      statusCris.textContent = 'No detectada';
      statusCris.className = 'badge badge-warn';
      logBox.textContent = 'Tip: Ten abierta tu pestaña de Betcris con la sesión activa.';
    }
  });

  btnSync.addEventListener('click', () => {
    btnSync.disabled = true;
    btnText.textContent = 'Sincronizando...';
    logBox.textContent = '⏳ Escaneando líneas en BetOnline y Betcris...';

    chrome.runtime.sendMessage({ action: 'START_FULL_SYNC' }, (response) => {
      btnSync.disabled = false;
      btnText.textContent = 'Sincronizar Líneas Ahora';

      if (response && response.success) {
        logBox.innerHTML = `✅ <b>¡Completado!</b><br>BetOnline: ${response.betonlineCount} partidos.<br>Betcris: ${response.betcrisCount} partidos.`;
        if (response.crisNote) {
          logBox.innerHTML += `<br><span style="color:#fbbf24;">⚠️ ${response.crisNote}</span>`;
        }
      } else {
        logBox.innerHTML = `❌ Error: ${response?.error || 'No se pudo sincronizar'}`;
      }
    });
  });
});
