// ==UserScript==
// @name         Betcris HCE Auto-Scanner - CalculadoraParley
// @namespace    bsolutions.calcparley
// @version      2.0.0
// @description  Escanea automáticamente todos los partidos de Betcris en la categoría de HCE y los sincroniza con CalculadoraParley
// @match        https://*.betcris.do/*
// @match        https://*.betcris.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // URLs de API (intenta primero producción y luego localhost como fallback)
  const API_URLS = [
    "https://calcparley.bsolutions.dev/api.php?action=save_hce_betcris",
    "http://localhost/CalculadoraParley%20Web/public/api.php?action=save_hce_betcris"
  ];

  let isScanning = false;
  let shouldStop = false;
  let scannedResults = [];

  // Función flexible para parsear HCE desde texto o HTML
  function parseBetcrisHce(text, fallbackTitle = "") {
    if (!text) return null;
    const clean = text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

    // Comprobar si contiene indicadores de Hits Carreras Errores
    const hasHCE = /hits?\s*[\+,y]\s*carreras?\s*[\+,y]\s*errores?/i.test(clean) ||
                   /total\s*de\s*(?:hits|hce|r\+h\+e)/i.test(clean);

    if (!hasHCE) return null;

    // Extraer nombres de equipos
    let away = "", home = "";
    const teamMatch = clean.match(/([a-zA-Z0-9\s.]+)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+)\s*:\s*Total/i) ||
                      fallbackTitle.match(/([a-zA-Z0-9\s.]+)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+)/i) ||
                      clean.match(/([a-zA-Z0-9\s.]+)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+)/i);

    if (teamMatch) {
      away = teamMatch[1].replace(/^[0-9\s\-]+/, "").trim();
      home = teamMatch[2].replace(/^[0-9\s\-]+/, "").trim();
    }

    // Extraer Over y Under con momios
    let overTotal = null, overOdds = null;
    const overMatch = clean.match(/(?:Ov|Over)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})/i) ||
                      clean.match(/(?:Ov|Over)[\s\S]{0,20}?([+-]?[0-9]{3,4})/i);

    if (overMatch) {
      if (overMatch[2]) {
        overTotal = parseFloat(overMatch[1]);
        overOdds = parseInt(overMatch[2], 10);
      } else if (overMatch[1]) {
        overOdds = parseInt(overMatch[1], 10);
      }
    }

    let underTotal = null, underOdds = null;
    const underMatch = clean.match(/(?:Un|Under)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})/i) ||
                       clean.match(/(?:Un|Under)[\s\S]{0,20}?([+-]?[0-9]{3,4})/i);

    if (underMatch) {
      if (underMatch[2]) {
        underTotal = parseFloat(underMatch[1]);
        underOdds = parseInt(underMatch[2], 10);
      } else if (underMatch[1]) {
        underOdds = parseInt(underMatch[1], 10);
      }
    }

    const total = overTotal ?? underTotal;
    if (total !== null && (overOdds !== null || underOdds !== null)) {
      return {
        away: away || "Visitante",
        home: home || "Local",
        total: total,
        over_odds: overOdds,
        under_odds: underOdds,
        raw_over: `Ov ${total} (${overOdds})`,
        raw_under: `Un ${total} (${underOdds})`,
        title: `${away} vs ${home}: Total de Hits+Carreras+Errores`
      };
    }

    return null;
  }

  // Buscar en el DOM actual si ya está visible el mercado HCE
  function scanCurrentView() {
    // 1. Probar en todo el body
    const bodyText = document.body ? document.body.innerText : "";
    const directResult = parseBetcrisHce(bodyText, document.title);
    if (directResult) return directResult;

    // 2. Buscar en elementos de mercados específicos
    const marketElements = document.querySelectorAll(
      "pt-bet-market, [class*='market'], [class*='event'], [class*='game'], [class*='accordion']"
    );

    for (const el of marketElements) {
      const text = el.innerText || "";
      if (/hits?\s*[\+,y]\s*carreras?\s*[\+,y]\s*errores?/i.test(text)) {
        const res = parseBetcrisHce(text, document.title);
        if (res) return res;
      }
    }

    return null;
  }

  // Enviar datos al backend de CalculadoraParley
  async function sendToServer(games, append = true) {
    if (!games || games.length === 0) return false;

    for (const url of API_URLS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ games, append })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success") {
            return true;
          }
        }
      } catch {
        // Fallback silencioso a la siguiente URL
      }
    }
    return false;
  }

  // Helper de retardo asíncrono
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Escaneo secuencial automático de TODOS los partidos de la lista
  async function startAutoScan() {
    if (isScanning) return;
    isScanning = true;
    shouldStop = false;
    scannedResults = [];

    updateWidgetUI({
      title: "⏳ Iniciando escaneo...",
      status: "Buscando partidos en la lista...",
      progress: 0,
      showStop: true
    });

    try {
      // 1. Recolectar todos los enlaces a partidos en la página
      const links = Array.from(document.querySelectorAll('a[href*="/game/"]'));
      const gameUrls = [];
      const seen = new Set();

      links.forEach((a) => {
        const href = a.getAttribute("href") || a.href;
        const match = href.match(/\/game\/([a-f0-9\-]+)/i);
        if (match && !seen.has(match[1])) {
          seen.add(match[1]);
          gameUrls.push({
            id: match[1],
            href: a.href,
            element: a,
            text: a.innerText.trim().replace(/\s+/g, " ")
          });
        }
      });

      // Si no encontramos enlaces pero estamos dentro de un partido individual
      if (gameUrls.length === 0) {
        const current = scanCurrentView();
        if (current) {
          await sendToServer([current], true);
          updateWidgetUI({
            title: "✅ Partido Actual Sincronizado",
            status: `${current.away} vs ${current.home}: ${current.total}`,
            progress: 100,
            showStop: false
          });
          isScanning = false;
          return;
        } else {
          alert("No se encontraron enlaces de partidos ni mercados de HCE en la pantalla actual. Asegúrate de estar en la categoría de Béisbol / MLB.");
          resetWidgetUI();
          isScanning = false;
          return;
        }
      }

      const totalGames = gameUrls.length;
      const originalUrl = window.location.href;

      for (let i = 0; i < totalGames; i++) {
        if (shouldStop) {
          updateWidgetUI({ title: "⏹️ Escaneo detenido", status: `Se procesaron ${scannedResults.length} partidos.`, showStop: false });
          break;
        }

        const game = gameUrls[i];
        const progressPercent = Math.round(((i + 1) / totalGames) * 100);

        updateWidgetUI({
          title: `🔄 Escaneando [${i + 1}/${totalGames}]`,
          status: game.text || `Partido ${i + 1}...`,
          progress: progressPercent,
          showStop: true
        });

        // Hacer clic en el enlace del partido para entrar
        try {
          game.element.scrollIntoView({ behavior: "smooth", block: "center" });
          game.element.click();
        } catch {
          window.location.href = game.href;
        }

        // Esperar a que cargue el mercado (hasta 3 segundos)
        let captured = null;
        for (let wait = 0; wait < 10; wait++) {
          await delay(350);
          captured = scanCurrentView();
          if (captured) break;
        }

        if (captured) {
          scannedResults.push(captured);
          await sendToServer([captured], true);
          updateWidgetUI({
            title: `🔄 [${i + 1}/${totalGames}] ✅ Línea: ${captured.total}`,
            status: `${captured.away} vs ${captured.home}`,
            progress: progressPercent,
            showStop: true
          });
        }

        // Regresar a la lista o dar tiempo antes del siguiente
        await delay(500);
      }

      // Enviar lote completo final
      if (scannedResults.length > 0) {
        await sendToServer(scannedResults, true);
        updateWidgetUI({
          title: `🎉 ¡Escaneo Completado!`,
          status: `✅ ${scannedResults.length} partidos sincronizados con CalculadoraParley.`,
          progress: 100,
          showStop: false
        });
      } else {
        updateWidgetUI({
          title: `⚠️ Fin del escaneo`,
          status: `No se encontraron líneas HCE en los partidos revisados.`,
          progress: 100,
          showStop: false
        });
      }

    } catch (err) {
      console.error(err);
      updateWidgetUI({
        title: `❌ Error durante el escaneo`,
        status: err.message,
        progress: 0,
        showStop: false
      });
    } finally {
      isScanning = false;
    }
  }

  // Interfaz de Usuario Flotante en Betcris
  function injectWidget() {
    if (document.getElementById("calcparley-hce-dock")) return;

    const dock = document.createElement("div");
    dock.id = "calcparley-hce-dock";
    dock.style.position = "fixed";
    dock.style.bottom = "16px";
    dock.style.right = "16px";
    dock.style.zIndex = "9999999";
    dock.style.backgroundColor = "#0f172a";
    dock.style.color = "#f8fafc";
    dock.style.border = "2px solid #0284c7";
    dock.style.borderRadius = "14px";
    dock.style.padding = "14px 18px";
    dock.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
    dock.style.fontFamily = "system-ui, -apple-system, sans-serif";
    dock.style.maxWidth = "340px";
    dock.style.minWidth = "290px";

    dock.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-weight:700; font-size:13px; color:#38bdf8; display:flex; align-items:center; gap:6px;">
          <span>⚾</span>
          <span id="hce-dock-title">HCE Betcris Auto-Sync</span>
        </div>
        <button id="hce-dock-min" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:14px;">−</button>
      </div>
      <div id="hce-dock-body">
        <div id="hce-dock-status" style="font-size:12px; color:#cbd5e1; margin-bottom:10px; line-height:1.3;">
          Listo para sincronizar todos los partidos de Béisbol.
        </div>
        <div id="hce-dock-bar-wrap" style="display:none; width:100%; height:6px; background:#334155; border-radius:3px; overflow:hidden; margin-bottom:10px;">
          <div id="hce-dock-bar" style="width:0%; height:100%; background:#10b981; transition:width 0.3s;"></div>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="hce-btn-scan-all" style="flex:1; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#fff; border:none; border-radius:8px; padding:8px 12px; font-weight:700; font-size:12px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            🚀 Sincronizar Todo
          </button>
          <button id="hce-btn-scan-one" style="background:#1e293b; color:#94a3b8; border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:8px 10px; font-size:11px; cursor:pointer;" title="Escanear solo pantalla actual">
            ⚡ Actual
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dock);

    // Eventos
    document.getElementById("hce-btn-scan-all").onclick = () => startAutoScan();
    document.getElementById("hce-btn-scan-one").onclick = async () => {
      const g = scanCurrentView();
      if (g) {
        await sendToServer([g], true);
        alert(`✅ Sincronizado: ${g.away} vs ${g.home} (Total: ${g.total})`);
      } else {
        alert("No se detectó el mercado HCE en la pantalla actual. Haz clic en '🚀 Sincronizar Todo' para recorrer la lista.");
      }
    };

    let minimized = false;
    document.getElementById("hce-dock-min").onclick = () => {
      minimized = !minimized;
      document.getElementById("hce-dock-body").style.display = minimized ? "none" : "block";
      document.getElementById("hce-dock-min").innerText = minimized ? "+" : "−";
    };
  }

  function updateWidgetUI({ title, status, progress, showStop }) {
    const t = document.getElementById("hce-dock-title");
    const s = document.getElementById("hce-dock-status");
    const bw = document.getElementById("hce-dock-bar-wrap");
    const b = document.getElementById("hce-dock-bar");
    const btnAll = document.getElementById("hce-btn-scan-all");

    if (t && title) t.innerText = title;
    if (s && status) s.innerText = status;
    if (bw && b && progress !== undefined) {
      bw.style.display = "block";
      b.style.width = `${progress}%`;
    }
    if (btnAll && showStop) {
      btnAll.innerText = "⏹️ Detener";
      btnAll.style.background = "#dc2626";
      btnAll.onclick = () => { shouldStop = true; };
    } else if (btnAll) {
      btnAll.innerText = "🚀 Sincronizar Todo";
      btnAll.style.background = "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)";
      btnAll.onclick = () => startAutoScan();
    }
  }

  function resetWidgetUI() {
    updateWidgetUI({
      title: "HCE Betcris Auto-Sync",
      status: "Listo para sincronizar.",
      progress: 0,
      showStop: false
    });
  }

  // Inicialización
  window.addEventListener("load", () => setTimeout(injectWidget, 1500));
  setTimeout(injectWidget, 2500);

  // Exponer función global para Bookmarklet
  window.calcParleyHceAutoScan = startAutoScan;
})();
