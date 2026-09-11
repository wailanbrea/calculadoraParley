// Service Worker (Manifest V3) - BSolutions Parley Sync
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

  // Poll up to 15 seconds for games to hydrate
  let links = [];
  for (let attempt = 0; attempt < 30; attempt++) {
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

  return games;
}

// Injected function for Betcris
async function scrapeBetcrisDOM() {
  function parseSingleHce(text, title) {
    const clean = (text || '').replace(/\u00a0/g, ' ');
    const hceMatch = clean.match(/hits?\s*[\+,y]\s*carreras?\s*[\+,y]\s*errores?[\s\S]*?(?:Ov|Over)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})[\s\S]*?(?:Un|Under)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})/i);

    if (!hceMatch) return null;

    const total = parseFloat(hceMatch[1]);
    const overOdds = parseInt(hceMatch[2], 10);
    const underOdds = parseInt(hceMatch[4], 10);

    let away = '';
    let home = '';

    const teamsMatch = clean.match(/([a-zA-Z0-9\s.]+)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+)\s*:\s*Total de Hits/i)
      || (title && title.match(/([a-zA-Z0-9\s.]+)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+)/i));

    if (teamsMatch) {
      away = teamsMatch[1].replace(/^[0-9\s\-]+/, '').trim();
      home = teamsMatch[2].replace(/^[0-9\s\-]+/, '').trim();
    } else {
      const parts = (document.title || '').split(/vs\.?|@|-/i);
      if (parts.length >= 2) {
        away = parts[0].trim();
        home = parts[1].replace(/\|.*$/, '').trim();
      }
    }

    if (!away || !home) return null;

    return {
      away,
      home,
      total,
      line: String(total),
      over_odds: overOdds,
      under_odds: underOdds,
      over: String(overOdds),
      under: String(underOdds),
      raw_over: `Ov ${total} (${overOdds})`,
      raw_under: `Un ${total} (${underOdds})`,
      scraped_at: new Date().toISOString()
    };
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const results = [];

  // 1. Revisar si la pantalla actual ya contiene el mercado HCE
  const current = parseSingleHce(document.body.innerText, document.title);
  if (current) {
    results.push(current);
  }

  // 2. Buscar enlaces a partidos en la categoría actual
  const gameAnchors = Array.from(document.querySelectorAll('a[href*="/game/"]'));
  const uniqueAnchors = [];
  const seenHrefs = new Set();

  for (const a of gameAnchors) {
    const href = a.getAttribute('href');
    if (href && !seenHrefs.has(href)) {
      seenHrefs.add(href);
      uniqueAnchors.push(a);
    }
  }

  // Si no hay partidos y estamos en la home, avisar que navegue
  if (uniqueAnchors.length === 0 && results.length === 0) {
    // Si no está en baseball, redirigir automáticamente a la categoría MLB de Betcris
    if (!window.location.href.includes('AB8B6AA7-2297-44FF-874E-E0F967F11F69')) {
      window.location.href = 'https://be.betcris.do/sportsbook/category/sport/D6B7F0DA-465C-4883-9B4D-092F7FB99F92/seclvlcat/AB8B6AA7-2297-44FF-874E-E0F967F11F69';
      return { status: 'redirected', message: 'Navegando a la sección MLB de Betcris... Vuelve a hacer clic en Sincronizar en unos segundos.' };
    }
    return { status: 'empty', message: 'No se encontraron partidos de MLB en la vista actual de Betcris.' };
  }

  // 3. Recorrer los partidos encontrados
  for (let i = 0; i < uniqueAnchors.length; i++) {
    const el = uniqueAnchors[i];
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.click();

      let captured = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        await sleep(350);
        captured = parseSingleHce(document.body.innerText, document.title);
        if (captured) break;
      }

      if (captured) {
        const already = results.find(r => r.away === captured.away && r.home === captured.home);
        if (!already) results.push(captured);
      }
    } catch (e) {
      console.warn('Error al hacer clic en partido:', e);
    }
    await sleep(250);
  }

  return { status: 'success', games: results };
}

// 1. Sincronizar BetOnline
async function syncBetonline(targetApi) {
  const apiUrl = targetApi ? `${targetApi}?action=save_hce_betonline` : `${API_BASE}?action=save_hce_betonline`;
  
  const tabs = await chrome.tabs.query({ url: "*://*.betonline.ag/*" });
  let bolTab = tabs[0];
  let createdTab = false;

  if (!bolTab) {
    bolTab = await chrome.tabs.create({
      url: "https://www.betonline.ag/sportsbook/baseball/r+h+e",
      active: false
    });
    createdTab = true;
    await waitForTabLoad(bolTab.id);
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: bolTab.id },
      func: scrapeBetonlineDOM
    });

    const games = results[0]?.result || [];
    if (games.length > 0) {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games })
      });
      if (createdTab) {
        try { await chrome.tabs.remove(bolTab.id); } catch(e) {}
      }
      return { success: true, count: games.length };
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

  const tabs = await chrome.tabs.query({ url: "*://*.betcris.do/*" });
  if (tabs.length === 0) {
    return {
      success: false,
      count: 0,
      message: "No se encontró pestaña de Betcris abierta. Abre tu sesión en https://be.betcris.do"
    };
  }

  const crisTab = tabs[0];

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: crisTab.id },
      func: scrapeBetcrisDOM
    });

    const res = results[0]?.result;
    if (res && res.status === 'redirected') {
      return { success: false, count: 0, message: res.message };
    }

    const games = (res && res.games) ? res.games : (Array.isArray(res) ? res : []);
    if (games.length > 0) {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games, append: true })
      });
      return { success: true, count: games.length };
    } else {
      return { success: false, count: 0, message: res?.message || 'Abre el partido o categoría MLB en Betcris.' };
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
      const crisTabs = await chrome.tabs.query({ url: "*://*.betcris.do/*" });
      const bolTabs = await chrome.tabs.query({ url: "*://*.betonline.ag/*" });
      sendResponse({
        crisOpen: crisTabs.length > 0,
        bolOpen: bolTabs.length > 0,
        crisUrl: crisTabs[0]?.url || null
      });
    })();
    return true;
  }
});
