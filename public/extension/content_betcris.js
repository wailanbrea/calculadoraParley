// Extractor automático y crawler de Betcris para BSolutions Sync
(function () {
  "use strict";

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

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  async function crawlAllGames(onProgress) {
    const rawText = document.body.innerText || '';
    const results = [];

    // 1. Primero revisar si la página actual ya tiene el mercado en texto
    const current = parseFlexibleBetcris(rawText);
    if (current.length > 0) return current;

    // 2. Extraer mediante la API interna de Betcris con la sesión activa
    function checkGameForHce(game, parentGame) {
      const desc = ((game.description || '') + ' ' + (game.periodDescription || '')).toLowerCase();
      const isHce = desc.includes('hits') || desc.includes('carreras') || desc.includes('hce') || desc.includes('errores');

      if (isHce) {
        const away = (game.contenders?.[0]?.name || parentGame?.contenders?.[0]?.name || '').trim();
        const home = (game.contenders?.[1]?.name || parentGame?.contenders?.[1]?.name || '').trim();

        let total = null, overOdds = null, underOdds = null;
        const drvs = game.lines?.drvs || [];
        for (const d of drvs) {
          if (d.tot) {
            total = d.tot.vp ?? d.tot.hp ?? d.tot.line ?? null;
            overOdds = d.tot.v ?? d.tot.ov ?? null;
            underOdds = d.tot.h ?? d.tot.un ?? null;
            break;
          }
        }

        if (away && home && total !== null) {
          return {
            away, home, total: parseFloat(total), line: String(total),
            over_odds: parseInt(overOdds, 10), under_odds: parseInt(underOdds, 10),
            over: String(overOdds), under: String(underOdds)
          };
        }
      }
      return null;
    }

    const catMatch = window.location.href.match(/(?:flat|seclvlcat|category)\/([A-Fa-f0-9\-]{36})/i);
    const gameMatch = window.location.href.match(/game\/([A-Fa-f0-9\-]{36})/i);

    if (gameMatch) {
      try {
        const gRes = await fetch('/gateway/BetslipProxy.aspx/scheduleGetSingleGameView', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ o: { BORequestData: { BOParameters: { BORt: {}, gameUuid: gameMatch[1] } } } })
        });
        if (gRes.ok) {
          const gData = await gRes.json();
          const subGames = gData.games || gData.Data?.games || (Array.isArray(gData) ? gData : []);
          for (const sg of subGames) {
            const hce = checkGameForHce(sg);
            if (hce) results.push(hce);
          }
          if (results.length > 0) return results;
        }
      } catch(e) {}
    }

    if (catMatch) {
      try {
        const cRes = await fetch('/gateway/BetslipProxy.aspx/scheduleGetCategoryContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ o: { BORequestData: { BOParameters: { BORt: {}, Category: catMatch[1] } } } })
        });

        if (cRes.ok) {
          const cData = await cRes.json();
          const groups = cData.groups || (cData.Data && cData.Data.groups) || [];
          const mainGames = [];

          for (const grp of groups) {
            for (const item of (grp.games || [])) {
              const hce = checkGameForHce(item);
              if (hce) results.push(hce);
              if (item.gameUUID && (!item.parentUUID || item.gameUUID === item.parentUUID)) {
                mainGames.push(item);
              }
            }
          }

          if (results.length === 0 && mainGames.length > 0) {
            const promises = mainGames.slice(0, 15).map(async (mg) => {
              try {
                const sRes = await fetch('/gateway/BetslipProxy.aspx/scheduleGetSingleGameView', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ o: { BORequestData: { BOParameters: { BORt: {}, gameUuid: mg.gameUUID } } } })
                });
                if (!sRes.ok) return null;
                const sData = await sRes.json();
                const subGames = sData.games || sData.Data?.games || (Array.isArray(sData) ? sData : []);
                for (const sg of subGames) {
                  const found = checkGameForHce(sg, mg);
                  if (found) return found;
                }
              } catch(e) {}
              return null;
            });

            const subResults = await Promise.all(promises);
            for (const r of subResults) {
              if (r && !results.some(x => x.away === r.away && x.home === r.home)) {
                results.push(r);
              }
            }
          }

          if (results.length > 0) return results;
        }
      } catch(e) {}
    }

    return results;
  }

  // Notificar al background si nos solicitan escaneo
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_BETCRIS') {
      crawlAllGames((curr, total) => {
        chrome.runtime.sendMessage({
          action: 'BETCRIS_PROGRESS',
          current: curr,
          total: total
        });
      }).then(games => {
        sendResponse({ games, count: games.length });
      }).catch(err => {
        sendResponse({ games: [], count: 0, error: err.message });
      });
      return true;
    }
  });

  // Inyectar botón flotante discreto en Betcris
  function injectFloatingWidget() {
    if (document.getElementById('bsolutions-parley-float')) return;

    const btn = document.createElement('div');
    btn.id = 'bsolutions-parley-float';
    btn.innerHTML = `
      <div style="
        position: fixed; bottom: 18px; right: 18px; z-index: 999999;
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 10px 16px; border-radius: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.35);
        display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; font-size: 13px;
        transition: transform 0.2s, box-shadow 0.2s; border: 1px solid rgba(255,255,255,0.2);
      ">
        <span style="font-size: 16px;">⚡</span>
        <span id="bsolutions-btn-label">Sincronizar HCE</span>
      </div>
    `;

    btn.addEventListener('click', async () => {
      const label = document.getElementById('bsolutions-btn-label');
      label.innerText = 'Escaneando...';
      try {
        const games = await crawlAllGames((c, t) => {
          label.innerText = `Escaneando [${c}/${t}]...`;
        });
        if (games.length > 0) {
          label.innerText = `Enviando ${games.length} líneas...`;
          await fetch('https://calcparley.bsolutions.dev/api.php?action=save_hce_betcris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ games, append: true })
          });
          label.innerText = `✅ ¡${games.length} sincronizados!`;
        } else {
          label.innerText = '⚠️ Abre el partido';
        }
      } catch (e) {
        label.innerText = '❌ Error de red';
      }
      setTimeout(() => {
        if (label) label.innerText = 'Sincronizar HCE';
      }, 5000);
    });

    document.body.appendChild(btn);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(injectFloatingWidget, 1500);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(injectFloatingWidget, 1500));
  }

})();
