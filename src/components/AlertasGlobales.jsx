import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// Motor global de alertas: montado en App, funciona sin importar qué sección
// de la aplicación esté abierta (Panel, Calculadora, Bases, Básquet, Soccer...).
//
// Vigila cada 60 segundos (y al volver a la pestaña):
//  - Soccer y Básquet (vía proxy Livescore): TODOS los juegos notifican;
//    ★ favoritos con prioridad (campana + notificación fija);
//    🚫 ocultos en silencio total.
//  - MLB (statsapi): 1er inning, tercio, H y final de todos los juegos.
//
// Reparte las alertas también como eventos de ventana ('calcparley-alerta')
// para que cada módulo muestre su historial reciente.
// ============================================================================

function hoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function leerJSON(clave) {
  try { return JSON.parse(localStorage.getItem(clave) || '{}'); } catch (e) { return {}; }
}

const ETIQUETAS_DEPORTE = {
  q1: '1er cuarto completado',
  h: 'Medio tiempo (H) completado',
  suspendido: 'Juego suspendido / pospuesto'
};

const ETIQUETAS_MLB = {
  inning1: '1er inning completado',
  inning3: 'Tercio completado (3 innings)',
  inning5: 'H completado (5 innings)'
};

// --- Adaptación mínima de un evento Livescore para evaluar hitos ---
function estadoLivescore(e) {
  const eps = String(e.Eps || 'NS').trim();
  let state = 'pre';
  let period = 0;
  let halftime = false;
  let suspendido = false;

  if (/^(FT|AET|AP|FT\s*PEN)/i.test(eps)) {
    state = 'post';
  } else if (/Postp|Canc|Susp|Aband|Del/i.test(eps)) {
    state = 'post';
    suspendido = true;
  } else if (eps !== 'NS' && eps !== 'TBC' && eps !== '') {
    state = 'in';
    if (/^HT$/i.test(eps)) { halftime = true; period = 2; }
    const q = eps.match(/^Q(\d)/i);
    if (q) period = parseInt(q[1], 10);
    if (/^OT/i.test(eps)) period = 5;
  }
  return { state, period, halftime, suspendido };
}

function hitosLivescore(e, tipo) {
  const { state, period, halftime, suspendido } = estadoLivescore(e);
  const res = [];
  if (suspendido) res.push('suspendido');
  if (tipo === 'basket') {
    if (state === 'post' || period >= 2) res.push('q1');
    if (state === 'post' || period >= 3 || halftime) res.push('h');
  }
  if (state === 'post' && !suspendido) res.push('final');
  return res;
}

function nombreEquipoLs(t) {
  return (t && t[0] && t[0].Nm) || '?';
}

