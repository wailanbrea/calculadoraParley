// Script para popup.html v1.0.1
document.addEventListener('DOMContentLoaded', async () => {
  const statusCris = document.getElementById('status-cris');
  const statusBol = document.getElementById('status-bol');
  const urlCris = document.getElementById('url-cris');
  const urlBol = document.getElementById('url-bol');
  const btnSync = document.getElementById('btn-sync');
  const btnText = document.getElementById('btn-text');
  const logBox = document.getElementById('log-box');

  // Comprobar estado de pestañas
  chrome.runtime.sendMessage({ action: 'CHECK_STATUS' }, (res) => {
    if (res && res.crisOpen) {
      statusCris.textContent = 'Pestaña Detectada';
      statusCris.className = 'badge badge-ok';
      urlCris.textContent = res.crisUrl || 'be.betcris.do';
      logBox.innerHTML = 'Pestaña de Betcris lista. Haz clic en el botón verde.';
    } else {
      statusCris.textContent = 'No abierta';
      statusCris.className = 'badge badge-warn';
      urlCris.textContent = 'Abre tu sesión en https://be.betcris.do';
      logBox.innerHTML = '⚠️ Abre tu pestaña de <b>Betcris</b> con tu sesión iniciada.';
    }

    if (res && res.bolOpen) {
      statusBol.textContent = 'Pestaña Abierta';
      statusBol.className = 'badge badge-ok';
      urlBol.textContent = res.bolUrl || 'betonline.ag';
    } else {
      statusBol.textContent = 'Se abrirá de fondo';
      statusBol.className = 'badge badge-ok';
      urlBol.textContent = 'Auto-apertura en segundo plano';
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
        logBox.innerHTML = '❌ Sin respuesta del background worker.';
        return;
      }

      const bolCount = response.betonlineCount || 0;
      const crisCount = response.betcrisCount || 0;

      if (bolCount > 0 || crisCount > 0) {
        logBox.innerHTML = `
          <div style="color: #34d399; font-weight: bold; margin-bottom: 4px;">🎉 ¡Líneas Sincronizadas!</div>
          <div>• BetOnline (R+H+E): <b>${bolCount}</b> partidos</div>
          <div>• Betcris (HCE): <b>${crisCount}</b> partidos</div>
        `;
        if (response.crisNote) {
          logBox.innerHTML += `<div style="color: #fbbf24; margin-top: 6px; font-size: 10px;">💡 ${response.crisNote}</div>`;
        }
      } else {
        logBox.innerHTML = `
          <div style="color: #f87171; font-weight: bold; margin-bottom: 4px;">⚠️ 0 líneas encontradas</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">
            ${response.crisNote || 'Abre el partido en Betcris o asegúrate de que la pestaña de BetOnline esté cargada.'}
          </div>
        `;
      }
    });
  });
});
