import React, { useState, useEffect, useRef } from 'react';

// MLB — Lineups confirmados + predicción de Bases Alcanzadas (v1).
// Fuente: MLB Stats API oficial (gratis, sin key), consultada directo desde el navegador.
//  - Lineup en el ORDEN OFICIAL de MLB (nunca se reordena).
//  - Columnas analíticas al lado: AVG, SLG, últimos 10 y 5 TB, score heurístico.
//  - Sección aparte "Mejores ventajas" (ahí sí se ordena por ventaja) + comparador A vs B.
// v2 (pendiente): Statcast (xSLG/barrel), probabilidad Poisson real, park factor, odds/edge.

const API = 'https://statsapi.mlb.com/api/v1';

function fechaHoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const nrm = (v, lo, hi) => clamp(((v - lo) / (hi - lo)) * 100, 0, 100);

// Score heurístico de bases alcanzadas (0-100). NO es una probabilidad calibrada:
// es un indicador relativo de fuerza para comparar bateadores del mismo juego.
function scoreBateador(b, pitcherThrows) {
  const slgN = nrm(b.slg, 0.300, 0.600);
  const isoN = nrm(b.slg - b.avg, 0.080, 0.300);
  const l10N = nrm(b.last10tb, 0, 25);
  const l5N = nrm(b.last5tb, 0, 14);
  let plat = 60; // sin dato de mano
  if (b.bats === 'S') plat = 62;
  else if (pitcherThrows && b.bats) plat = b.bats !== pitcherThrows ? 75 : 45; // opuesta favorable
  const spot = b.orden <= 2 ? 100 : b.orden <= 5 ? 85 : b.orden <= 7 ? 65 : 50;
  const s = slgN * 0.25 + isoN * 0.15 + l10N * 0.25 + l5N * 0.12 + plat * 0.15 + spot * 0.08;
  return Math.round(s * 10) / 10;
}

const fmt3 = (v) => (v === null || v === undefined || isNaN(v)) ? '—' : v.toFixed(3).replace(/^0/, '');
const colorScore = (s) => s >= 75 ? '#6ee7b7' : s >= 65 ? '#fcd34d' : s >= 55 ? '#fdba74' : '#94a3b8';