export default function AlertasGlobales() {
  const [toasts, setToasts] = useState([]);
  const audioCtxRef = useRef(null);
  const tituloOriginalRef = useRef(document.title);
  const sinVerRef = useRef(0);
  const corriendoRef = useRef(false);

  const sonarCampana = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      [880, 1174.66, 1567.98].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch (e) { /* sin soporte de audio */ }
  };

  const dispararAlerta = ({ tipo, titulo, texto, esFavorito, pk }) => {
    const a = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
      titulo,
      texto,
      fav: esFavorito,
      tipo,
      pk
    };

    setToasts(prev => [...prev, a]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== a.id)), esFavorito ? 25000 : 12000);

    if (esFavorito) sonarCampana();

    if (document.hidden) {
      sinVerRef.current += 1;
      document.title = `(${sinVerRef.current}) 🔔 Alerta — CalcParley`;
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification(titulo, {
          body: texto,
          icon: './favicon.svg',
          requireInteraction: !!esFavorito,
          silent: !esFavorito,
          tag: 'calcparley-glob-' + a.id
        });
        n.onclick = () => {
          try { window.focus(); } catch (e) { /* sin permiso de foco */ }
          n.close();
        };
      } catch (e) { /* sin soporte */ }
    }

    // Avisar a los módulos para sus historiales de "Alertas recientes"
    try { window.dispatchEvent(new CustomEvent('calcparley-alerta', { detail: a })); } catch (e) { /* nada */ }
  };

  // ---------- Soccer / Básquet vía Livescore ----------
  const revisarDeporte = (tipo) => {
    const sport = tipo === 'soccer' ? 'soccer' : 'basketball';
    const icono = tipo === 'soccer' ? '⚽' : '🏀';
    const tz = Math.round(-new Date().getTimezoneOffset() / 60);

    return fetch(`./api.php?action=proxy_livescore&sport=${sport}&date=${hoyISO()}&tz=${tz}`)
      .then(r => {
        if (!r.ok) throw new Error('proxy ' + r.status);
        return r.json();
      })
      .then(data => {
        const eventos = (data.Stages || []).flatMap(st => st.Events || []);
        const claveHitos = `deporteHitos_${tipo}`;
        const claveSeguidos = `deporteSeguidos_${tipo}`;
        const seen = leerJSON(claveHitos);
        const favoritos = leerJSON(claveSeguidos);
        const ocultos = leerJSON(`deporteOcultos_${tipo}`);
        let cambio = false;
        let favCambio = false;

        eventos.forEach(e => {
          const id = 'ls' + String(e.Eid);
          const ahora = hitosLivescore(e, tipo);
          const guardado = seen[id];
          const antes = guardado === undefined ? null : (Array.isArray(guardado) ? guardado : (guardado.h || []));

          if (antes === null) {
            // Primer avistamiento: registrar en silencio
            seen[id] = { f: hoyISO(), h: ahora };
            cambio = true;
            return;
          }

          const nuevos = ahora.filter(k => !antes.includes(k));
          if (nuevos.length === 0) return;

          seen[id] = { f: hoyISO(), h: Array.from(new Set([...antes, ...ahora])) };
          cambio = true;

          if (!ocultos[id]) {
            const esFav = !!favoritos[id];
            const local = nombreEquipoLs(e.T1);
            const visita = nombreEquipoLs(e.T2);
            const marcador = `${local} ${e.Tr1 !== undefined && e.Tr1 !== null ? e.Tr1 : 0} - ${visita} ${e.Tr2 !== undefined && e.Tr2 !== null ? e.Tr2 : 0}`;
            const prefijo = esFav ? '★ ' : '';
            nuevos.forEach(k => dispararAlerta({
              tipo,
              titulo: k === 'final'
                ? `${prefijo}🏁 FINAL: ${local} vs ${visita}`
                : `${prefijo}${icono} ${local} vs ${visita}`,
              texto: k === 'final'
                ? `Resultado final: ${marcador}`
                : `${ETIQUETAS_DEPORTE[k] || k} · ${marcador}`,
              esFavorito: esFav
            }));
          }

          // Limpiar la marca de favorito cuando el juego termina o se suspende
          if ((nuevos.includes('final') || nuevos.includes('suspendido')) && favoritos[id]) {
            delete favoritos[id];
            favCambio = true;
          }
        });

        // Limpiar hitos de más de 2 días
        const limite = new Date();
        limite.setDate(limite.getDate() - 2);
        Object.keys(seen).forEach(id => {
          const v = seen[id];
          const f = Array.isArray(v) ? null : v.f;
          if (!f || new Date(f + 'T12:00:00') < limite) {
            delete seen[id];
            cambio = true;
          }
        });

        if (cambio) localStorage.setItem(claveHitos, JSON.stringify(seen));
        if (favCambio) localStorage.setItem(claveSeguidos, JSON.stringify(favoritos));
      })
      .catch(() => { /* proxy caído: se reintenta en el próximo ciclo */ });
  };

  // ---------- MLB vía statsapi ----------
  const revisarMlb = () => {
    return fetch(`https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${hoyISO()}&hydrate=team,linescore`)
      .then(r => r.json())
      .then(data => {
        const gs = (data.dates && data.dates[0] && data.dates[0].games) || [];
        const seen = leerJSON('mlbMilestones');
        const pks = new Set(gs.map(g => String(g.gamePk)));
        Object.keys(seen).forEach(k => { if (!pks.has(k)) delete seen[k]; });

        gs.forEach(g => {
          const pk = String(g.gamePk);
          const ls = g.linescore;
          const inn = (ls && ls.currentInning) || 0;
          const st = ls && ls.inningState;
          const passed = (n) => inn > n || (inn === n && st === 'End');

          const ahora = [];
          if (passed(1)) ahora.push('inning1');
          if (passed(3)) ahora.push('inning3');
          if (passed(5)) ahora.push('inning5');
          if (g.status.abstractGameState === 'Final') ahora.push('final');

          const antes = seen[pk];
          if (!antes) {
            seen[pk] = ahora;
            return;
          }

          const nuevos = ahora.filter(k => !antes.includes(k));
          if (nuevos.length === 0) return;
          seen[pk] = Array.from(new Set([...antes, ...ahora]));

          const away = g.teams.away.team.name || g.teams.away.team.teamName;
          const home = g.teams.home.team.name || g.teams.home.team.teamName;
          const rA = (ls && ls.teams && ls.teams.away && ls.teams.away.runs) || 0;
          const rH = (ls && ls.teams && ls.teams.home && ls.teams.home.runs) || 0;
          const marcador = `${away} ${rA} - ${home} ${rH}`;

          nuevos.forEach(k => dispararAlerta({
            tipo: 'mlb',
            titulo: k === 'final' ? `🏁 FINAL: ${away} vs ${home}` : `⚾ ${away} vs ${home}`,
            texto: k === 'final' ? `Resultado final: ${marcador}` : `${ETIQUETAS_MLB[k]} · ${marcador}`,
            esFavorito: true, // MLB mantiene siempre prioridad completa
            pk
          }));
        });

        localStorage.setItem('mlbMilestones', JSON.stringify(seen));
      })
      .catch(() => { /* reintenta en el próximo ciclo */ });
  };

  const revisarTodo = () => {
    if (corriendoRef.current) return;
    corriendoRef.current = true;
    Promise.all([revisarDeporte('soccer'), revisarDeporte('basket'), revisarMlb()])
      .finally(() => { corriendoRef.current = false; });
  };

  useEffect(() => {
    revisarTodo();
    const t = setInterval(revisarTodo, 60000);

    // Al volver a la pestaña: restaurar el título y chequear de inmediato
    const alVolver = () => {
      if (!document.hidden) {
        sinVerRef.current = 0;
        document.title = tituloOriginalRef.current;
        revisarTodo();
      }
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);

    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes globAlertaEntrada {
          0% { transform: translateX(120%); opacity: 0; }
          60% { transform: translateX(-8px); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 600px) {
          .glob-toasts { left: 10px !important; right: 10px !important; max-width: none !important; }
        }
      `}</style>
      <div className="glob-toasts" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{
              background: 'linear-gradient(135deg, #0b1a2b 0%, #0b0f19 100%)',
              border: t.fav ? '2px solid #f59e0b' : '2px solid #00d2ff',
              borderRadius: '10px',
              padding: '16px 20px',
              color: '#f8fafc',
              fontSize: '0.95rem',
              boxShadow: t.fav
                ? '0 0 25px rgba(245, 158, 11, 0.45), 0 12px 32px rgba(0,0,0,0.7)'
                : '0 0 25px rgba(0, 210, 255, 0.35), 0 12px 32px rgba(0,0,0,0.7)',
              animation: 'globAlertaEntrada 0.4s ease-out',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🔔</span>
            <div>
              <div style={{ fontSize: '0.72rem', color: t.fav ? '#f59e0b' : '#00d2ff', marginBottom: '4px' }}>
                {t.time} · Alerta{t.fav ? ' · ★ favorito' : ''}
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{t.titulo}</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{t.texto}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
