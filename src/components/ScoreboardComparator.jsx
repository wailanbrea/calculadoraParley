import React, { useState, useEffect, useRef } from 'react';

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

export default function ScoreboardComparator() {
  const [sport, setSport] = useState('basketball'); // basketball | soccer | mlb
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
      setGames(data);
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
    
    data.forEach((game, idx) => {
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
    
    // Para baloncesto y soccer comparamos Sofascore, Flashscore y ESPN
    const sofa = game.sofascore;
    const flash = game.flashscore;
    const espn = game.espn;
    
    const sources = [sofa, flash, espn].filter(Boolean);
    if (sources.length < 2) {
      return { type: 'OK', label: 'Una sola fuente' };
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

  const renderPeriodScore = (quarters) => {
    if (!quarters || quarters.length === 0) return '';
    return `(${quarters.join(', ')})`;
  };

  const adjustDate = (days) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <div style={{ padding: '20px', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔍</span> Comparador de Marcadores Multi-API
        </h2>
        
        {/* Controles de fecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => adjustDate(-1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px 10px', fontSize: '0.9rem' }}>◀</button>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', minWidth: '85px', textAlign: 'center', color: '#f8fafc' }}>
            {date.split('-').reverse().join('/')}
          </span>
          <button onClick={() => adjustDate(1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px 10px', fontSize: '0.9rem' }}>▶</button>
        </div>
      </div>

      {/* Selectores de Deportes */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setSport('basketball')} 
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold',
            background: sport === 'basketball' ? '#2563eb' : '#1e293b', color: '#f8fafc', transition: 'background 0.2s'
          }}
        >
          🏀 Baloncesto
        </button>
        <button 
          onClick={() => setSport('soccer')} 
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold',
            background: sport === 'soccer' ? '#2563eb' : '#1e293b', color: '#f8fafc', transition: 'background 0.2s'
          }}
        >
          ⚽ Soccer
        </button>
        <button 
          onClick={() => setSport('mlb')} 
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold',
            background: sport === 'mlb' ? '#2563eb' : '#1e293b', color: '#f8fafc', transition: 'background 0.2s'
          }}
        >
          ⚾ MLB (Béisbol)
        </button>
      </div>

      {/* Grid de Partidos */}
      {loading && games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando datos de comparación...</div>
      ) : error ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '15px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '20px' }}>
          {error}
        </div>
      ) : games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📭</div>
          No hay partidos de {sport === 'basketball' ? 'Baloncesto' : (sport === 'soccer' ? 'Soccer' : 'MLB')} registrados para esta fecha.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Partido / Liga</th>
                
                {sport !== 'mlb' ? (
                  <>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Sofascore</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Flashscore</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>ESPN.com</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>MLB.com (Base Datos)</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>ESPN.com</th>
                  </>
                )}
                
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', textAlign: 'center' }}>Comparación</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game, idx) => {
                const status = getComparisonStatus(game, sport);
                const isDiff = status.type === 'ERROR' || status.type === 'WARNING';
                
                return (
                  <tr 
                    key={idx} 
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: status.type === 'ERROR' ? 'rgba(239, 68, 68, 0.05)' : (status.type === 'WARNING' ? 'rgba(245, 158, 11, 0.03)' : 'transparent'),
                      transition: 'background 0.2s'
                    }}
                  >
                    {/* Partido */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '0.85rem' }}>
                        {game.home} vs {game.away}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '3px' }}>
                        {game.league}
                      </div>
                    </td>
                    
                    {/* Datos de Fuentes */}
                    {sport !== 'mlb' ? (
                      <>
                        {/* Sofascore */}
                        <td style={{ padding: '14px 16px', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
                          {game.sofascore ? (
                            <div>
                              <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>{game.sofascore.homeScore} - {game.sofascore.awayScore}</span>
                              <span style={{ color: '#475569', marginLeft: '6px', fontSize: '0.72rem' }}>{renderPeriodScore(game.sofascore.homeQuarters)}</span>
                              <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                                {game.sofascore.status}
                              </span>
                            </div>
                          ) : <span style={{ color: '#475569' }}>--</span>}
                        </td>
                        
                        {/* Flashscore */}
                        <td style={{ padding: '14px 16px', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
                          {game.flashscore ? (
                            <div>
                              <span style={{ fontWeight: 'bold', color: '#34d399' }}>{game.flashscore.homeScore} - {game.flashscore.awayScore}</span>
                              <span style={{ color: '#475569', marginLeft: '6px', fontSize: '0.72rem' }}>{renderPeriodScore(game.flashscore.homeQuarters)}</span>
                              <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                                {game.flashscore.status}
                              </span>
                            </div>
                          ) : <span style={{ color: '#475569' }}>--</span>}
                        </td>
                        
                        {/* ESPN */}
                        <td style={{ padding: '14px 16px', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
                          {game.espn ? (
                            <div>
                              <span style={{ fontWeight: 'bold', color: '#f87171' }}>{game.espn.homeScore} - {game.espn.awayScore}</span>
                              <span style={{ color: '#475569', marginLeft: '6px', fontSize: '0.72rem' }}>{renderPeriodScore(game.espn.homeQuarters)}</span>
                              <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                                {game.espn.status}
                              </span>
                            </div>
                          ) : <span style={{ color: '#475569' }}>--</span>}
                        </td>
                      </>
                    ) : (
                      <>
                        {/* MLB.com */}
                        <td style={{ padding: '14px 16px', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
                          {game.mlb ? (
                            <div>
                              <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>R: {game.mlb.homeRuns} - {game.mlb.awayRuns}</span>
                              <span style={{ color: '#64748b', marginLeft: '10px' }}>H: {game.mlb.homeHits} - {game.mlb.awayHits}</span>
                            </div>
                          ) : <span style={{ color: '#475569' }}>--</span>}
                        </td>
                        
                        {/* ESPN MLB */}
                        <td style={{ padding: '14px 16px', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
                          {game.espn ? (
                            <div>
                              <span style={{ fontWeight: 'bold', color: '#f87171' }}>R: {game.espn.homeRuns} - {game.espn.awayRuns}</span>
                              <span style={{ color: '#64748b', marginLeft: '10px' }}>H: {game.espn.homeHits} - {game.espn.awayHits}</span>
                              <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#334155', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                                {game.espn.status}
                              </span>
                            </div>
                          ) : <span style={{ color: '#475569' }}>--</span>}
                        </td>
                      </>
                    )}
                    
                    {/* Comparación Estado */}
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.02)' }}>
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
                        {status.type === 'OK' ? '✅ Coincide' : `⚠️ ${status.label}`}
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