export default function MLBLineups() {
  const [selectedDate, setSelectedDate] = useState(fechaHoyISO());
  const [juegos, setJuegos] = useState([]);
  const [gamePk, setGamePk] = useState(null);
  const [detalle, setDetalle] = useState(null); // { estado, away, home }
  const [filtro, setFiltro] = useState('top5'); // top5 | full9
  const [cargandoJuegos, setCargandoJuegos] = useState(false);
  const [cargandoLineup, setCargandoLineup] = useState(false);
  const [error, setError] = useState(null);
  const [dueloA, setDueloA] = useState('');
  const [dueloB, setDueloB] = useState('');
  const logCache = useRef({}); // pid -> {last5, last10}

  // ---- Cargar juegos del día ----
  useEffect(() => {
    let vivo = true;
    setCargandoJuegos(true); setError(null); setDetalle(null); setGamePk(null);
    fetch(`${API}/schedule?sportId=1&date=${selectedDate}&hydrate=probablePitcher`)
      .then(r => r.json())
      .then(d => {
        if (!vivo) return;
        const gs = (d.dates && d.dates[0] && d.dates[0].games) || [];
        setJuegos(gs.map(g => ({
          gamePk: g.gamePk,
          estado: g.status && g.status.detailedState,
          hora: g.gameDate,
          away: g.teams.away.team.name,
          home: g.teams.home.team.name,
          pAway: g.teams.away.probablePitcher || null,
          pHome: g.teams.home.probablePitcher || null,
        })));
      })
      .catch(() => vivo && setError('No se pudo cargar el calendario de MLB'))
      .finally(() => vivo && setCargandoJuegos(false));
    return () => { vivo = false; };
  }, [selectedDate]);

  // ---- Sumar TB de los últimos N juegos desde el gameLog ----
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

  // ---- Cargar lineup del juego seleccionado ----
  async function cargarLineup(pk) {
    setGamePk(pk); setDetalle(null); setError(null); setCargandoLineup(true);
    const year = selectedDate.slice(0, 4);
    const juego = juegos.find(j => j.gamePk === pk);
    try {
      const box = await (await fetch(`${API}/game/${pk}/boxscore`)).json();
      const lados = {};
      const idsMano = new Set();
      [juego && juego.pAway, juego && juego.pHome].forEach(p => p && idsMano.add(p.id));

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
            avg: parseFloat(sb.avg) || 0,
            slg: parseFloat(sb.slg) || 0,
            tbTemp: parseInt(sb.totalBases || 0, 10),
            hr: parseInt(sb.homeRuns || 0, 10),
            bats: null, last10tb: 0, last5tb: 0, score: 0,
          };
        });
        lados[lado] = { team: t.team.name, bateadores };
      });

      const confirmado = lados.away.bateadores.length > 0 && lados.home.bateadores.length > 0;

      if (!confirmado) {
        setDetalle({
          estado: (juego && juego.estado) || 'Programado', confirmado: false,
          pAway: juego && juego.pAway, pHome: juego && juego.pHome,
          away: { team: box.teams.away.team.name }, home: { team: box.teams.home.team.name },
        });
        setCargandoLineup(false);
        return;
      }

      // Manos (batSide / pitchHand) en una sola llamada batch
      const manos = {};
      try {
        const pj = await (await fetch(`${API}/people?personIds=${[...idsMano].join(',')}`)).json();
        (pj.people || []).forEach(pp => {
          manos[pp.id] = { bats: pp.batSide && pp.batSide.code, throws: pp.pitchHand && pp.pitchHand.code };
        });
      } catch (e) { /* sin manos: el score usa neutro */ }

      const throwsHome = (juego && juego.pHome && manos[juego.pHome.id] && manos[juego.pHome.id].throws) || null;
      const throwsAway = (juego && juego.pAway && manos[juego.pAway.id] && manos[juego.pAway.id].throws) || null;

      // Últimos N TB en paralelo, para todos los bateadores de ambos lados
      const todos = [...lados.away.bateadores, ...lados.home.bateadores];
      await Promise.all(todos.map(async b => {
        b.bats = (manos[b.pid] && manos[b.pid].bats) || null;
        const u = await ultimasTB(b.pid, year);
        b.last10tb = u.last10; b.last5tb = u.last5;
      }));
      // Score: away batea contra el pitcher de home y viceversa
      lados.away.bateadores.forEach(b => { b.score = scoreBateador(b, throwsHome); });
      lados.home.bateadores.forEach(b => { b.score = scoreBateador(b, throwsAway); });

      setDetalle({
        estado: (juego && juego.estado) || 'Confirmado', confirmado: true,
        pAway: juego && juego.pAway, pHome: juego && juego.pHome,
        throwsAway, throwsHome,
        away: lados.away, home: lados.home,
      });
    } catch (e) {
      setError('No se pudo cargar el lineup de este juego');
    } finally {
      setCargandoLineup(false);
    }
  }

  const lim = filtro === 'top5' ? 5 : 9;

  // ---- Mejores ventajas (cruces entre ambos equipos, ordenados por ventaja) ----
  function mejoresVentajas() {
    if (!detalle || !detalle.confirmado) return [];
    const A = detalle.away.bateadores.slice(0, lim);
    const B = detalle.home.bateadores.slice(0, lim);
    const pares = [];
    A.forEach(a => B.forEach(b => {
      const pA = (a.score / (a.score + b.score)) * 100;
      const ventaja = Math.abs(pA - 50) * 2; // |pA - pB|
      const [mej, peor, pMej] = pA >= 50 ? [a, b, pA] : [b, a, 100 - pA];
      pares.push({ mej: mej.nombre, peor: peor.nombre, ventaja, pMej: Math.round(pMej * 10) / 10 });
    }));
    return pares.filter(p => p.ventaja >= 5).sort((x, y) => y.ventaja - x.ventaja).slice(0, 6);
  }

  const nivelVentaja = (v) => v >= 20 ? { t: 'Fuerte', c: '#6ee7b7' } : v >= 14 ? { t: 'Buena', c: '#86efac' }
    : v >= 9 ? { t: 'Jugable', c: '#fcd34d' } : { t: 'Watchlist', c: '#fdba74' };

  const todosBateadores = detalle && detalle.confirmado
    ? [...detalle.away.bateadores.map(b => ({ ...b, eq: detalle.away.team })), ...detalle.home.bateadores.map(b => ({ ...b, eq: detalle.home.team }))]
    : [];
  const bA = todosBateadores.find(b => String(b.pid) === dueloA);
  const bB = todosBateadores.find(b => String(b.pid) === dueloB);
  const duelo = (bA && bB) ? (() => {
    const pA = (bA.score / (bA.score + bB.score)) * 100;
    return { pA: Math.round(pA * 10) / 10, pB: Math.round((100 - pA) * 10) / 10, ventaja: Math.round(Math.abs(pA - 50) * 2 * 10) / 10 };
  })() : null;

  // ---- estilos ----
  const S = {
    wrap: { padding: '4px 2px', color: '#e2e8f0' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' },
    th: { fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textAlign: 'center', padding: '4px 6px', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' },
    td: { fontSize: '0.8rem', padding: '5px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
    btn: (on) => ({ padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, border: '1px solid ' + (on ? '#00d2ff' : 'rgba(255,255,255,0.15)'), background: on ? 'rgba(0,210,255,0.15)' : 'transparent', color: on ? '#67e8f9' : '#cbd5e1' }),
  };

  const TablaEquipo = ({ lado, throwsRival }) => {
    const eq = detalle[lado];
    const pRival = lado === 'away' ? detalle.pHome : detalle.pAway;
    return (
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{eq.team}</strong>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            vs {pRival ? pRival.fullName : 'P. por confirmar'} {throwsRival ? `(${throwsRival})` : ''}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['#', 'Bateador', 'Pos', 'Mano', 'AVG', 'SLG', 'Últ10 TB', 'Últ5 TB', 'Score'].map(h =>
                <th key={h} style={{ ...S.th, textAlign: h === 'Bateador' ? 'left' : 'center' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {eq.bateadores.slice(0, lim).map(b => {
                const fav = b.bats && throwsRival && b.bats !== throwsRival && b.bats !== 'S';
                return (
                  <tr key={b.pid} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ ...S.td, color: '#64748b', fontWeight: 700 }}>{b.orden}</td>
                    <td style={{ ...S.td, textAlign: 'left', color: '#f8fafc', fontWeight: 600 }}>{b.nombre}</td>
                    <td style={{ ...S.td, color: '#94a3b8' }}>{b.pos}</td>
                    <td style={{ ...S.td, color: fav ? '#6ee7b7' : '#cbd5e1' }}>{b.bats || '?'}{fav ? ' ✓' : ''}</td>
                    <td style={S.td}>{fmt3(b.avg)}</td>
                    <td style={S.td}>{fmt3(b.slg)}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{b.last10tb}</td>
                    <td style={S.td}>{b.last5tb}</td>
                    <td style={{ ...S.td, fontWeight: 800, color: colorScore(b.score) }}>{b.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const ventajas = mejoresVentajas();

  return (
    <div style={S.wrap}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>⚾ MLB — Lineups & Bases Alcanzadas</h2>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e2e8f0', padding: '6px 10px', fontSize: '0.85rem' }} />
      </div>

      {/* Selector de juego */}
      <div style={S.card}>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: '8px', letterSpacing: '.04em' }}>
          JUEGO {cargandoJuegos ? '· cargando…' : `· ${juegos.length} en la fecha`}
        </div>
        {error && <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '8px' }}>{error}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {juegos.map(j => (
            <button key={j.gamePk} onClick={() => cargarLineup(j.gamePk)}
              style={{ ...S.btn(j.gamePk === gamePk), padding: '8px 12px', textAlign: 'left', lineHeight: 1.3 }}>
              <div style={{ fontSize: '0.82rem' }}>{j.away} @ {j.home}</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.75 }}>
                {new Date(j.hora).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {j.estado}
              </div>
            </button>
          ))}
          {!cargandoJuegos && juegos.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No hay juegos en esta fecha.</span>}
        </div>
      </div>

      {cargandoLineup && <div style={{ color: '#67e8f9', padding: '10px 4px' }}>Cargando lineup y estadísticas…</div>}

      {/* Lineup no confirmado */}
      {detalle && !detalle.confirmado && !cargandoLineup && (
        <div style={{ ...S.card, borderColor: 'rgba(251,191,36,0.4)' }}>
          <div style={{ fontSize: '0.95rem', color: '#fcd34d', fontWeight: 600, marginBottom: '6px' }}>
            ⏳ Lineup aún no confirmado ({detalle.estado})
          </div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
            Los lineups de bateo suelen publicarse 1-3 horas antes del juego. Por ahora solo hay pitchers probables:
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.9rem' }}>
            <div>{detalle.away.team}: <strong>{detalle.pAway ? detalle.pAway.fullName : '—'}</strong></div>
            <div>{detalle.home.team}: <strong>{detalle.pHome ? detalle.pHome.fullName : '—'}</strong></div>
          </div>
        </div>
      )}

      {/* Lineup confirmado */}
      {detalle && detalle.confirmado && !cargandoLineup && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button style={S.btn(filtro === 'top5')} onClick={() => setFiltro('top5')}>Top 5</button>
            <button style={S.btn(filtro === 'full9')} onClick={() => setFiltro('full9')}>Lineup completo (9)</button>
          </div>

          <TablaEquipo lado="away" throwsRival={detalle.throwsHome} />
          <TablaEquipo lado="home" throwsRival={detalle.throwsAway} />

          {/* Mejores ventajas */}
          <div style={S.card}>
            <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700, marginBottom: '8px' }}>
              🎯 Mejores ventajas detectadas <span style={{ color: '#64748b', fontWeight: 400 }}>(comparación interna — no altera el lineup)</span>
            </div>
            {ventajas.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No hay ventajas &gt; 5% entre estos bateadores; todo muy parejo.</div>
            ) : ventajas.map((v, i) => {
              const n = nivelVentaja(v.ventaja);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                  <span><strong style={{ color: '#f8fafc' }}>{v.mej}</strong> <span style={{ color: '#64748b' }}>&gt;</span> {v.peor}</span>
                  <span style={{ color: n.c, fontWeight: 700 }}>{v.pMej}% · ventaja {v.ventaja.toFixed(0)}% · {n.t}</span>
                </div>
              );
            })}
          </div>

          {/* Comparador A vs B */}
          <div style={S.card}>
            <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700, marginBottom: '8px' }}>⚔️ Comparar bateador A vs B</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {[['A', dueloA, setDueloA], ['B', dueloB, setDueloB]].map(([lbl, val, set]) => (
                <select key={lbl} value={val} onChange={e => set(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#e2e8f0', padding: '6px 8px', fontSize: '0.82rem', maxWidth: '220px' }}>
                  <option value="">Jugador {lbl}…</option>
                  {todosBateadores.map(b => <option key={b.pid} value={b.pid}>{b.nombre} ({b.eq})</option>)}
                </select>
              ))}
            </div>
            {duelo && (
              <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                <div><strong style={{ color: '#f8fafc' }}>{bA.nombre}</strong> {duelo.pA}% <span style={{ color: '#64748b' }}>vs</span> {duelo.pB}% <strong style={{ color: '#f8fafc' }}>{bB.nombre}</strong></div>
                <div style={{ marginTop: '4px', color: duelo.ventaja >= 9 ? '#6ee7b7' : '#fdba74' }}>
                  Recomendado: <strong>{duelo.pA >= duelo.pB ? bA.nombre : bB.nombre}</strong> más bases alcanzadas · ventaja {duelo.ventaja}% ({nivelVentaja(duelo.ventaja).t})
                </div>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.72rem', color: '#64748b', padding: '2px 4px', lineHeight: 1.5 }}>
            Score y ventaja son un <strong>indicador heurístico v1</strong> (SLG, ISO, últimos 10/5 TB, mano y orden), no una probabilidad calibrada.
            El lineup se muestra en el orden oficial de MLB. Pendiente v2: Statcast (xSLG/barrel), probabilidad Poisson real, park factor y edge vs línea.
          </div>
        </>
      )}
    </div>
  );
}
