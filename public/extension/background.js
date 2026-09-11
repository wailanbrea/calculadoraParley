// Service Worker (Manifest V3) - BSolutions Parley Sync v1.0.2
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

function isBetonlineRheUrl(url) {
  if (!url) return false;
  try {
    const u = decodeURIComponent(url).toLowerCase();
    return u.includes('betonline.ag') && (
      u.includes('r+h+e') || 
      u.includes('r%2bh%2be') || 
      u.includes('r-h-e') ||
      (u.includes('baseball') && u.includes('sportsbook'))
    );
  } catch (e) {
    return false;
  }
}

// Injected function for BetOnline
async function scrapeBetonlineDOM() {
  const MLB_TEAMS = [
    'diamondbacks', 'braves', 'orioles', 'red sox', 'cubs', 'white sox', 'reds', 'guardians',
    'rockies', 'tigers', 'astros', 'royals', 'angels', 'dodgers', 'marlins', 'brewers',
    'twins', 'mets', 'yankees', 'athletics', 'phillies', 'pirates', 'padres', 'giants',
    'mariners', 'cardinals', 'rays', 'rangers', 'blue jays', 'nationals'
  ];

  let links = [];
  for (let attempt = 0; attempt < 30; attempt++) {
    links = Array.from(document.querySelectorAll('a'))
      .map(a => a.innerText.trim())
      .filter(t => t.includes('Total') && (t.includes('O ') || t.includes('Over') || /O\s*\d+/i.test(t)));
    if (links.length > 0) break;
    await new Promise(r => setTimeout(r, 400));
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
    const pattern = /([^\r\n:]{2,35}?)\s+(?:vs\.?|@|-)\s+([^\r\n:]{2,35}?)\s*(?::|\n|\r|\|)?\s*(?:Total\s*(?:de\s*)?)?hits?\s*[\+,y]\s*carreras?\s*[\+,y]\s*errores?[\s\S]*?(?:Ov|Over)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})[\s\S]*?(?:Un|Under)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})/gi;

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
        const tm = clean.match(/([^\r\n:]{2,35}?)\s+(?:vs\.?|@|-)\s+([^\r\n:]{2,35}?)(?:\s*:|\n|\r|\||\s+Total)/i)
          || (document.title && document.title.match(/([^\r\n:]{2,35}?)\s+(?:vs\.?|@|-)\s+([^\r\n:]{2,35}?)/i));
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

  // 1. Estrategia Directa: Si el texto actual en pantalla ya muestra el mercado
  const rawText = document.body ? document.body.innerText : '';
  const direct = parseFlexibleBetcris(rawText);
  if (direct.length > 0) {
    return {
      status: 'success',
      url: window.location.href,
      games: direct,
      method: 'direct_screen'
    };
  }

  // 2. Extractor de objetos de partido / mercado de Betcris
  function checkGameForHce(game, parentGame) {
    if (!game) return null;
    const desc = ((game.description || '') + ' ' + (game.periodDescription || '') + ' ' + (game.tntHeader || '')).toLowerCase();
    const isHce = desc.includes('hits') || desc.includes('carreras') || desc.includes('hce') || desc.includes('errores');

    if (isHce) {
      let away = (game.contenders?.[0]?.name || parentGame?.contenders?.[0]?.name || '').trim();
      let home = (game.contenders?.[1]?.name || parentGame?.contenders?.[1]?.name || '').trim();

      if (!away || !home) {
        const tm = (game.description || '').match(/([^\r\n:]{2,35}?)\s+(?:vs\.?|@|-)\s+([^\r\n:]{2,35}?)\s*:/i)
          || (game.description || '').match(/([^\r\n:]{2,35}?)\s+(?:vs\.?|@|-)\s+([^\r\n:]{2,35}?)/i);
        if (tm) {
          away = tm[1].trim();
          home = tm[2].trim();
        }
      }

      let total = null, overOdds = null, underOdds = null;
      const drvs = game.lines?.drvs || game.drvs || [];
      const drvsList = Array.isArray(drvs) ? drvs : Object.values(drvs);
      for (const d of drvsList) {
        if (d?.tot) {
          total = d.tot.vp ?? d.tot.hp ?? d.tot.line ?? null;
          overOdds = d.tot.v ?? d.tot.ov ?? null;
          underOdds = d.tot.h ?? d.tot.un ?? null;
          break;
        }
      }

      if (total !== null && away && home) {
        return {
          away,
          home,
          total: parseFloat(total),
          line: String(total),
          over_odds: parseInt(overOdds, 10),
          under_odds: parseInt(underOdds, 10),
          over: String(overOdds),
          under: String(underOdds)
        };
      }
    }
    return null;
  }

  // 3. Recopilar exhaustivamente todos los UUIDs de partidos
  const gameUuids = new Set();
  const uuidRegex = /^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$/;

  // A. Desde la URL actual si es un partido
  const singleGameMatch = window.location.href.match(/game\/([A-Fa-f0-9\-]{36})/i);
  if (singleGameMatch) {
    gameUuids.add(singleGameMatch[1].toUpperCase());
  }

  // B. Desde elementos <pt-schedule-game> en el DOM
  document.querySelectorAll('pt-schedule-game').forEach(el => {
    const id = el.id || el.getAttribute('id') || '';
    if (id && uuidRegex.test(id)) {
      gameUuids.add(id.toUpperCase());
    }
    try {
      if (window.ng?.getComponent) {
        const comp = window.ng.getComponent(el);
        if (comp?.uuid) gameUuids.add(comp.uuid.toUpperCase());
        if (comp?.game?.uuid) gameUuids.add(comp.game.uuid.toUpperCase());
        if (comp?.game?.gameUUID) gameUuids.add(comp.game.gameUUID.toUpperCase());
      }
    } catch(e) {}
  });

  // C. Desde cualquier elemento en el DOM cuyo ID sea un UUID
  document.querySelectorAll('[id]').forEach(el => {
    if (el.id && uuidRegex.test(el.id)) {
      gameUuids.add(el.id.toUpperCase());
    }
  });

  // D. Desde cualquier enlace, data-game-uuid o atributo similar
  document.querySelectorAll('a[href*="game"], [data-game-uuid], [data-uuid]').forEach(el => {
    const href = el.getAttribute('href') || el.href || el.getAttribute('data-game-uuid') || el.getAttribute('data-uuid') || '';
    const m = href.match(/([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})/i);
    if (m) gameUuids.add(m[1].toUpperCase());
  });

  // E. Escanear todo el HTML en busca de IDs de partidos
  if (document.body) {
    const allMatches = document.body.innerHTML.match(/[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/g);
    if (allMatches) {
      for (const m of allMatches) {
        // Ignorar UUIDs conocidos de deportes para evitar falsos positivos
        const upper = m.toUpperCase();
        if (upper !== 'D6B7F0DA-465C-4883-9B4D-092F7FB99F92') {
          gameUuids.add(upper);
        }
      }
    }
  }

  // F. Headers requeridos por Betcris
  const reqHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'rtqname': sessionStorage.getItem('RT_QUEUE') || '',
    'x-version': '0.0.0'
  };

  // G. Si estamos en una liga (/seclvlcat/) o categoría (/category/)
  const leagueMatch = window.location.href.match(/seclvlcat\/([A-Fa-f0-9\-]{36})/i);
  if (leagueMatch) {
    try {
      const lRes = await fetch('/gateway/BetslipProxy.aspx/scheduleGetLeagueView', {
        method: 'POST',
        headers: reqHeaders,
        credentials: 'include',
        body: JSON.stringify({
          o: { BORequestData: { BOParameters: { BORt: {}, leagueUUID: leagueMatch[1] } } }
        })
      });
      if (lRes.ok) {
        const lData = await lRes.json();
        const games = lData.Games || lData.Data?.Games || lData.d?.Games || [];
        const list = Array.isArray(games) ? games : Object.values(games);
        for (const item of list) {
          if (item?.gameUUID) gameUuids.add(item.gameUUID.toUpperCase());
          if (item?.uuid) gameUuids.add(item.uuid.toUpperCase());
        }
      }
    } catch(e) {}
  }

  const catMatch = window.location.href.match(/(?:flat|category)\/([A-Fa-f0-9\-]{36})/i);
  if (catMatch) {
    try {
      const cRes = await fetch('/gateway/BetslipProxy.aspx/scheduleGetCategoryContent', {
        method: 'POST',
        headers: reqHeaders,
        credentials: 'include',
        body: JSON.stringify({
          o: { BORequestData: { BOParameters: { BORt: {}, Category: catMatch[1] } } }
        })
      });
      if (cRes.ok) {
        const cData = await cRes.json();
        const groups = cData.groups || cData.Data?.groups || cData.d?.groups || [];
        for (const grp of groups) {
          for (const item of (grp.games || [])) {
            if (item?.gameUUID) gameUuids.add(item.gameUUID.toUpperCase());
            if (item?.uuid) gameUuids.add(item.uuid.toUpperCase());
          }
        }
      }
    } catch(e) {}
  }

  // 4. Si encontramos UUIDs de partidos, consultar sus mercados / props (scheduleGetGamesByUUID y scheduleGetSingleGameView)
  const apiGames = [];
  const uuidList = Array.from(gameUuids);

  if (uuidList.length > 0) {
    const promises = uuidList.map(async (uuid) => {
      // Intento 1: scheduleGetGamesByUUID (Market Hierarchy para props y sub-mercados)
      try {
        const res1 = await fetch('/gateway/BetslipProxy.aspx/scheduleGetGamesByUUID', {
          method: 'POST',
          headers: reqHeaders,
          credentials: 'include',
          body: JSON.stringify({ o: { BORequestData: { BOParameters: { BORt: {}, ParentUUID: uuid } } } })
        });
        if (res1.ok) {
          const data1 = await res1.json();
          const subGames = data1.games || data1.Data?.games || data1.d?.games || (Array.isArray(data1) ? data1 : []);
          const list = Array.isArray(subGames) ? subGames : Object.values(subGames);
          for (const sg of list) {
            const hce = checkGameForHce(sg);
            if (hce) return hce;
          }
        }
      } catch(e) {}

      // Intento 2: scheduleGetSingleGameView (Legacy view)
      try {
        const res2 = await fetch('/gateway/BetslipProxy.aspx/scheduleGetSingleGameView', {
          method: 'POST',
          headers: reqHeaders,
          credentials: 'include',
          body: JSON.stringify({ o: { BORequestData: { BOParameters: { BORt: {}, gameUuid: uuid } } } })
        });
        if (res2.ok) {
          const data2 = await res2.json();
          const subGames = data2.games || data2.Data?.games || data2.d?.games || (Array.isArray(data2) ? data2 : []);
          const list = Array.isArray(subGames) ? subGames : Object.values(subGames);
          for (const sg of list) {
            const hce = checkGameForHce(sg);
            if (hce) return hce;
          }
        }
      } catch(e) {}

      return null;
    });

    const results = await Promise.all(promises);
    for (const r of results) {
      if (r && !apiGames.some(x => x.away === r.away && x.home === r.home)) {
        apiGames.push(r);
      }
    }

    if (apiGames.length > 0) {
      return {
        status: 'success',
        url: window.location.href,
        games: apiGames,
        method: 'betcris_props_api',
        scannedCount: uuidList.length
      };
    }
  }

  // 5. Diagnóstico si no se encontró nada
  return {
    status: 'no_hce_found',
    url: window.location.href,
    title: document.title,
    uuidsFound: uuidList.length,
    hasHitsKeyword: rawText.toLowerCase().includes('hits') || rawText.toLowerCase().includes('carreras'),
    games: []
  };
}

