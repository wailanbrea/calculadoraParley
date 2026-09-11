// ==UserScript==
// @name         BetOnline HCE Extractor - CalculadoraParley
// @namespace    bsolutions.calcparley
// @version      1.0.0
// @description  Extrae automáticamente las líneas de R+H+E (Hits + Carreras + Errores) de BetOnline y las envía a CalculadoraParley
// @match        https://*.betonline.ag/sportsbook/baseball/r+h+e*
// @match        https://betonline.ag/sportsbook/baseball/r+h+e*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const API_URL = "http://localhost/CalculadoraParley%20Web/public/api.php?action=save_hce_betonline";

  function extractGames() {
    const games = [];
    const leagueContainers = document.querySelectorAll('.league-container');
    
    leagueContainers.forEach(league => {
      league.querySelectorAll('tbody').forEach(tb => {
        const text = tb.innerText || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const rotationLines = lines.filter(l => /^[0-9]{3,4}\s*-\s*/.test(l));
        
        if (rotationLines.length >= 2) {
          const awayTeam = rotationLines[0].replace(/^[0-9]{3,4}\s*-\s*/, '').trim();
          const homeTeam = rotationLines[1].replace(/^[0-9]{3,4}\s*-\s*/, '').trim();
          
          const overMatch = text.match(/(?:Total\s*)?O(?:v)?\s*([0-9]+(?:\.[0-9]+)?)\s*\(([+-]?[0-9]+)\)/i);
          const underMatch = text.match(/(?:Total\s*)?U(?:n)?\s*([0-9]+(?:\.[0-9]+)?)\s*\(([+-]?[0-9]+)\)/i);

          if (overMatch) {
            games.push({
              away: awayTeam,
              home: homeTeam,
              total: parseFloat(overMatch[1]),
              over_odds: parseInt(overMatch[2], 10),
              under_odds: underMatch ? parseInt(underMatch[2], 10) : null,
              raw_over: overMatch[0],
              raw_under: underMatch ? underMatch[0] : null,
              time: lines[0] || 'Hoy'
            });
          }
        }
      });
    });

    return games;
  }

  async function syncGames() {
    const btn = document.getElementById('calcparley-bol-btn');
    if (btn) btn.innerText = '⏳ Sincronizando...';

    const games = extractGames();
    if (games.length === 0) {
      alert('No se encontraron líneas de R+H+E en esta vista.');
      if (btn) btn.innerText = '⚡ Sincronizar HCE';
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games })
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (btn) btn.innerText = `✅ ${games.length} Enviados!`;
        setTimeout(() => { if (btn) btn.innerText = '⚡ Sincronizar HCE'; }, 3000);
      } else {
        alert('Error: ' + (data.message || 'Desconocido'));
        if (btn) btn.innerText = '⚡ Sincronizar HCE';
      }
    } catch (err) {
      alert('Error de conexión con CalculadoraParley: ' + err.message);
      if (btn) btn.innerText = '⚡ Sincronizar HCE';
    }
  }

  function injectButton() {
    if (document.getElementById('calcparley-bol-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'calcparley-bol-btn';
    btn.innerText = '⚡ Sincronizar HCE';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '999999';
    btn.style.backgroundColor = '#0284c7';
    btn.style.color = '#ffffff';
    btn.style.border = '2px solid #38bdf8';
    btn.style.borderRadius = '24px';
    btn.style.padding = '10px 18px';
    btn.style.fontSize = '14px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
    btn.onclick = syncGames;

    document.body.appendChild(btn);
  }

  window.addEventListener('load', () => setTimeout(injectButton, 1500));
  setTimeout(injectButton, 2000);
})();
