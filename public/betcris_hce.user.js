// ==UserScript==
// @name         Betcris HCE Extractor - CalculadoraParley
// @namespace    bsolutions.calcparley
// @version      1.0.0
// @description  Detecta y sincroniza automáticamente las líneas de Total de Hits+Carreras+Errores en Betcris hacia CalculadoraParley
// @match        https://*.betcris.do/*
// @match        https://*.betcris.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const API_URL = "http://localhost/CalculadoraParley%20Web/public/api.php?action=save_hce_betcris";
  let lastCapturedKey = null;
  let syncCount = 0;

  function extractGameFromText() {
    const fullText = document.body.innerText || '';
    
    // Formato: "Pirates vs Cubs: Total de Hits+Carreras+Errores ... Over Ov 25.5 -103 Under Un 25.5 -127"
    const hceRegex = /([a-zA-Z0-9\s.]+)\s+vs\s+([a-zA-Z0-9\s.]+):\s*Total de Hits\+Carreras\+Errores[\s\S]*?Ov\s*([0-9]+(?:\.[0-9]+)?)[\s\S]*?([+-]?[0-9]{3,4})[\s\S]*?Un\s*([0-9]+(?:\.[0-9]+)?)[\s\S]*?([+-]?[0-9]{3,4})/i;
    
    const match = fullText.match(hceRegex);
    if (!match) return null;

    const away = match[1].trim();
    const home = match[2].trim();
    const total = parseFloat(match[3]);
    const overOdds = parseInt(match[4], 10);
    const underOdds = parseInt(match[6], 10);

    return {
      away,
      home,
      total,
      over_odds: overOdds,
      under_odds: underOdds,
      raw_over: `Ov ${match[3]} (${match[4]})`,
      raw_under: `Un ${match[5]} (${match[6]})`,
      title: `${away} vs ${home}: Total de Hits+Carreras+Errores`
    };
  }

  async function sendGameToServer(game, silent = false) {
    const key = `${game.away}_${game.home}_${game.total}_${game.over_odds}`;
    if (key === lastCapturedKey && silent) return;

    const badge = document.getElementById('calcparley-cris-badge');
    if (badge) badge.innerText = `⏳ Enviando ${game.away}...`;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: [game], append: true })
      });
      const data = await res.json();
      if (data.status === 'success') {
        lastCapturedKey = key;
        syncCount++;
        if (badge) {
          badge.innerText = `✅ ${game.away} (${game.total}) Sincronizado! [Total: ${syncCount}]`;
          badge.style.backgroundColor = '#059669';
          setTimeout(() => {
            if (badge) {
              badge.innerText = `⚾ HCE Betcris (${syncCount} listos)`;
              badge.style.backgroundColor = '#1e293b';
            }
          }, 3500);
        }
      }
    } catch (err) {
      if (!silent) alert('Error enviando a CalculadoraParley: ' + err.message);
      if (badge) badge.innerText = '⚠️ Error de envío';
    }
  }

  function checkAndCapture(silent = true) {
    const game = extractGameFromText();
    if (game) {
      sendGameToServer(game, silent);
    } else if (!silent) {
      alert('No se detectó la sección "Total de Hits+Carreras+Errores" en la vista actual. Asegúrate de entrar al partido.');
    }
  }

  function injectFloatingWidget() {
    if (document.getElementById('calcparley-cris-container')) return;

    const container = document.createElement('div');
    container.id = 'calcparley-cris-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '999999';
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.alignItems = 'center';

    const badge = document.createElement('div');
    badge.id = 'calcparley-cris-badge';
    badge.innerText = '⚾ HCE Betcris (Auto-Scanner)';
    badge.style.backgroundColor = '#1e293b';
    badge.style.color = '#f8fafc';
    badge.style.border = '1px solid #10b981';
    badge.style.borderRadius = '20px';
    badge.style.padding = '8px 14px';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = 'bold';
    badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    badge.style.transition = 'all 0.3s ease';

    const btn = document.createElement('button');
    btn.innerText = '⚡ Escanear';
    btn.style.backgroundColor = '#10b981';
    btn.style.color = '#ffffff';
    btn.style.border = 'none';
    btn.style.borderRadius = '20px';
    btn.style.padding = '8px 14px';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    btn.onclick = () => checkAndCapture(false);

    container.appendChild(badge);
    container.appendChild(btn);
    document.body.appendChild(container);
  }

  // Observador de cambios en el DOM para capturar automáticamente cuando el usuario cambia de partido
  const observer = new MutationObserver(() => {
    checkAndCapture(true);
  });

  window.addEventListener('load', () => {
    setTimeout(() => {
      injectFloatingWidget();
      checkAndCapture(true);
      observer.observe(document.body, { childList: true, subtree: true });
    }, 1500);
  });

  setTimeout(() => {
    injectFloatingWidget();
    checkAndCapture(true);
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }, 2500);
})();
