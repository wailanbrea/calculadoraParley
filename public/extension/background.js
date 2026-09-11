// Service Worker (Manifest V3) - BSolutions Parley Sync
const API_BASE = "https://calcparley.bsolutions.dev/api.php";

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. Obtener líneas de BetOnline
async function syncBetonline(targetApi) {
  const apiUrl = targetApi ? `${targetApi}?action=save_hce_betonline` : `${API_BASE}?action=save_hce_betonline`;
  
  // Buscar si ya hay una pestaña de BetOnline abierta
  const tabs = await chrome.tabs.query({ url: "*://*.betonline.ag/*" });
  let bolTab = tabs[0];
  let createdTab = false;

  if (!bolTab) {
    bolTab = await chrome.tabs.create({
      url: "https://www.betonline.ag/sportsbook/baseball/r+h+e",
      active: false
    });
    createdTab = true;
    // Esperar a que cargue
    await delay(3500);
  }

  try {
    const response = await chrome.tabs.sendMessage(bolTab.id, { action: 'SCRAPE_BETONLINE' });
    if (response && response.games && response.games.length > 0) {
      // Guardar en la API
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: response.games })
      });
      if (createdTab) await chrome.tabs.remove(bolTab.id);
      return { success: true, count: response.games.length };
    }
  } catch (e) {
    console.warn('[BSolutions Sync] Error raspando BetOnline:', e);
  }

  if (createdTab) {
    try { await chrome.tabs.remove(bolTab.id); } catch(e) {}
  }
  return { success: false, count: 0 };
}

// 2. Obtener líneas de Betcris
async function syncBetcris(targetApi) {
  const apiUrl = targetApi ? `${targetApi}?action=save_hce_betcris` : `${API_BASE}?action=save_hce_betcris`;

  // Buscar pestaña de Betcris donde el usuario ya esté conectado
  const tabs = await chrome.tabs.query({ url: "*://*.betcris.do/*" });
  
  if (tabs.length === 0) {
    return {
      success: false,
      count: 0,
      message: "No se encontró pestaña de Betcris abierta. Abre tu sesión en Betcris y vuelve a sincronizar."
    };
  }

  const crisTab = tabs[0];

  try {
    const response = await chrome.tabs.sendMessage(crisTab.id, { action: 'SCRAPE_BETCRIS' });
    if (response && response.games && response.games.length > 0) {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: response.games, append: true })
      });
      return { success: true, count: response.games.length };
    }
  } catch (e) {
    console.warn('[BSolutions Sync] Error raspando Betcris:', e);
    return { success: false, count: 0, error: e.message };
  }

  return { success: false, count: 0 };
}

// Escuchar peticiones desde content scripts o popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_FULL_SYNC') {
    (async () => {
      try {
        const [bolRes, crisRes] = await Promise.all([
          syncBetonline(request.targetApi),
          syncBetcris(request.targetApi)
        ]);

        sendResponse({
          success: true,
          betonlineCount: bolRes.count,
          betcrisCount: crisRes.count,
          crisNote: crisRes.message || null
        });
      } catch (err) {
        sendResponse({
          success: false,
          error: err.message
        });
      }
    })();
    return true; // Mantener canal abierto para respuesta asíncrona
  }

  if (request.action === 'CHECK_STATUS') {
    (async () => {
      const crisTabs = await chrome.tabs.query({ url: "*://*.betcris.do/*" });
      const bolTabs = await chrome.tabs.query({ url: "*://*.betonline.ag/*" });
      sendResponse({
        crisOpen: crisTabs.length > 0,
        bolOpen: bolTabs.length > 0
      });
    })();
    return true;
  }
});
