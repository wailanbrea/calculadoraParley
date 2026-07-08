import React, { useState, useEffect, useRef } from 'react';

// MLB — Lineups confirmados + Pitchers + Matchups + Bases Alcanzadas (v1).
// Fuente: MLB Stats API oficial (gratis, sin key), consultada directo desde el navegador.
//  - Panel lateral con los juegos del día (mismo estilo que Bases Alcanzadas).
//  - Pitchers probables enfrentados con sus estadísticas (formato MLB) + cuál es mejor.
//  - Lineups lado a lado en el orden oficial de MLB (nunca se reordena), enfrentando
//    al bateador del mismo turno, con matchup HR/RBI/AVG vs el pitcher rival (como MLB).
// v2 (pendiente): Statcast (xSLG/barrel), probabilidad Poisson real, park factor, odds.

const API = 'https://statsapi.mlb.com/api/v1';

function fechaHoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const nrm = (v, lo, hi) => clamp(((v - lo) / (hi - lo)) * 100, 0, 100);
const fmt3 = (v) => (v === null || v === undefined || v === '' || isNaN(parseFloat(v))) ? '—' : parseFloat(v).toFixed(3).replace(/^0/, '');
const apellido = (nombre) => (nombre || '').split(' ').slice(-1)[0];

// Score heurístico de bases alcanzadas (0-100). NO es probabilidad calibrada: es un
// indicador relativo de fuerza para comparar bateadores del mismo juego.
function scoreBateador(b, pitcherThrows) {
  const slgN = nrm(b.slg, 0.300, 0.600);
  const isoN = nrm(b.slg - b.avg, 0.080, 0.300);
  const l10N = nrm(b.last10tb, 0, 25);
  const l5N = nrm(b.last5tb, 0, 14);
  let plat = 60;
  if (b.bats === 'S') plat = 62;
  else if (pitcherThrows && b.bats) plat = b.bats !== pitcherThrows ? 75 : 45;
  const spot = b.orden <= 2 ? 100 : b.orden <= 5 ? 85 : b.orden <= 7 ? 65 : 50;
  const s = slgN * 0.25 + isoN * 0.15 + l10N * 0.25 + l5N * 0.12 + plat * 0.15 + spot * 0.08;
  return Math.round(s * 10) / 10;
}

// Rating de pitcher (0-100): ERA y WHIP bajos + K/9 alto = mejor.
function ratingPitcher(s) {
  if (!s) return 0;
  const eraN = nrm(6.0 - s.era, 0.5, 3.5);   // ERA 2.5->100, 5.5->0
  const whipN = nrm(1.6 - s.whip, 0.1, 0.6); // WHIP 1.0->100, 1.5->0
  const k9N = nrm(s.k9, 6, 12);
  return Math.round((eraN * 0.45 + whipN * 0.30 + k9N * 0.25) * 10) / 10;
}

const colorScore = (s) => s >= 75 ? '#6ee7b7' : s >= 65 ? '#fcd34d' : s >= 55 ? '#fdba74' : '#94a3b8';
const nivelVentaja = (v) => v >= 20 ? { t: 'Fuerte', c: '#6ee7b7' } : v >= 14 ? { t: 'Buena', c: '#86efac' }
  : v >= 9 ? { t: 'Jugable', c: '#fcd34d' } : v >= 5 ? { t: 'Watchlist', c: '#fdba74' } : { t: 'Pareja', c: '#64748b' };

const ESTILOS_ESTADO = {
  Final: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.45)', accent: '#fca5a5' },
  Live: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.45)', accent: '#6ee7b7' },
  Preview: { bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.1)', accent: '#94a3b8' }
};

function categoriaJuego(g) {
  const abs = g.status.abstractGameState;
  const det = g.status.detailedState || '';
  const ls = g.linescore;
  const empezo = !!(ls && ls.currentInning >= 1 && ls.innings && ls.innings.length > 0);
  if (det.indexOf('Postponed') !== -1 || det.indexOf('Cancelled') !== -1 || det.indexOf('Suspended') !== -1) return 'Preview';
  if (abs === 'Final') return empezo ? 'Final' : 'Preview';
  if (abs === 'Live' && empezo) return 'Live';
  return 'Preview';
}

