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
      logBox.innerHTML = 'Pestaña de Betcris detectada. Listo para sincronizar.';
    } else {
      statusCris.textContent = 'No detectada';
      statusCris.className = 'badge badge-warn';
      logBox.innerHTML = '⚠️ Abre tu pestaña de <b>Betcris</b> con tu sesión iniciada.';
    }

    if (res && res.bolOpen) {
      statusBol.textContent = 'Pestaña Abierta';
      statusBol.className = 'badge badge-ok';
    } else {
      statusBol.textContent = 'Se abrirá de fondo';
      statusBol.className = 'badge badge-ok';
    }
  });

  btnSync.addEventListener('click', () => {
    btnSync.disabled = true;
    btnText.textContent = '⏳ Sincronizando...';
    logBox.innerHTML = '⏳ Escaneando líneas en BetOnline y Betcris... Por favor espera unos segundos.';

    chrome.runtime.sendMessage({ action: 'START_FULL_SYNC' }, (response) => {
      btnSync.disabled = false;
      btnText.textContent = 'Sincronizar Líneas Ahora';

      if (!response) {
        logBox.innerHTML = '❌ Sin respuesta de la extensión. Recarga la página.';
        return;
      }

      const bolCount = response.betonlineCount || 0;
      const crisCount = response.betcrisCount || 0;

      if (bolCount > 0 || crisCount > 0) {
        logBox.innerHTML = `
          <div style="color: #34d399; font-weight: bold; margin-bottom: 4px;">✅ ¡Líneas sincronizadas!</div>
          <div>• BetOnline (R+H+E): <b>${bolCount}</b> partidos</div>
          <div>• Betcris (Hits+Carreras+Errores): <b>${crisCount}</b> partidos</div>
        `;
        if (response.crisNote) {
          logBox.innerHTML += `<div style="color: #fbbf24; margin-top: 6px;">💡 ${response.crisNote}</div>`;
        }
      } else {
        logBox.innerHTML = `
          <div style="color: #f87171; font-weight: bold; margin-bottom: 4px;">⚠️ No se detectaron líneas</div>
          <div style="font-size: 11px; color: #cbd5e1;">
            ${response.crisNote || 'Abre tu pestaña de Betcris y asegúrate de entrar al juego o a la lista de béisbol MLB.'}
          </div>
        `;
      }
    });
  });
});
