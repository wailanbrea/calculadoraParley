import { useState, useEffect, useRef } from 'react';

// Sonido de alerta sintetizado con Web Audio API (para no depender de archivos externos)
function playBeepAlert() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // La natural
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    console.error("Audio Context no inicializado por interacción del usuario", e);
  }
}

const SOURCE_META = {
  sofascore:  { label: 'Sofascore',  color: '#60a5fa' },
  flashscore: { label: 'Flashscore', color: '#34d399' },
  espn:       { label: 'ESPN.com',   color: '#f87171' }
};

const tieneMarcador = (s) => s && s.homeScore !== '' && s.awayScore !== '' &&
  s.homeScore !== undefined && s.awayScore !== undefined;

export default function ScoreboardComparator() {
  const [sport, setSport] = useState('basketball'); // basketball | soccer | mlb
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | matched | diff
  const [lastUpdate, setLastUpdate] = useState(null);

  // Guardar IDs de partidos que están en discrepancia para emitir el pitido solo una vez cuando surge
  const activeDiscrepancies = useRef(new Set());

  const fetchComparison = async (targetSport, targetDate) => {
    setLoading(true);
    setError(null);
    try {
      const action = targetSport === 'basketball'
        ? 'get_basketball_comparison'
        : (targetSport === 'soccer' ? 'get_soccer_comparison' : 'get_mlb_comparison');

      const res = await fetch(`./api.php?action=${action}&date=${targetDate}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();

      processDiscrepancies(data, targetSport);
      setGames(Array.isArray(data) ? data : []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los datos de comparación.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison(sport, date);
    const interval = setInterval(() => {
      fetchComparison(sport, date);
    }, 30000); // Auto-refresco cada 30 segundos

    return () => clearInterval(interval);
  }, [sport, date]);

  const processDiscrepancies = (data, targetSport) => {
    let playSound = false;
    const currentDiscrepancies = new Set();

    (Array.isArray(data) ? data : []).forEach((game) => {
      const gameKey = `${targetSport}-${game.home}-${game.away}`;
      const statusObj = getComparisonStatus(game, targetSport);

      if (statusObj.type === 'ERROR') {
        currentDiscrepancies.add(gameKey);
        if (!activeDiscrepancies.current.has(gameKey)) {
          // Nueva discrepancia encontrada!
          playSound = true;
        }
      }
    });

    activeDiscrepancies.current = currentDiscrepancies;
    if (playSound) {
      playBeepAlert();
    }
  };

  const getComparisonStatus = (game, targetSport) => {
    if (targetSport === 'mlb') {
      const mlb = game.mlb;
      const espn = game.espn;
      if (!mlb || !espn) return { type: 'OK', label: 'Sin datos cruzados' };

      const runMismatch = parseInt(mlb.homeRuns) !== parseInt(espn.homeRuns) ||
                          parseInt(mlb.awayRuns) !== parseInt(espn.awayRuns);
      const hitMismatch = parseInt(mlb.homeHits) !== parseInt(espn.homeHits) ||
                          parseInt(mlb.awayHits) !== parseInt(espn.awayHits);

      if (runMismatch) return { type: 'ERROR', label: 'Diferencia en Carreras (Runs)' };
      if (hitMismatch) return { type: 'WARNING', label: 'Diferencia en Hits' };
      return { type: 'OK', label: 'Marcadores Coinciden' };
    }

    // Para baloncesto y soccer comparamos Sofascore, Flashscore y ESPN.
    // Solo cuentan las fuentes con marcador real: una fuente vacía (juego no
    // iniciado o con retraso) no debe generar discrepancias falsas.
    const sources = [game.sofascore, game.flashscore, game.espn].filter(tieneMarcador);
    if (sources.length < 2) {
      return { type: 'OK', label: 'Sin datos cruzados' };
    }

    // Comparar totales
    const scores = sources.map(s => `${s.homeScore}-${s.awayScore}`);
    const distinctScores = [...new Set(scores)];

    if (distinctScores.length > 1) {
      return { type: 'ERROR', label: 'Diferencia en Marcador Total' };
    }

    // Comparar desglose de cuartos/periodos
    const periodsCounts = sources.map(s => (s.homeQuarters || []).length);
    const maxPeriods = Math.max(...periodsCounts);

    for (let i = 0; i < maxPeriods; i++) {
      const parts = [];
      sources.forEach(s => {
        const hQ = s.homeQuarters?.[i] || '';
        const aQ = s.awayQuarters?.[i] || '';
        if (hQ !== '' || aQ !== '') {
          parts.push(`${hQ}-${aQ}`);
        }
      });
      const distinctParts = [...new Set(parts)];
      if (distinctParts.length > 1) {
        return { type: 'WARNING', label: `Diferencia en Periodo ${i + 1}` };
      }
    }

    return { type: 'OK', label: 'Datos Coinciden' };
  };

  const getStatusColor = (type) => {
    if (type === 'ERROR') return '#ef4444';
    if (type === 'WARNING') return '#f59e0b';
    return '#10b981';
  };

  const adjustDate = (days) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  // ---------- Datos derivados para el resumen y filtros ----------
  const sourceKeys = sport === 'mlb' ? ['mlb', 'espn'] : ['sofascore', 'flashscore', 'espn'];
  const withStatus = games.map(g => ({ game: g, status: getComparisonStatus(g, sport) }));
  const numFuentes = (g) => sourceKeys.filter(k => g[k]).length;
  const totales = {
    partidos: games.length,
    cruzados: games.filter(g => numFuentes(g) >= 2).length,
    diferencias: withStatus.filter(x => x.status.type === 'ERROR' || x.status.type === 'WARNING').length
  };
  const porFuente = {};
  sourceKeys.forEach(k => { porFuente[k] = games.filter(g => g[k]).length; });

  const visibles = withStatus.filter(({ game, status }) => {
    if (filter === 'matched') return numFuentes(game) >= 2;
    if (filter === 'diff') return status.type === 'ERROR' || status.type === 'WARNING';
    return true;
  });

  // ---------- Estilos base reutilizables ----------
  const th = { padding: '12px 14px', color: '#94a3b8', fontWeight: '600', position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 };
  const chip = { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', color: '#cbd5e1' };
  const filterBtn = (id) => ({
    padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
    fontSize: '0.75rem', fontWeight: 'bold', background: filter === id ? '#334155' : 'transparent',
    color: filter === id ? '#f8fafc' : '#94a3b8', transition: 'background 0.2s'
  });
  const sportBtn = (id) => ({
    padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold',
    background: sport === id ? '#2563eb' : '#1e293b', color: '#f8fafc', transition: 'background 0.2s'
  });

  const statusBadgeStyle = (status) => {
    const esVivo = status && status !== 'FT' && status !== 'NS';
    return {
      marginLeft: '8px', fontSize: '0.62rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px',
      background: esVivo ? 'rgba(245, 158, 11, 0.18)' : '#334155',
      color: esVivo ? '#fbbf24' : (status === 'FT' ? '#6ee7b7' : '#94a3b8')
    };
  };

  // Celda de una fuente (Sofascore / Flashscore / ESPN)
  const renderSourceCell = (data, key) => {
    const meta = SOURCE_META[key];
    if (!data) {
      return (
        <td key={key} style={{ padding: '12px 14px', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
          <span style={{ color: '#334155' }} title={`${meta.label} no cubre este partido`}>—</span>
        </td>
      );
    }
    const sinMarcador = !tieneMarcador(data);
    return (
      <td key={key} style={{ padding: '12px 14px', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px' }}>
          <span style={{ fontWeight: 'bold', color: meta.color, fontSize: '0.9rem' }}>
            {sinMarcador ? 'vs' : `${data.homeScore} - ${data.awayScore}`}
          </span>
          <span style={statusBadgeStyle(data.status)}>{data.status}</span>
        </div>
        {data.homeQuarters && data.homeQuarters.length > 0 && (
          <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '3px' }}>
            {data.homeQuarters.map((q, i) => `${q}-${data.awayQuarters?.[i] ?? ''}`).join('  ·  ')}
          </div>
        )}
      </td>
    );
  };

  // Celda MLB (runs + hits)
  const renderMlbCell = (data, color, key) => {
    if (!data) {
      return (
        <td key={key} style={{ padding: '12px 14px', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
          <span style={{ color: '#334155' }}>—</span>
        </td>
      );
    }
    return (
      <td key={key} style={{ padding: '12px 14px', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
        <span style={{ fontWeight: 'bold', color }}>R: {data.homeRuns} - {data.awayRuns}</span>
        <span style={{ color: '#64748b', marginLeft: '10px' }}>H: {data.homeHits} - {data.awayHits}</span>
        {data.status && <span style={statusBadgeStyle(data.status)}>{data.status}</span>}
      </td>
    );
  };

  return (
    <div className="scoreboard-comparator-page" style={{ padding: '20px', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔍</span> Comparador de Marcadores Multi-API
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Controles de fecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => adjustDate(-1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px 10px', fontSize: '0.9rem' }}>◀</button>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', minWidth: '85px', textAlign: 'center', color: '#f8fafc' }}>
              {date.split('-').reverse().join('/')}
            </span>
            <button onClick={() => adjustDate(1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px 10px', fontSize: '0.9rem' }}>▶</button>
          </div>
          <button
            onClick={() => fetchComparison(sport, date)}
            disabled={loading}
            style={{ background: '#2563eb', border: 'none', color: '#f8fafc', cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '⏳ Actualizando…' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      {/* Selectores de Deportes */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
        <button onClick={() => setSport('basketball')} style={sportBtn('basketball')}>🏀 Baloncesto</button>
        <button onClick={() => setSport('soccer')} style={sportBtn('soccer')}>⚽ Soccer</button>
        <button onClick={() => setSport('mlb')} style={sportBtn('mlb')}>⚾ MLB (Béisbol)</button>
      </div>

      {/* Resumen + filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={chip}>📋 {totales.partidos} partidos</span>
          <span style={chip}>🔗 {totales.cruzados} con 2+ fuentes</span>
          <span style={{ ...chip, ...(totales.diferencias > 0 ? { borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' } : {}) }}>
            ⚠️ {totales.diferencias} con diferencias
          </span>
          {sourceKeys.map(k => {
            const meta = SOURCE_META[k] || { label: 'MLB.com', color: '#60a5fa' };
            return (
              <span key={k} style={chip}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color, display: 'inline-block' }}></span>
                {meta.label}: {porFuente[k]}
              </span>
            );
          })}
          {lastUpdate && (
            <span style={{ ...chip, color: '#64748b' }}>
              🕐 {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setFilter('all')} style={filterBtn('all')}>Todos</button>
          <button onClick={() => setFilter('matched')} style={filterBtn('matched')}>Cruzados</button>
          <button onClick={() => setFilter('diff')} style={filterBtn('diff')}>Diferencias</button>
        </div>
      </div>

      {/* Grid de Partidos */}
      {loading && games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando datos de comparación...</div>
      ) : error ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '15px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '20px' }}>
          {error}
        </div>
      ) : visibles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📭</div>
          {games.length === 0
            ? `No hay partidos de ${sport === 'basketball' ? 'Baloncesto' : (sport === 'soccer' ? 'Soccer' : 'MLB')} registrados para esta fecha.`
            : 'Ningún partido cumple el filtro seleccionado.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={th}>Partido / Liga</th>

                {sport !== 'mlb' ? (
                  <>
                    {['sofascore', 'flashscore', 'espn'].map(k => (
                      <th key={k} style={th}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SOURCE_META[k].color, display: 'inline-block' }}></span>
                          {SOURCE_META[k].label}
                          <span style={{ color: '#475569', fontWeight: 'normal' }}>({porFuente[k]})</span>
                        </span>
                      </th>
                    ))}
                  </>
                ) : (
                  <>
                    <th style={th}>MLB.com (Base Datos)</th>
                    <th style={th}>ESPN.com</th>
                  </>
                )}

                <th style={{ ...th, textAlign: 'center' }}>Comparación</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map(({ game, status }, idx) => {
                const isDiff = status.type === 'ERROR' || status.type === 'WARNING';

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: status.type === 'ERROR' ? 'rgba(239, 68, 68, 0.07)'
                        : (status.type === 'WARNING' ? 'rgba(245, 158, 11, 0.05)'
                        : (idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent')),
                      transition: 'background 0.2s'
                    }}
                  >
                    {/* Partido */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '0.85rem' }}>
                        {game.home} <span style={{ color: '#475569', fontWeight: 'normal' }}>vs</span> {game.away}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '3px' }}>
                        {game.league}
                      </div>
                    </td>

                    {/* Datos de Fuentes */}
                    {sport !== 'mlb' ? (
                      <>
                        {renderSourceCell(game.sofascore, 'sofascore')}
                        {renderSourceCell(game.flashscore, 'flashscore')}
                        {renderSourceCell(game.espn, 'espn')}
                      </>
                    ) : (
                      <>
                        {renderMlbCell(game.mlb, '#60a5fa', 'mlb')}
                        {renderMlbCell(game.espn, '#f87171', 'espn')}
                      </>
                    )}

                    {/* Comparación Estado */}
                    <td style={{ padding: '12px 14px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          color: '#0f172a',
                          background: getStatusColor(status.type),
                          animation: isDiff ? 'pulse 1.5s infinite' : 'none'
                        }}
                      >
                        {status.type === 'OK' ? `✅ ${status.label}` : `⚠️ ${status.label}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Inyección de estilos CSS para la animación de parpadeo */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
