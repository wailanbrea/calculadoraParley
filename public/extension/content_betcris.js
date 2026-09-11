// Extractor automático y crawler de Betcris para BSolutions Sync
(function () {
  "use strict";

  function parseHce(text, title) {
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

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  async function crawlAllGames(onProgress) {
    const results = [];

    // Primero revisar si la página actual ya tiene el mercado
    const current = parseHce(document.body.innerText, document.title);
    if (current) results.push(current);

    // Buscar enlaces o tarjetas de partidos
    const gameAnchors = Array.from(document.querySelectorAll('a[href*="/game/"]'));
    const uniqueGames = [];
    const seenHrefs = new Set();

    for (const a of gameAnchors) {
      const href = a.getAttribute('href');
      if (href && !seenHrefs.has(href)) {
        seenHrefs.add(href);
        uniqueGames.push(a);
      }
    }

    if (uniqueGames.length === 0 && results.length > 0) {
      return results;
    }

    for (let i = 0; i < uniqueGames.length; i++) {
      const el = uniqueGames[i];
      if (onProgress) onProgress(i + 1, uniqueGames.length);

      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.click();

        let captured = null;
        for (let attempt = 0; attempt < 8; attempt++) {
          await delay(350);
          captured = parseHce(document.body.innerText, document.title);
          if (captured) break;
        }

        if (captured) {
          const already = results.find(r => r.away === captured.away && r.home === captured.home);
          if (!already) results.push(captured);
        }
      } catch (err) {
        console.warn('[BSolutions Sync] Error accediendo al partido', err);
      }
      await delay(250);
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
        <span id="bsolutions-btn-label">Sincronizar HCE con Calculadora</span>
      </div>
    `;

    btn.addEventListener('mouseenter', () => { btn.firstElementChild.style.transform = 'scale(1.04)'; });
    btn.addEventListener('mouseleave', () => { btn.firstElementChild.style.transform = 'scale(1)'; });

    btn.addEventListener('click', async () => {
      const label = document.getElementById('bsolutions-btn-label');
      label.innerText = 'Escaneando partidos...';
      try {
        const games = await crawlAllGames((c, t) => {
          label.innerText = `Escaneando [${c}/${t}]...`;
        });
        if (games.length > 0) {
          label.innerText = `Enviando ${games.length} líneas...`;
          const res = await fetch('https://calcparley.bsolutions.dev/api.php?action=save_hce_betcris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ games, append: true })
          });
          const json = await res.json();
          label.innerText = `✅ ¡${games.length} sincronizados!`;
        } else {
          label.innerText = '⚠️ No se encontraron HCE';
        }
      } catch (e) {
        label.innerText = '❌ Error de conexión';
      }
      setTimeout(() => {
        if (label) label.innerText = 'Sincronizar HCE con Calculadora';
      }, 5000);
    });

    document.body.appendChild(btn);
  }

  // Si la página ya cargó, inyectar el widget flotante
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(injectFloatingWidget, 1500);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(injectFloatingWidget, 1500));
  }

})();
