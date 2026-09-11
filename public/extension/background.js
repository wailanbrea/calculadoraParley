// Service Worker (Manifest V3) - BSolutions Parley Sync v1.0.1
const API_BASE = "https://calcparley.bsolutions.dev/api.php";

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForTabLoad(tabId, timeoutMs = 12000) {
  return new Promise(resolve => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }, timeoutMs);

    function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Injected function for BetOnline
async function scrapeBetonlineDOM() {
  const MLB_TEAMS = [
    'diamondbacks', 'braves', 'orioles', 'red sox', 'cubs', 'white sox', 'reds', 'guardians',
    'rockies', 'tigers', 'astros', 'royals', 'angels', 'dodgers', 'marlins', 'brewers',
    'twins', 'mets', 'yankees', 'athletics', 'phillies', 'pirates', 'padres', 'giants',
    'mariners', 'cardinals', 'rays', 'rangers', 'blue jays', 'nationals'
  ];

  // Esperar activamente a que los bloques de partidos aparezcan en el DOM
  let links = [];
  for (let attempt = 0; attempt < 25; attempt++) {
    links = Array.from(document.querySelectorAll('a')).map(a => a.innerText.trim()).filter(t => t.includes('Total') && t.includes('O '));
    if (links.length > 0) break;
    await new Promise(r => setTimeout(r, 500));
  }

  const games = [];
  for (const text of links) {
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    const totalIdx = lines.findIndex(l => l.toLowerCase() === 'total');
    if (totalIdx === -1) continue;

    const beforeTotal = lines.slice(0, totalIdx);
    const candidateTeams = beforeTotal.filter(l => 
      !l.includes('Starts in') && 
      !l.includes('Today,') && 
      !/^\d+\s*-?$/.test(l) && 
      !/^[A-Z]\.\s*[A-Za-z]+.*-[RL]$/i.test(l)
    );

    let away = candidateTeams[0] || '';
    let home = candidateTeams[1] || '';

    const afterTotal = lines.slice(totalIdx + 1);
    let line = '';
    let over = '';
    let under = '';

    for (let i = 0; i < afterTotal.length; i++) {
      const item = afterTotal[i];
      if (/^O\s*(\d+(\.\d+)?)/i.test(item)) {
        line = item.replace(/^O\s*/i, '').trim();
        if (i + 1 < afterTotal.length) over = afterTotal[i + 1];
      } else if (/^U\s*(\d+(\.\d+)?)/i.test(item)) {
        if (!line) line = item.replace(/^U\s*/i, '').trim();
        if (i + 1 < afterTotal.length) under = afterTotal[i + 1];
      }
    }

    const isMlb = (t) => MLB_TEAMS.some(w => t.toLowerCase().includes(w));
    if (away && home && line && (isMlb(away) || isMlb(home))) {
      games.push({
        away,
        home,
        total: parseFloat(line),
        line,
        over_odds: parseInt(over, 10),
        under_odds: parseInt(under, 10),
        over,
        under,
        raw: text
      });
    }
  }

  return {
    url: window.location.href,
    title: document.title,
    linksFound: links.length,
    games: games
  };
}

// Injected function for Betcris
async function scrapeBetcrisDOM() {
  function parseFlexibleBetcris(text) {
    const clean = (text || '').replace(/\u00a0/g, ' ');
    const games = [];

    // Patrón 1: Bloque con equipos y Total Hits+Carreras+Errores (con o sin dos puntos)
    const pattern = /([a-zA-Z0-9\s.]+?)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+?)\s*(?::|\n|\r|\|)?\s*(?:Total\s*(?:de\s*)?)?hits?\s*[\+,y]\s*carreras?\s*[\+,y]\s*errores?[\s\S]*?(?:Ov|Over)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})[\s\S]*?(?:Un|Under)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})/gi;

    let m;
    while ((m = pattern.exec(clean)) !== null) {
      let away = m[1].replace(/^[0-9\s\-]+/, '').trim();
      let home = m[2].replace(/^[0-9\s\-]+/, '').replace(/[\r\n]+.*$/, '').trim();
      games.push({
        away,
        home,
        total: parseFloat(m[3]),
        line: String(m[3]),
        over_odds: parseInt(m[4], 10),
        under_odds: parseInt(m[6], 10),
        over: String(m[4]),
        under: String(m[6])
      });
    }

    // Patrón 2: Mercado individual en pantalla con búsqueda de equipos en encabezado
    if (games.length === 0) {
      const hceMatch = clean.match(/hits?\s*[\+,y]\s*carreras?\s*[\+,y]\s*errores?[\s\S]*?(?:Ov|Over)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})[\s\S]*?(?:Un|Under)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})/i);
      if (hceMatch) {
        let away = '', home = '';
        const tm = clean.match(/([a-zA-Z0-9\s.]+?)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+?)(?:\s*:|\n|\r|\||\s+Total)/i)
          || (document.title && document.title.match(/([a-zA-Z0-9\s.]+?)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+)/i));
        if (tm) {
          away = tm[1].replace(/^[0-9\s\-]+/, '').trim();
          home = tm[2].replace(/^[0-9\s\-]+/, '').replace(/[\r\n]+.*$/, '').trim();
        }
        if (away && home) {
          games.push({
            away,
            home,
            total: parseFloat(hceMatch[1]),
            line: String(hceMatch[1]),
            over_odds: parseInt(hceMatch[2], 10),
            under_odds: parseInt(hceMatch[4], 10),
            over: String(hceMatch[2]),
            under: String(hceMatch[4])
          });
        }
      }
    }

    return games;
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rawText = document.body.innerText || '';

  // 1. Verificar si en el texto de la pantalla ya está visible el bloque de HCE
  const direct = parseFlexibleBetcris(rawText);
  if (direct.length > 0) {
    return {
      status: 'success',
      url: window.location.href,
      games: direct,
      method: 'direct_screen'
    };
  }

  // 2. Buscar elementos de partidos en la vista flat o categoría
  const gameCards = Array.from(document.querySelectorAll(
    '.schedule__game, [class*="schedule__game"], .schedule__game-details, a[href*="/game/"], [class*="game-item"], [class*="event-item"]'
  ));

  if (gameCards.length > 0) {
    const results = [];
    for (let i = 0; i < Math.min(gameCards.length, 20); i++) {
      const card = gameCards[i];
      try {
        const clickTarget = card.querySelector(
          '.schedule__game-more-markets, [class*="more-markets"], .schedule__team-name, button, a'
        ) || card;

        clickTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clickTarget.click();
        await sleep(650);

        const parsed = parseFlexibleBetcris(document.body.innerText);
        if (parsed && parsed.length > 0) {
          for (const g of parsed) {
            if (!results.some(r => r.away === g.away && r.home === g.home)) {
              results.push(g);
            }
          }
        }
      } catch (e) {}
      await sleep(200);
    }

    if (results.length > 0) {
      return { status: 'success', url: window.location.href, games: results, method: 'flat_crawler' };
    }
  }

  // 3. Si no se encontró nada, reportar diagnóstico detallado
  return {
    status: 'no_hce_found',
    url: window.location.href,
    title: document.title,
    gameCardsFound: gameCards.length,
    hasHitsKeyword: rawText.toLowerCase().includes('hits') || rawText.toLowerCase().includes('carreras'),
    textPreview: rawText.replace(/\s+/g, ' ').slice(0, 200),
    games: []
  };
}