// 1. Sincronizar BetOnline
async function syncBetonline(targetApi) {
  const apiUrl = targetApi ? `${targetApi}?action=save_hce_betonline` : `${API_BASE}?action=save_hce_betonline`;
  
  const allTabs = await chrome.tabs.query({});
  let bolTab = allTabs.find(t => isBetonlineRheUrl(t.url));
  let createdTab = false;

  if (!bolTab) {
    const anyBol = allTabs.find(t => t.url && t.url.includes('betonline.ag'));
    if (anyBol) {
      bolTab = anyBol;
      await chrome.tabs.update(bolTab.id, { url: "https://www.betonline.ag/sportsbook/baseball/r+h+e", active: true });
      await waitForTabLoad(bolTab.id);
      await delay(4000);
    } else {
      bolTab = await chrome.tabs.create({
        url: "https://www.betonline.ag/sportsbook/baseball/r+h+e",
        active: true
      });
      createdTab = true;
      await waitForTabLoad(bolTab.id);
      await delay(4000);
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
    } else {
      return { success: false, count: 0, message: `BetOnline detectado (${bolTab.url}), pero la página tardó en cargar las líneas. Vuelve a intentarlo.` };
    }
  } catch (e) {
    console.error('[BSolutions Sync] Error ejecutando script en BetOnline:', e);
    return { success: false, count: 0, error: e.message };
  }
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
      const uuids = res?.uuidsFound || 0;
      return {
        success: false,
        count: 0,
        message: uuids > 0
          ? `Betcris: Se detectaron ${uuids} partidos pero ninguno tiene la línea HCE disponible aún.`
          : `Pestaña Betcris detectada en (${res?.url || crisTab.url}). No se detectaron partidos. Si entraste a un juego, haz clic en Props.`
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
          crisNote: crisRes.message || null,
          bolNote: bolRes.message || null
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
