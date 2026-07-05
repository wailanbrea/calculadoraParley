import React, { useState, useEffect, useRef } from 'react';

const API = 'https://statsapi.mlb.com/api/v1';

// Ordinal en inglés como lo muestra MLB.com (1st, 2nd, 3rd, 4th...)
function ordEn(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return n;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
}

function hoyStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const MILESTONES = [
  { key: 'inning1', innings: 1, label: '1er inning completado' },
  { key: 'inning3', innings: 3, label: 'Tercio completado (3 innings)' },
  { key: 'inning5', innings: 5, label: 'H completado (5 innings)' }
];

export default function LiveScoreboard({ gameId }) {
  const [gamesLive, setGamesLive] = useState([]);
  const [extraGames, setExtraGames] = useState({});
  const [standings, setStandings] = useState({});
  const [boxscores, setBoxscores] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const boxRef = useRef({});
  const seenRef = useRef(null);
  if (seenRef.current === null) {
    try {
      seenRef.current = JSON.parse(localStorage.getItem('mlbMilestones') || '{}');
    } catch (e) {
      seenRef.current = {};
    }
  }

  const pushAlert = (text) => {
    const a = { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), text };
    setAlerts(prev => [a, ...prev].slice(0, 20));
    setToasts(prev => [...prev, a]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== a.id)), 12000);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('CalcParley MLB', { body: text }); } catch (e) { /* sin soporte */ }
    }
  };

  const checkMilestones = (gs) => {
    const seen = seenRef.current;
    const currentPks = new Set(gs.map(g => String(g.gamePk)));
    Object.keys(seen).forEach(k => { if (!currentPks.has(k)) delete seen[k]; });

    gs.forEach(g => {
      const pk = String(g.gamePk);
      const ls = g.linescore;
      const inn = (ls && ls.currentInning) || 0;
      const st = ls && ls.inningState;
      const passed = (n) => inn > n || (inn === n && st === 'End');

      const now = [];
      MILESTONES.forEach(m => { if (passed(m.innings)) now.push(m.key); });
      if (g.status.abstractGameState === 'Final') now.push('final');

      const prev = seen[pk];
      if (!prev) {
        // Primera vez que vemos este juego: registrar sin alertar (evita ruido al abrir)
        seen[pk] = now;
      } else {
        now.filter(k => !prev.includes(k)).forEach(k => {
          const away = g.teams.away.team.teamName;
          const home = g.teams.home.team.teamName;
          const rA = (ls && ls.teams && ls.teams.away && ls.teams.away.runs) || 0;
          const rH = (ls && ls.teams && ls.teams.home && ls.teams.home.runs) || 0;
          const score = `${away} ${rA} - ${home} ${rH}`;
          if (k === 'final') {
            pushAlert(`🏁 FINAL: ${score}`);
          } else {
            const m = MILESTONES.find(x => x.key === k);
            pushAlert(`⚾ ${away} vs ${home}: ${m ? m.label : k} · ${score}`);
          }
        });
        seen[pk] = Array.from(new Set([...prev, ...now]));
      }
    });

    localStorage.setItem('mlbMilestones', JSON.stringify(seen));
  };

  const poll = () => {
    fetch(`${API}/schedule/games/?sportId=1&date=${hoyStr()}&hydrate=team,linescore,decisions`)
      .then(r => r.json())
      .then(data => {
        const gs = (data.dates && data.dates[0] && data.dates[0].games) || [];
        setGamesLive(gs);
        setLastUpdate(new Date());
        checkMilestones(gs);

        gs.forEach(g => {
          const stAbs = g.status.abstractGameState;
          const pk = g.gamePk;
          const cached = boxRef.current[pk];
          // Boxscore: en vivo se refresca cada ciclo; final solo una vez
          if (stAbs === 'Live' || (stAbs === 'Final' && !(cached && cached.final))) {
            fetch(`${API}/game/${pk}/boxscore`)
              .then(r => r.json())
              .then(bx => {
                boxRef.current[pk] = { final: stAbs === 'Final' };
                setBoxscores(prev => ({ ...prev, [pk]: bx }));
              })
              .catch(() => {});
          }
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Posiciones divisionales (récord y ranking), una vez por carga
    fetch(`${API}/standings?leagueId=103,104&hydrate=division`)
      .then(r => r.json())
      .then(data => {
        const map = {};
        (data.records || []).forEach(rec => {
          const div = rec.division || {};
          const divName = div.nameShort
            || (div.name || '').replace('American League', 'AL').replace('National League', 'NL');
          (rec.teamRecords || []).forEach(tr => {
            map[tr.team.id] = { rank: tr.divisionRank, div: divName };
          });
        });
        setStandings(map);
      })
      .catch(() => {});

    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  // Si el juego seleccionado no es de hoy (ej. importado de ayer), traerlo una vez por su gamePk
  useEffect(() => {
    if (!gameId || lastUpdate === null) return;
    const enHoy = gamesLive.some(g => String(g.gamePk) === String(gameId));
    if (enHoy || extraGames[gameId]) return;

    fetch(`${API}/schedule?sportId=1&gamePk=${gameId}&hydrate=team,linescore,decisions`)
      .then(r => r.json())
      .then(data => {
        const g = data.dates && data.dates[0] && data.dates[0].games && data.dates[0].games[0];
        if (g) setExtraGames(prev => ({ ...prev, [gameId]: g }));
      })
      .catch(() => {});

    if (!boxRef.current[gameId]) {
      fetch(`${API}/game/${gameId}/boxscore`)
        .then(r => r.json())
        .then(bx => {
          boxRef.current[gameId] = { final: true };
          setBoxscores(prev => ({ ...prev, [gameId]: bx }));
        })
        .catch(() => {});
    }
  }, [gameId, gamesLive, lastUpdate]);

  const solicitarNotificaciones = () => {
    if (typeof Notification === 'undefined') {
      pushAlert('Este navegador no soporta notificaciones.');
      return;
    }
    Notification.requestPermission().then(p => setNotifGranted(p === 'granted'));
  };

  const estadoJuego = (g) => {
    const ls = g.linescore;
    const abs = g.status.abstractGameState;
    if (abs === 'Final') {
      const n = ls && ls.innings ? ls.innings.length : 9;
      return { text: n !== 9 ? `Final/${n}` : 'Final', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' };
    }
    if (abs === 'Live') {
      const st = ls && ls.inningState;
      const flecha = st === 'Top' ? '▲' : st === 'Bottom' ? '▼' : st === 'Middle' ? '½' : '•';
      return { text: `${flecha} ${ordEn(ls && ls.currentInning)}`, color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
    }
    return {
      text: new Date(g.gameDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.15)'
    };
  };

  const filaEquipo = (g, side) => {
    const t = g.teams[side];
    const ls = g.linescore;
    const rec = t.leagueRecord ? `${t.leagueRecord.wins} - ${t.leagueRecord.losses}` : '';
    const stg = standings[t.team.id];
    const rank = stg ? `${ordEn(stg.rank)} ${stg.div}` : '';
    const runs = ls && ls.teams && ls.teams[side] ? ls.teams[side].runs : undefined;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
        <div>
          <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#f8fafc' }}>{t.team.teamName}</span>
          <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#64748b' }}>{rec}{rank ? ` · ${rank}` : ''}</span>
        </div>
        <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#00d2ff', minWidth: '28px', textAlign: 'right' }}>
          {runs !== undefined ? runs : '-'}
        </span>
      </div>
    );
  };

  const tablaInnings = (g) => {
    const ls = g.linescore;
    if (!ls || !ls.innings || ls.innings.length === 0) return null;
    const isFinal = g.status.abstractGameState === 'Final';
    const numCols = Math.max(9, ls.innings.length);
    const cols = [];
    for (let i = 0; i < numCols; i++) cols.push(i);

    const celda = (inning, side, idx) => {
      if (!inning) return '';
      const val = inning[side] ? inning[side].runs : undefined;
      if (val === undefined) {
        // Local no bateó la baja del último inning: MLB muestra "x"
        if (side === 'home' && isFinal && idx === ls.innings.length - 1) return 'x';
        return '';
      }
      return val;
    };

    const tdStyle = { padding: '3px 6px', textAlign: 'center', fontSize: '0.75rem', color: '#cbd5e1', borderLeft: '1px solid rgba(255,255,255,0.04)' };
    const thStyle = { ...tdStyle, color: '#64748b', fontWeight: 'normal' };
    const totStyle = { ...tdStyle, fontWeight: 'bold', color: '#f8fafc', borderLeft: '2px solid rgba(255,255,255,0.1)' };

    const tot = (side, key) => (ls.teams && ls.teams[side] ? (ls.teams[side][key] !== undefined ? ls.teams[side][key] : '-') : '-');

    return (
      <div style={{ overflowX: 'auto', marginTop: '10px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', borderLeft: 'none' }}></th>
              {cols.map(i => <th key={i} style={thStyle}>{i + 1}</th>)}
              <th style={{ ...totStyle, color: '#64748b' }}>R</th>
              <th style={{ ...thStyle }}>H</th>
              <th style={{ ...thStyle }}>E</th>
            </tr>
          </thead>
          <tbody>
            {['away', 'home'].map(side => (
              <tr key={side} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ ...tdStyle, textAlign: 'left', borderLeft: 'none', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {g.teams[side].team.abbreviation || g.teams[side].team.teamName}
                </td>
                {cols.map(i => <td key={i} style={tdStyle}>{celda(ls.innings[i], side, i)}</td>)}
                <td style={totStyle}>{tot(side, 'runs')}</td>
                <td style={tdStyle}>{tot(side, 'hits')}</td>
                <td style={tdStyle}>{tot(side, 'errors')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const lineaPitchers = (g, side) => {
    const bx = boxscores[g.gamePk];
    const td = bx && bx.teams && bx.teams[side];
    if (!td || !td.pitchers || td.pitchers.length === 0) return null;
    return td.pitchers.map(id => {
      const p = td.players['ID' + id];
      if (!p) return null;
      const k = (p.stats && p.stats.pitching && p.stats.pitching.strikeOuts) || 0;
      const nombre = p.person.fullName.split(' ').pop();
      return `${nombre} ${k}K`;
    }).filter(Boolean).join(' → ');
  };

  const statsTemporada = (g, personId) => {
    const bx = boxscores[g.gamePk];
    if (!bx) return null;
    for (const side of ['away', 'home']) {
      const p = bx.teams && bx.teams[side] && bx.teams[side].players && bx.teams[side].players['ID' + personId];
      if (p && p.seasonStats && p.seasonStats.pitching) {
        const sp = p.seasonStats.pitching;
        return `${sp.wins} - ${sp.losses} | ${sp.era} ERA`;
      }
    }
    return null;
  };

  const decisiones = (g) => {
    if (g.status.abstractGameState !== 'Final' || !g.decisions) return null;
    const { winner, loser } = g.decisions;
    return (
      <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '0.78rem' }}>
        {winner && (
          <div>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>W: </span>
            <span style={{ color: '#f8fafc' }}>{winner.fullName}</span>
            {statsTemporada(g, winner.id) && <span style={{ color: '#64748b' }}> · {statsTemporada(g, winner.id)}</span>}
          </div>
        )}
        {loser && (
          <div>
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>L: </span>
            <span style={{ color: '#f8fafc' }}>{loser.fullName}</span>
            {statsTemporada(g, loser.id) && <span style={{ color: '#64748b' }}> · {statsTemporada(g, loser.id)}</span>}
          </div>
        )}
      </div>
    );
  };

  // Juego seleccionado: primero se busca entre los de hoy, luego en los traídos por gamePk
  const juegoSeleccionado = gameId
    ? (gamesLive.find(g => String(g.gamePk) === String(gameId)) || extraGames[gameId] || null)
    : null;

  const renderCard = (g) => {
    const est = estadoJuego(g);
    const pitchAway = lineaPitchers(g, 'away');
    const pitchHome = lineaPitchers(g, 'home');
    return (
      <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            📺 Marcador en vivo (API MLB)
            {lastUpdate && ` · Actualizado: ${lastUpdate.toLocaleTimeString()}`}
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 10px', borderRadius: '10px', color: est.color, background: est.bg }}>
            {est.text}
          </span>
        </div>
        {filaEquipo(g, 'away')}
        {filaEquipo(g, 'home')}
        {tablaInnings(g)}
        {decisiones(g)}
        {(pitchAway || pitchHome) && (
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.74rem', color: '#94a3b8' }}>
            <div style={{ fontWeight: 'bold', color: '#64748b', marginBottom: '3px' }}>Ponches de pitchers (K):</div>
            {pitchAway && <div>{g.teams.away.team.abbreviation || g.teams.away.team.teamName}: {pitchAway}</div>}
            {pitchHome && <div>{g.teams.home.team.abbreviation || g.teams.home.team.teamName}: {pitchHome}</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>

      {/* Toasts de alertas (flotantes, para todos los juegos del día) */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: '#0b0f19', border: '1px solid #00d2ff', borderRadius: '8px', padding: '12px 16px', color: '#f8fafc', fontSize: '0.85rem', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>{t.time}</div>
            {t.text}
          </div>
        ))}
      </div>

      {/* Barra compacta de alertas y notificaciones */}
      {(alerts.length > 0 || !notifGranted) && (
        <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#00d2ff', marginBottom: alerts.length > 0 ? '6px' : 0 }}>
              🔔 Alertas de innings (1ro, tercio, H y final de todos los juegos de hoy)
            </div>
            {alerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '90px', overflowY: 'auto' }}>
                {alerts.map(a => (
                  <div key={a.id} style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                    <span style={{ color: '#64748b', marginRight: '8px' }}>{a.time}</span>{a.text}
                  </div>
                ))}
              </div>
            )}
          </div>
          {!notifGranted && (
            <button
              onClick={solicitarNotificaciones}
              style={{ padding: '5px 12px', background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.4)', borderRadius: '6px', color: '#00d2ff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              🔔 Activar notificaciones
            </button>
          )}
        </div>
      )}

      {/* Cuadro del juego seleccionado */}
      {gameId && (
        juegoSeleccionado
          ? renderCard(juegoSeleccionado)
          : (
            <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              Cargando marcador del juego...
            </div>
          )
      )}
    </div>
  );
}