export default function MLBLineups() {
  const [selectedDate, setSelectedDate] = useState(fechaHoyISO());
  const [juegos, setJuegos] = useState([]);
  const [gamePk, setGamePk] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [filtro, setFiltro] = useState('top5');
  const [cargandoJuegos, setCargandoJuegos] = useState(false);
  const [cargandoLineup, setCargandoLineup] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [dueloA, setDueloA] = useState('');
  const [dueloB, setDueloB] = useState('');
  const logCache = useRef({});
  const mCache = useRef({});

  useEffect(() => {
    let vivo = true;
    setCargandoJuegos(true); setError(null); setDetalle(null); setGamePk(null);
    fetch(`${API}/schedule?sportId=1&date=${selectedDate}&hydrate=probablePitcher,linescore`)
      .then(r => r.json())
      .then(d => { if (vivo) setJuegos((d.dates && d.dates[0] && d.dates[0].games) || []); })
      .catch(() => vivo && setError('No se pudo cargar el calendario de MLB'))
      .finally(() => vivo && setCargandoJuegos(false));
    return () => { vivo = false; };
  }, [selectedDate]);

  async function ultimasTB(pid, year) {
    if (logCache.current[pid]) return logCache.current[pid];
    try {
      const r = await fetch(`${API}/people/${pid}/stats?stats=gameLog&group=hitting&season=${year}&gameType=R`);
      const d = await r.json();
      const splits = (d.stats && d.stats[0] && d.stats[0].splits) || [];
      const tb = splits.map(s => parseInt((s.stat && s.stat.totalBases) || 0, 10));
      const sum = (arr) => arr.reduce((a, b) => a + b, 0);
      const res = { last10: sum(tb.slice(-10)), last5: sum(tb.slice(-5)) };
      logCache.current[pid] = res;
      return res;
    } catch (e) { return { last10: 0, last5: 0 }; }
  }

  // Matchup histórico (career) del bateador vs el pitcher rival: solo HR/RBI/AVG.
  async function matchup(batterId, pitcherId) {
    if (!pitcherId) return { ab: 0, hr: 0, rbi: 0, avg: null };
    const key = batterId + 'v' + pitcherId;
    if (mCache.current[key] !== undefined) return mCache.current[key];
    try {
      const r = await fetch(`${API}/people/${batterId}/stats?stats=vsPlayerTotal&group=hitting&opposingPlayerId=${pitcherId}`);
      const d = await r.json();
      let sp = null;
      for (const st of (d.stats || [])) { if (st.splits && st.splits.length) { sp = st.splits[0].stat; break; } }
      const res = sp ? { ab: parseInt(sp.atBats || 0, 10), hr: parseInt(sp.homeRuns || 0, 10), rbi: parseInt(sp.rbi || 0, 10), avg: sp.avg } : { ab: 0, hr: 0, rbi: 0, avg: null };
      mCache.current[key] = res;
      return res;
    } catch (e) { return { ab: 0, hr: 0, rbi: 0, avg: null }; }
  }

  async function pitcherStats(pid, year) {
    if (!pid) return null;
    try {
      const r = await fetch(`${API}/people/${pid}/stats?stats=season&group=pitching&season=${year}&gameType=R`);
      const d = await r.json();
      const s = d.stats && d.stats[0] && d.stats[0].splits && d.stats[0].splits[0] && d.stats[0].splits[0].stat;
      if (!s) return null;
      return {
        w: parseInt(s.wins || 0, 10), l: parseInt(s.losses || 0, 10),
        era: parseFloat(s.era) || 0, ip: s.inningsPitched || '0',
        so: parseInt(s.strikeOuts || 0, 10), bb: parseInt(s.baseOnBalls || 0, 10),
        whip: parseFloat(s.whip) || 0, k9: parseFloat(s.strikeoutsPer9Inn) || 0,
      };
    } catch (e) { return null; }
  }

  async function cargarLineup(pk) {
    setGamePk(pk); setDetalle(null); setError(null); setCargandoLineup(true);
    const year = selectedDate.slice(0, 4);
    const juego = juegos.find(j => j.gamePk === pk);
    const pAway = juego && juego.teams.away.probablePitcher;
    const pHome = juego && juego.teams.home.probablePitcher;
    try {
      const box = await (await fetch(`${API}/game/${pk}/boxscore`)).json();
      const lados = {};
      const idsMano = new Set();
      [pAway, pHome].forEach(p => p && idsMano.add(p.id));

      ['away', 'home'].forEach(lado => {
        const t = box.teams[lado];
        const orden = t.battingOrder || [];
        const bateadores = orden.map((pid, i) => {
          const p = t.players['ID' + pid] || {};
          const sb = (p.seasonStats && p.seasonStats.batting) || {};
          idsMano.add(pid);
          return {
            pid, orden: i + 1,
            nombre: (p.person && p.person.fullName) || '?',
            pos: (p.position && p.position.abbreviation) || '',
            avg: parseFloat(sb.avg) || 0, slg: parseFloat(sb.slg) || 0,
            bats: null, last10tb: 0, last5tb: 0, score: 0,
            mHr: null, mRbi: null, mAvg: null, mAb: 0,
          };
        });
        lados[lado] = { team: t.team.name, bateadores };
      });

      // Stats de pitchers en paralelo (para la tarjeta y el veredicto)
      const [stAway, stHome] = await Promise.all([pitcherStats(pAway && pAway.id, year), pitcherStats(pHome && pHome.id, year)]);
      const pitchers = {
        away: { nombre: pAway ? pAway.fullName : null, id: pAway ? pAway.id : null, stats: stAway, rating: ratingPitcher(stAway) },
        home: { nombre: pHome ? pHome.fullName : null, id: pHome ? pHome.id : null, stats: stHome, rating: ratingPitcher(stHome) },
      };

      const confirmado = lados.away.bateadores.length > 0 && lados.home.bateadores.length > 0;
      if (!confirmado) {
        setDetalle({
          estado: (juego && juego.status.detailedState) || 'Programado', confirmado: false,
          pitchers,
          away: { team: box.teams.away.team.name }, home: { team: box.teams.home.team.name },
        });
        setCargandoLineup(false);
        return;
      }

      const manos = {};
      try {
        const pj = await (await fetch(`${API}/people?personIds=${[...idsMano].join(',')}`)).json();
        (pj.people || []).forEach(pp => { manos[pp.id] = { bats: pp.batSide && pp.batSide.code, throws: pp.pitchHand && pp.pitchHand.code }; });
      } catch (e) { /* sin manos: score neutro */ }

      const throwsHome = (pHome && manos[pHome.id] && manos[pHome.id].throws) || null;
      const throwsAway = (pAway && manos[pAway.id] && manos[pAway.id].throws) || null;

      // away batea vs pitcher home; home batea vs pitcher away
      const tareas = [];
      lados.away.bateadores.forEach(b => tareas.push({ b, rival: pHome && pHome.id }));
      lados.home.bateadores.forEach(b => tareas.push({ b, rival: pAway && pAway.id }));
      await Promise.all(tareas.map(async ({ b, rival }) => {
        b.bats = (manos[b.pid] && manos[b.pid].bats) || null;
        const [u, m] = await Promise.all([ultimasTB(b.pid, year), matchup(b.pid, rival)]);
        b.last10tb = u.last10; b.last5tb = u.last5;
        b.mAb = m.ab; b.mHr = m.hr; b.mRbi = m.rbi; b.mAvg = m.avg;
      }));
      lados.away.bateadores.forEach(b => { b.score = scoreBateador(b, throwsHome); });
      lados.home.bateadores.forEach(b => { b.score = scoreBateador(b, throwsAway); });

      setDetalle({
        estado: (juego && juego.status.detailedState) || 'Confirmado', confirmado: true,
        pitchers, throwsAway, throwsHome,
        away: lados.away, home: lados.home,
      });
    } catch (e) {
      setError('No se pudo cargar el lineup de este juego');
    } finally {
      setCargandoLineup(false);
    }
  }

  const lim = filtro === 'top5' ? 5 : 9;
  const todosBateadores = detalle && detalle.confirmado
    ? [...detalle.away.bateadores.map(b => ({ ...b, eq: detalle.away.team })), ...detalle.home.bateadores.map(b => ({ ...b, eq: detalle.home.team }))]
    : [];
  const bA = todosBateadores.find(b => String(b.pid) === dueloA);
  const bB = todosBateadores.find(b => String(b.pid) === dueloB);
  const duelo = (bA && bB) ? (() => {
    const pA = (bA.score / (bA.score + bB.score)) * 100;
    return { pA: Math.round(pA * 10) / 10, pB: Math.round((100 - pA) * 10) / 10, ventaja: Math.round(Math.abs(pA - 50) * 2 * 10) / 10 };
  })() : null;

  const S = {
    card: { background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' },
    btn: (on) => ({ padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, border: '1px solid ' + (on ? '#00d2ff' : 'rgba(255,255,255,0.15)'), background: on ? 'rgba(0,210,255,0.15)' : 'transparent', color: on ? '#67e8f9' : '#cbd5e1' }),
    input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e2e8f0', padding: '6px 10px', fontSize: '0.85rem' },
  };

  // Celda de bateador: análisis + matchup HR/RBI/AVG vs pitcher rival (como MLB)
  const CeldaBateador = ({ b, throwsRival, rivalNombre, gana, lado }) => {
    if (!b) return <div style={{ padding: '8px 10px', color: '#475569', fontSize: '0.8rem' }}>—</div>;
    const fav = b.bats && throwsRival && b.bats !== throwsRival && b.bats !== 'S';
    const der = lado === 'right';
    const hayM = b.mAb > 0;
    return (
      <div style={{
        padding: '8px 12px', borderRadius: '10px',
        background: gana ? 'rgba(16,185,129,0.08)' : 'transparent',
        border: gana ? '1px solid rgba(16,185,129,0.35)' : '1px solid transparent',
        textAlign: der ? 'right' : 'left', justifySelf: der ? 'end' : 'start', maxWidth: '100%', minWidth: 0,
      }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {b.nombre} <span style={{ color: '#64748b', fontWeight: 400 }}>({b.pos})</span>
          <span style={{ color: fav ? '#6ee7b7' : '#94a3b8', fontWeight: 600 }}> {b.bats || '?'}{fav ? '✓' : ''}</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          AVG {fmt3(b.avg)} · SLG {fmt3(b.slg)} · Ú10 <strong style={{ color: '#cbd5e1' }}>{b.last10tb}</strong> · <strong style={{ color: colorScore(b.score) }}>Score {b.score}</strong>
        </div>
        {/* Matchup vs pitcher rival — como MLB, solo HR/RBI/AVG */}
        <div style={{ fontSize: '0.7rem', marginTop: '2px', fontVariantNumeric: 'tabular-nums', color: hayM ? '#e2e8f0' : '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span style={{ color: '#64748b' }}>vs {apellido(rivalNombre) || 'P'}:</span>{' '}
          {hayM
            ? <>HR <strong style={{ color: b.mHr > 0 ? '#fca5a5' : '#cbd5e1' }}>{b.mHr}</strong> · RBI <strong style={{ color: '#cbd5e1' }}>{b.mRbi}</strong> · AVG <strong style={{ color: '#cbd5e1' }}>{fmt3(b.mAvg)}</strong> <span style={{ color: '#475569' }}>({b.mAb} AB)</span></>
            : 'sin historial'}
        </div>
      </div>
    );
  };

  const StatP = ({ label, val, mejor }) => (
    <div style={{ textAlign: 'center', minWidth: '44px' }}>
      <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: mejor ? '#6ee7b7' : '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
    </div>
  );

  // Tarjeta de pitchers enfrentados (formato MLB) + cuál es mejor
  const TarjetaPitchers = ({ p }) => {
    const a = p.away, h = p.home;
    const hayRating = a.stats && h.stats;
    const mejorAway = hayRating && a.rating > h.rating;
    const mejorHome = hayRating && h.rating > a.rating;
    const filaStats = (st, mejorLado) => st ? (
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <StatP label="W-L" val={`${st.w}-${st.l}`} />
        <StatP label="ERA" val={st.era.toFixed(2)} mejor={mejorLado === 'era'} />
        <StatP label="IP" val={st.ip} />
        <StatP label="K" val={st.so} />
        <StatP label="BB" val={st.bb} />
        <StatP label="WHIP" val={st.whip.toFixed(2)} mejor={mejorLado === 'whip'} />
        <StatP label="K/9" val={st.k9.toFixed(1)} mejor={mejorLado === 'k9'} />
      </div>
    ) : <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>Sin estadísticas de temporada</div>;
    const nombrePitcher = (pi, mejor) => (
      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
        {pi.nombre || 'Por confirmar'}
        {mejor && <span style={{ fontSize: '0.62rem', background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.45)', borderRadius: '6px', padding: '1px 6px', fontWeight: 700 }}>★ MEJOR</span>}
      </div>
    );
    return (
      <div style={S.card}>
        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '.04em', marginBottom: '8px' }}>⚾ PITCHERS PROBABLES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <div>{nombrePitcher(a, mejorAway)}<div style={{ marginTop: '6px' }}>{filaStats(a.stats, mejorAway ? 'era' : null)}</div></div>
          <div style={{ borderLeft: '1px solid #1e293b', paddingLeft: '18px' }}>{nombrePitcher(h, mejorHome)}<div style={{ marginTop: '6px' }}>{filaStats(h.stats, mejorHome ? 'era' : null)}</div></div>
        </div>
        {hayRating && (
          <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#cbd5e1', textAlign: 'center' }}>
            Mejor pitcher según ERA/WHIP/K9: <strong style={{ color: '#6ee7b7' }}>{a.rating >= h.rating ? a.nombre : h.nombre}</strong>
            {' '}<span style={{ color: '#64748b' }}>(rating {Math.max(a.rating, h.rating)} vs {Math.min(a.rating, h.rating)})</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <style>{`
        @media (max-width: 900px) {
          .ml-grid { display: flex !important; flex-direction: column !important; }
          .ml-sidebar { position: static !important; max-height: none !important; }
        }
      `}</style>

      <h2 style={{ margin: '0 0 14px', fontSize: '1.15rem', color: '#f8fafc' }}>⚾ MLB — Lineups, Pitchers & Bases Alcanzadas</h2>

      <div className="ml-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ===== Panel lateral de juegos (estilo Bases Alcanzadas) ===== */}
        <div className="ml-sidebar" style={{ position: 'sticky', top: '16px', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ ...S.input, width: '100%', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Buscar equipo…" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...S.input, width: '100%', boxSizing: 'border-box' }} />
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '.04em' }}>JUEGOS {cargandoJuegos ? '· cargando…' : `· ${juegos.length}`}</div>
            {error && <div style={{ color: '#fca5a5', fontSize: '0.8rem' }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', minHeight: 0 }}>
              {juegos.filter(g => {
                const q = busqueda.trim().toLowerCase();
                if (!q) return true;
                return (g.teams.away.team.name + ' ' + g.teams.home.team.name).toLowerCase().indexOf(q) !== -1;
              }).map(g => {
                const cat = categoriaJuego(g);
                const est = ESTILOS_ESTADO[cat];
                const sel = g.gamePk === gamePk;
                const ls = g.linescore;
                const empezo = cat !== 'Preview';
                const rA = empezo ? ((ls && ls.teams && ls.teams.away && ls.teams.away.runs) || 0) : null;
                const rH = empezo ? ((ls && ls.teams && ls.teams.home && ls.teams.home.runs) || 0) : null;
                const hora = new Date(g.gameDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                const det = g.status.detailedState || '';
                let sub;
                if (cat === 'Preview') {
                  sub = det.indexOf('Postponed') !== -1 ? 'Pospuesto' : det.indexOf('Suspended') !== -1 ? 'Suspendido'
                    : det.indexOf('Cancelled') !== -1 ? 'Cancelado' : `Inicia: ${hora}`;
                } else if (cat === 'Final') { sub = `Final · ${hora}`; }
                else { const flecha = ls && ls.inningState === 'Top' ? '▲' : '▼'; sub = `En juego · ${flecha} ${(ls && ls.currentInning) || ''}`; }
                const linea = { display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden' };
                return (
                  <button key={g.gamePk} onClick={() => cargarLineup(g.gamePk)} style={{
                    textAlign: 'left', padding: '9px 11px', background: est.bg,
                    border: sel ? '2px solid #00d2ff' : `1px solid ${est.border}`, borderRadius: '6px', color: '#f8fafc', cursor: 'pointer', width: '100%',
                  }}>
                    <div style={linea}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.teams.away.team.name}</span>{rA !== null && <span>{rA}</span>}</div>
                    <div style={{ ...linea, marginTop: '2px' }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.teams.home.team.name}</span>{rH !== null && <span>{rH}</span>}</div>
                    <div style={{ fontSize: '0.7rem', color: est.accent, marginTop: '3px', fontWeight: 'bold' }}>{sub}</div>
                  </button>
                );
              })}
              {!cargandoJuegos && juegos.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No hay juegos en esta fecha.</span>}
            </div>
          </div>
        </div>

        {/* ===== Contenido principal ===== */}
        <div style={{ minWidth: 0 }}>
          {!detalle && !cargandoLineup && (
            <div style={{ ...S.card, color: '#94a3b8', fontSize: '0.9rem' }}>Selecciona un juego del panel para ver pitchers, lineups y matchups.</div>
          )}
          {cargandoLineup && <div style={{ color: '#67e8f9', padding: '10px 4px' }}>Cargando pitchers, lineups y matchups…</div>}

          {detalle && !cargandoLineup && <TarjetaPitchers p={detalle.pitchers} />}

          {detalle && !detalle.confirmado && !cargandoLineup && (
            <div style={{ ...S.card, borderColor: 'rgba(251,191,36,0.4)' }}>
              <div style={{ fontSize: '0.95rem', color: '#fcd34d', fontWeight: 600, marginBottom: '6px' }}>⏳ Lineup aún no confirmado ({detalle.estado})</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Los lineups de bateo suelen publicarse 1-3 horas antes del juego. Arriba tienes los pitchers probables con sus estadísticas.</div>
            </div>
          )}

          {detalle && detalle.confirmado && !cargandoLineup && (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button style={S.btn(filtro === 'top5')} onClick={() => setFiltro('top5')}>Top 5</button>
                <button style={S.btn(filtro === 'full9')} onClick={() => setFiltro('full9')}>Lineup completo (9)</button>
              </div>

              <div style={S.card}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px 1fr', gap: '4px', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>{detalle.away.team}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>vs {detalle.pitchers.home.nombre || 'P. por confirmar'} {detalle.throwsHome ? `(${detalle.throwsHome})` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>DUELO<br />TB</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>{detalle.home.team}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>vs {detalle.pitchers.away.nombre || 'P. por confirmar'} {detalle.throwsAway ? `(${detalle.throwsAway})` : ''}</div>
                  </div>
                </div>

                {Array.from({ length: lim }, (_, i) => {
                  const a = detalle.away.bateadores[i];
                  const h = detalle.home.bateadores[i];
                  let centro = null;
                  if (a && h) {
                    const pA = (a.score / (a.score + h.score)) * 100;
                    const ventaja = Math.abs(pA - 50) * 2;
                    const n = nivelVentaja(ventaja);
                    const ganaAway = pA >= 50;
                    const p = Math.round((ganaAway ? pA : 100 - pA) * 10) / 10;
                    centro = { ganaAway, p, ventaja, n };
                  }
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 96px 1fr', gap: '4px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <CeldaBateador b={a} throwsRival={detalle.throwsHome} rivalNombre={detalle.pitchers.home.nombre} gana={centro && centro.ganaAway && centro.ventaja >= 5} lado="left" />
                      <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>{i + 1}°</div>
                        {centro && (<>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: centro.n.c }}>{centro.ganaAway ? '◀ ' : ''}{centro.p}%{!centro.ganaAway ? ' ▶' : ''}</div>
                          <div style={{ fontSize: '0.62rem', color: centro.n.c }}>{centro.n.t}</div>
                        </>)}
                      </div>
                      <CeldaBateador b={h} throwsRival={detalle.throwsAway} rivalNombre={detalle.pitchers.away.nombre} gana={centro && !centro.ganaAway && centro.ventaja >= 5} lado="right" />
                    </div>
                  );
                })}

                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '10px' }}>
                  Orden oficial de MLB (sin reordenar). El % es quién tiene más probabilidad de más bases alcanzadas en el duelo del mismo turno.
                  La línea "vs [pitcher]" es el matchup histórico HR/RBI/AVG contra el abridor rival.
                </div>
              </div>

              <div style={S.card}>
                <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700, marginBottom: '8px' }}>⚔️ Comparar cualquier bateador A vs B</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[['A', dueloA, setDueloA], ['B', dueloB, setDueloB]].map(([lbl, val, set]) => (
                    <select key={lbl} value={val} onChange={e => set(e.target.value)} style={{ ...S.input, maxWidth: '230px' }}>
                      <option value="">Jugador {lbl}…</option>
                      {todosBateadores.map(b => <option key={b.pid} value={b.pid}>{b.orden}. {b.nombre} ({b.eq})</option>)}
                    </select>
                  ))}
                </div>
                {duelo && (
                  <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#e2e8f0' }}>
                    <div><strong style={{ color: '#f8fafc' }}>{bA.nombre}</strong> {duelo.pA}% <span style={{ color: '#64748b' }}>vs</span> {duelo.pB}% <strong style={{ color: '#f8fafc' }}>{bB.nombre}</strong></div>
                    <div style={{ marginTop: '4px', color: nivelVentaja(duelo.ventaja).c }}>Recomendado: <strong>{duelo.pA >= duelo.pB ? bA.nombre : bB.nombre}</strong> más bases alcanzadas · ventaja {duelo.ventaja}% ({nivelVentaja(duelo.ventaja).t})</div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748b', padding: '2px 4px', lineHeight: 1.5 }}>
                Score/ventaja = <strong>indicador heurístico v1</strong> (SLG, ISO, últimos 10/5 TB, mano y orden). Matchup HR/RBI/AVG y stats de pitcher = MLB Stats API oficial.
                Pendiente v2: Statcast (xSLG/barrel), probabilidad Poisson real, park factor y edge vs línea.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