// 1. Sincronizar BetOnline
async function syncBetonline(targetApi) {
  const apiUrl = targetApi ? `${targetApi}?action=save_hce_betonline` : `${API_BASE}?action=save_hce_betonline`;
  
  const allTabs = await chrome.tabs.query({});
  let bolTab = allTabs.find(t => t.url && t.url.includes('betonline.ag/sportsbook/baseball/r+h+e'));
  let createdTab = false;

  if (!bolTab) {
    // Si tienen una pestaña de betonline pero en otra URL, la navegamos
    const anyBol = allTabs.find(t => t.url && t.url.includes('betonline.ag'));
    if (anyBol) {
      bolTab = anyBol;
      await chrome.tabs.update(bolTab.id, { url: "https://www.betonline.ag/sportsbook/baseball/r+h+e" });
      await waitForTabLoad(bolTab.id);
      await delay(3500);
    } else {
      bolTab = await chrome.tabs.create({
        url: "https://www.betonline.ag/sportsbook/baseball/r+h+e",
        active: false
      });
      createdTab = true;
      await waitForTabLoad(bolTab.id);
      await delay(3500);
    }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: bolTab.id },
      func: scrapeBetonlineDOM
    });

    const res = results[0]?.result;
    const games = res?.games || [];

    if (games.length > 0) {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games })
      });
      if (createdTab) {
        try { await chrome.tabs.remove(bolTab.id); } catch(e) {}
      }
      return { success: true, count: games.length, details: res };
    }
  } catch (e) {
    console.error('[BSolutions Sync] Error ejecutando script en BetOnline:', e);
  }

  if (createdTab) {
    try { await chrome.tabs.remove(bolTab.id); } catch(e) {}
  }
  return { success: false, count: 0 };
}

// 2. Sincronizar Betcris
async function syncBetcris(targetApi) {
  const apiUrl = targetApi ? `${targetApi}?action=save_hce_betcris` : `${API_BASE}?action=save_hce_betcris`;

  const allTabs = await chrome.tabs.query({});
  const crisTab = allTabs.find(t => t.url && (t.url.includes('betcris') || (t.title && t.title.toLowerCase().includes('betcris'))));

  if (!crisTab) {
    return {
      success: false,
      count: 0,
      message: "No se detectó pestaña de Betcris abierta. Abre tu sesión en https://be.betcris.do"
    };
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: crisTab.id },
      func: scrapeBetcrisDOM
    });

    const res = results[0]?.result;
    const games = res?.games || [];

    if (games.length > 0) {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games, append: true })
      });
      return { success: true, count: games.length, details: res };
    } else {
      return {
        success: false,
        count: 0,
        message: `Pestaña Betcris detectada en (${res?.url || crisTab.url}). No se vio el mercado "Total de Hits+Carreras+Errores". Entra al partido en Betcris.`
      };
    }
  } catch (e) {
    console.error('[BSolutions Sync] Error ejecutando script en Betcris:', e);
    return { success: false, count: 0, error: e.message };
  }
}

// Escuchar peticiones
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_FULL_SYNC') {
    (async () => {
      try {
        const bolRes = await syncBetonline(request.targetApi);
        const crisRes = await syncBetcris(request.targetApi);

        sendResponse({
          success: bolRes.count > 0 || crisRes.count > 0,
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
    return true;
  }

  if (request.action === 'CHECK_STATUS') {
    (async () => {
      const allTabs = await chrome.tabs.query({});
      const crisTab = allTabs.find(t => t.url && t.url.includes('betcris'));
      const bolTab = allTabs.find(t => t.url && t.url.includes('betonline'));
      sendResponse({
        crisOpen: !!crisTab,
        bolOpen: !!bolTab,
        crisUrl: crisTab?.url || null,
        bolUrl: bolTab?.url || null
      });
    })();
    return true;
  }
});
