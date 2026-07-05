import React, { useState, useEffect, useRef } from 'react';
import LiveScoreboard from './LiveScoreboard';

function fechaHoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function simplificarNombreEquipo(fullName) {
  const clean = (fullName || '').replace(/text/i, '').trim();
  const parts = clean.split(' ');
  if (parts.length <= 1) return clean;
  
  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  
  if (last.toLowerCase() === 'sox' || last.toLowerCase() === 'jays') {
    return prev + ' ' + last;
  }
  return last;
}

export default function BasesAlcanzadas({ config }) {
  const [games, setGames] = useState({});
  const [scheduleGames, setScheduleGames] = useState([]);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(fechaHoyISO());
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [message, setMessage] = useState(null);
  const bookmarkletRef = useRef(null);

  // Determinar la URL base de la API de forma dinámica
  const currentUrl = window.location.href;
  const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
  const apiTargetUrl = baseUrl + 'api.php';
  const token = config?.importToken || 'calcparley_import_token_secure_9876';

  const selectedGameIdRef = useRef(selectedGameId);
  useEffect(() => {
    selectedGameIdRef.current = selectedGameId;
  }, [selectedGameId]);

  // Cargar juegos desde el servidor
  const loadBasesFromServer = (silent = false) => {
    if (!silent) setLoading(true);
    fetch(`./api.php?action=get_bases&_=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error("Error cargando los datos de bases alcanzadas");
        return res.json();
      })
      .then(data => {
        setGames(data || {});
        const keys = Object.keys(data || {});
        if (keys.length > 0 && !selectedGameIdRef.current) {
          setSelectedGameId(keys[0]);
        }
      })
      .catch(err => {
        console.error(err);
        setMessage({ type: 'error', text: err.message });
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  // Sincronizar juegos finalizados desde la API oficial de la MLB (solo manual)
  const syncingRef = useRef(false);
  const syncMlbGames = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    // Si se está viendo un día anterior, importar los finales de ese día
    const paramFecha = selectedDate !== fechaHoyISO() ? `&date=${selectedDate}` : '';
    fetch(`./api.php?action=sync_mlb_bases${paramFecha}&_=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error("Error sincronizando con la API de la MLB");
        return res.json();
      })
      .then(data => {
        if (data && data.games) {
          setGames(data.games);
          const keys = Object.keys(data.games);
          if (keys.length > 0 && !selectedGameIdRef.current) {
            setSelectedGameId(keys[0]);
          }
        }
        setLastSync(new Date());
        const nuevos = data && typeof data.synchronized === 'number' ? data.synchronized : 0;
        setMessage({
          type: 'success',
          text: nuevos > 0
            ? `Sincronización completada: ${nuevos} juego(s) nuevo(s) importado(s).`
            : 'Sincronización completada: no hay juegos finalizados nuevos.'
        });
        setTimeout(() => setMessage(null), 5000);
      })
      .catch(err => {
        console.error(err);
        setMessage({ type: 'error', text: err.message });
      })
      .finally(() => {
        syncingRef.current = false;
        setSyncing(false);
      });
  };

  // Carga inicial e intervalo de refresco
  useEffect(() => {
    loadBasesFromServer();
    const interval = setInterval(() => {
      loadBasesFromServer(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Limpiar historial en el servidor
  const handleClearHistory = () => {
    if (!window.confirm("¿Seguro que deseas eliminar todos los resultados de bases alcanzadas guardados?")) return;
    
    setLoading(true);
    fetch(`./api.php?action=clear_bases`, {
      method: 'POST',
      headers: {
        'X-CalcParley-Import-Token': token
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Fallo al limpiar el historial");
        return res.json();
      })
      .then(() => {
        setGames({});
        setSelectedGameId(null);
        setMessage({ type: 'success', text: 'Historial eliminado con éxito.' });
        setTimeout(() => setMessage(null), 4000);
      })
      .catch(err => {
        console.error(err);
        setMessage({ type: 'error', text: err.message });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // bookmarklet code (sin caracteres de escape problemáticos)
  const bookmarkletCode = `javascript:(function(){
    const token = '${token}';
    const serverUrl = '${apiTargetUrl}';
    
    const gameIdMatch = window.location.href.match(/\\/([0-9]{5,8})\\//);
    const gameId = gameIdMatch ? gameIdMatch[1] : null;
    if (!gameId) {
      alert("No se pudo obtener el ID del juego de la URL actual. Asegúrate de estar en una página de MLB Gameday.");
      return;
    }
    
    fetch('https://statsapi.mlb.com/api/v1/game/' + gameId + '/boxscore')
      .then(function(res) {
        if (!res.ok) throw new Error("Error consultando la API de la MLB (Status: " + res.status + ")");
        return res.json();
      })
      .then(function(data) {
        const boxscores = [];
        const teams = ['away', 'home'];
        
        teams.forEach(function(tKey) {
          const teamData = data.teams[tKey];
          const teamName = teamData.team.name;
          const teamRuns = teamData.teamStats.batting.runs || 0;
          
          const playersObj = teamData.players;
          const playersList = [];
          
          Object.keys(playersObj).forEach(function(pId) {
            const p = playersObj[pId];
            if (p.battingOrder) {
              playersList.push(p);
            }
          });
          
          playersList.sort(function(a, b) {
            return parseInt(a.battingOrder, 10) - parseInt(b.battingOrder, 10);
          });
          
          const lineup = [];
          playersList.forEach(function(p) {
            const fullName = p.person.fullName;
            const cleanName = fullName.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
            
            const isSub = !p.battingOrder.endsWith('00');
            
            const batStats = p.stats.batting || {};
            const ab = batStats.atBats || 0;
            const r = batStats.runs || 0;
            const h = batStats.hits || 0;
            const rbi = batStats.rbi || 0;
            const so = batStats.strikeOuts || 0;
            const tb = batStats.totalBases || 0;
            
            const todosCeros = (!isSub && ab === 0 && r === 0 && h === 0 && rbi === 0 && so === 0);
            
            const pos = p.position ? p.position.abbreviation : '';
            const rawName = fullName + (pos ? ' ' + pos : '');
            
            lineup.push({
              rawName: rawName,
              cleanName: cleanName,
              isSubstitution: isSub,
              hits: h,
              tb: isSub ? 0 : tb,
              todosCeros: todosCeros,
              stats: { ab: ab, r: r, h: h, rbi: rbi, so: so }
            });
          });
          
          boxscores.push({
            teamName: teamName,
            runs: teamRuns,
            lineup: lineup
          });
        });
        
        const dateMatch = window.location.href.match(/\\/([0-9]{4})\\/([0-9]{2})\\/([0-9]{2})\\//);
        const date = dateMatch ? dateMatch[1] + '/' + dateMatch[2] + '/' + dateMatch[3] : new Date().toLocaleDateString();
        
        let title = document.title.replace('Boxscore | ', '').replace(' | MLB.com', '').trim();
        if (!title || title.indexOf('http') === 0) {
          title = boxscores.map(function(t){ return t.teamName; }).join(' vs ');
        }
        
        return fetch(serverUrl + '?action=save_bases', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CalcParley-Import-Token': token
          },
          body: JSON.stringify({
            gameId: gameId,
            date: date,
            title: title,
            captured_at: new Date().toISOString(),
            boxscores: boxscores
          })
        });
      })
      .then(function(res) {
        if (!res.ok) throw new Error('Error al guardar en el servidor (Status: ' + res.status + ')');
        return res.json();
      })
      .then(function(data) {
        alert('Sincronización exitosa: Bases alcanzadas guardadas correctamente.');
      })
      .catch(function(err) {
        alert('Fallo al importar: ' + err.message);
      });
  })();`;

  const compressedBookmarklet = bookmarkletCode
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  useEffect(() => {
    if (bookmarkletRef.current) {
      bookmarkletRef.current.href = compressedBookmarklet;
    }
  }, [compressedBookmarklet]);

  // Autoseleccionar el primer juego del día si no hay nada elegido
  useEffect(() => {
    if (!selectedGameIdRef.current && scheduleGames.length > 0) {
      setSelectedGameId(String(scheduleGames[0].gamePk));
    }
  }, [scheduleGames]);

  // Recibe los juegos del calendario desde LiveScoreboard
  const handleGamesUpdate = (gs) => {
    setScheduleGames(gs);
    setScheduleLoaded(true);
  };

  // Cambiar la fecha consultada (limpia la selección para autoseleccionar en la nueva fecha)
  const cambiarFecha = (nueva) => {
    if (!nueva) return;
    setSelectedDate(nueva);
    setSelectedGameId(null);
    setScheduleGames([]);
    setScheduleLoaded(false);
  };

  const sumarDias = (n) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + n);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    cambiarFecha(`${d.getFullYear()}-${mm}-${dd}`);
  };

  const esHoy = selectedDate === fechaHoyISO();

  const activeGame = selectedGameId ? games[selectedGameId] : null;
  const gameIds = Object.keys(games);

  // Juego seleccionado dentro del calendario de hoy (para conocer su estado)
  const selectedSchedule = selectedGameId
    ? scheduleGames.find(g => String(g.gamePk) === String(selectedGameId))
    : null;
  // Los importados que ya no están en el calendario de hoy se tratan como finales
  const selectedEsFinal = selectedSchedule
    ? selectedSchedule.status.abstractGameState === 'Final'
    : !!activeGame;

  // Estilos de la lista según el estado del juego
  const estilosEstado = {
    Final: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.45)', accent: '#fca5a5' },
    Live: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.45)', accent: '#6ee7b7' },
    Preview: { bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.1)', accent: '#94a3b8' }
  };

  // Categoría real del juego: solo es "Live" si de verdad empezó a jugarse
  // (la MLB marca "Live" también el calentamiento previo)
  const categoriaJuego = (g) => {
    const abs = g.status.abstractGameState;
    const det = g.status.detailedState || '';
    const ls = g.linescore;
    const empezo = !!(ls && ls.currentInning >= 1 && ls.innings && ls.innings.length > 0);
    if (det.indexOf('Postponed') !== -1 || det.indexOf('Cancelled') !== -1 || det.indexOf('Suspended') !== -1) {
      return 'Preview';
    }
    if (abs === 'Final') return empezo ? 'Final' : 'Preview';
    if (abs === 'Live' && empezo) return 'Live';
    return 'Preview';
  };

  return (
    <div className="ba-page" style={{ padding: '24px', background: '#060813', minHeight: '100vh', color: '#f8fafc' }}>

      {/* Reglas responsive según el ancho de pantalla */}
      <style>{`
        @media (max-width: 900px) {
          .ba-grid { display: flex !important; flex-direction: column !important; align-items: stretch !important; }
          .ba-grid > div { width: auto !important; min-width: 0 !important; }
          .ba-sidebar { position: static !important; max-height: none !important; }
          .ba-lista { flex: none !important; max-height: 45vh !important; }
        }
        @media (max-width: 760px) {
          .ba-page { padding: 12px !important; }
          .ba-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .ba-header-botones { width: 100% !important; flex-wrap: wrap !important; }
          .ba-lineups { grid-template-columns: 1fr !important; gap: 14px !important; }
        }
      `}</style>

      {/* Cabecera */}
      <div className="ba-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#00d2ff', textShadow: '0 0 10px rgba(0, 210, 255, 0.2)' }}>
            ⚾ Bases Alcanzadas Resultados
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
            Pulsa "Sincronizar MLB" para importar los juegos finalizados desde la API oficial de la MLB
            {lastSync && ` · Última sincronización: ${lastSync.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="ba-header-botones" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={() => syncMlbGames()}
          disabled={syncing}
          style={{ padding: '8px 16px', background: 'rgba(0, 210, 255, 0.1)', border: '1px solid rgba(0, 210, 255, 0.4)', borderRadius: '6px', color: '#00d2ff', fontWeight: 'bold', cursor: syncing ? 'wait' : 'pointer', transition: '0.2s', opacity: syncing ? 0.6 : 1 }}
          onMouseOver={(e) => { if (!syncing) e.target.style.background = 'rgba(0, 210, 255, 0.2)'; }}
          onMouseOut={(e) => e.target.style.background = 'rgba(0, 210, 255, 0.1)'}
        >
          {syncing ? '⏳ Sincronizando...' : '🔄 Sincronizar MLB'}
        </button>
        {gameIds.length > 0 && (
          <button
            onClick={handleClearHistory}
            style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
            onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            Limpiar Historial
          </button>
        )}
        </div>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', border: message.type === 'error' ? '1px solid #ef4444' : '1px solid #10b981', color: message.type === 'error' ? '#fca5a5' : '#a7f3d0' }}>
          {message.text}
        </div>
      )}

      <div className="ba-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Barra lateral fija: ocupa toda la altura de la ventana */}
        <div className="ba-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '16px', maxHeight: 'calc(100vh - 32px)' }}>

          {/* Tarjeta del Bookmarklet (colapsada para dejar espacio a la lista) */}
          <details style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px 16px', flexShrink: 0 }}>
            <summary style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#f8fafc', cursor: 'pointer' }}>
              ⚡ Importador 1-Clic MLB (opcional)
            </summary>
            <p style={{ margin: '12px 0 16px 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.4' }}>
              Este marcador es un respaldo del botón "Sincronizar MLB": arrástralo a tu barra de favoritos y úsalo en un Boxscore de MLB.com si necesitas importar un juego manualmente.
            </p>
            <a
              ref={bookmarkletRef}
              style={{
                display: 'block',
                textAlign: 'center',
                background: 'linear-gradient(90deg, #00d2ff 0%, #00a8e6 100%)',
                color: '#060813',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(0, 210, 255, 0.25)',
                cursor: 'move',
                transition: '0.2s'
              }}
              onClick={(e) => {
                e.preventDefault();
                alert("Arrastra este botón a tu barra de favoritos en tu navegador (puedes mostrarla con Ctrl+Mayús+B).");
              }}
            >
              ⚽ Importar Bases
            </a>
          </details>

          {/* Lista de todos los juegos de la fecha, coloreados por estado (se estira hasta abajo) */}
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 'bold', color: '#f8fafc' }}>
              Partidos Cargados
            </h3>

            {/* Selector de fecha */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={() => sumarDias(-1)}
                title="Día anterior"
                style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ◀
              </button>
              <input
                type="date"
                value={selectedDate}
                max={fechaHoyISO()}
                onChange={(e) => cambiarFecha(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', background: '#060813', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.8rem', colorScheme: 'dark' }}
              />
              <button
                onClick={() => sumarDias(1)}
                disabled={esHoy}
                title="Día siguiente"
                style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: esHoy ? '#334155' : '#94a3b8', cursor: esHoy ? 'default' : 'pointer', fontWeight: 'bold', opacity: esHoy ? 0.5 : 1 }}
              >
                ▶
              </button>
            </div>
            {!esHoy && (
              <button
                onClick={() => cambiarFecha(fechaHoyISO())}
                style={{ padding: '6px 10px', background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.4)', borderRadius: '6px', color: '#00d2ff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                📅 Volver a Hoy (en vivo)
              </button>
            )}

            <div style={{ display: 'flex', gap: '10px', fontSize: '0.68rem', color: '#64748b', flexWrap: 'wrap' }}>
              <span><span style={{ color: '#ef4444' }}>●</span> Final</span>
              <span><span style={{ color: '#10b981' }}>●</span> En juego</span>
              <span><span style={{ color: '#94a3b8' }}>●</span> Sin empezar</span>
            </div>

            {!scheduleLoaded && scheduleGames.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                Cargando los juegos del {esHoy ? 'día' : selectedDate}...
              </div>
            ) : scheduleLoaded && scheduleGames.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                No hay juegos de MLB en esta fecha.
              </div>
            ) : (
              <div className="ba-lista" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {scheduleGames.map(g => {
                  const pk = String(g.gamePk);
                  const cat = categoriaJuego(g);
                  const det = g.status.detailedState || '';
                  const est = estilosEstado[cat];
                  const isSelected = pk === String(selectedGameId);
                  const ls = g.linescore;
                  const away = g.teams.away.team.teamName;
                  const home = g.teams.home.team.teamName;

                  let displayTitle, subtexto;
                  if (cat === 'Preview') {
                    displayTitle = `${away} vs ${home}`;
                    if (det.indexOf('Postponed') !== -1) {
                      subtexto = 'Pospuesto';
                    } else if (det.indexOf('Suspended') !== -1) {
                      subtexto = 'Suspendido';
                    } else if (det.indexOf('Cancelled') !== -1) {
                      subtexto = 'Cancelado';
                    } else if (det.indexOf('Warmup') !== -1) {
                      subtexto = `Calentamiento · ${new Date(g.gameDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    } else {
                      subtexto = `Inicia: ${new Date(g.gameDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    }
                  } else {
                    const rA = (ls && ls.teams && ls.teams.away && ls.teams.away.runs) || 0;
                    const rH = (ls && ls.teams && ls.teams.home && ls.teams.home.runs) || 0;
                    displayTitle = `${away} ${rA}, ${home} ${rH}`;
                    if (cat === 'Final') {
                      subtexto = 'Final';
                    } else {
                      const flecha = ls && ls.inningState === 'Top' ? '▲' : '▼';
                      subtexto = `En juego · ${flecha} ${(ls && ls.currentInning) || ''}`;
                    }
                  }

                  return (
                    <button
                      key={pk}
                      onClick={() => setSelectedGameId(pk)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        background: est.bg,
                        border: isSelected ? '2px solid #00d2ff' : `1px solid ${est.border}`,
                        borderRadius: '6px',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        transition: '0.15s',
                        width: '100%'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayTitle}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: est.accent, marginTop: '4px', fontWeight: 'bold' }}>
                        {subtexto}
                      </div>
                    </button>
                  );
                })}

              </div>
            )}
          </div>

        </div>

        {/* Panel derecho: Visor de Lineups y Bases Alcanzadas */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Contenido centrado a un ancho de lectura cómodo (estándar ~1200px) */}
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {/* Marcador en vivo del juego seleccionado + alertas de innings */}
          <LiveScoreboard gameId={selectedGameId} onGamesUpdate={handleGamesUpdate} date={selectedDate} />
          {!selectedGameId ? (
            <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>⚾</span>
              Selecciona un juego de la lista para ver su marcador en vivo.
            </div>
          ) : !selectedEsFinal ? (
            <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '30px', textAlign: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>⏳</span>
              Las bases alcanzadas se mostrarán cuando este juego sea <strong style={{ color: '#fca5a5' }}>Final</strong>.
            </div>
          ) : !activeGame ? (
            <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '30px', textAlign: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📥</span>
              Este juego ya es Final pero aún no está importado. Pulsa <strong style={{ color: '#00d2ff' }}>"Sincronizar MLB"</strong> para cargar sus bases alcanzadas.
            </div>
          ) : (
            <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Encabezado del partido seleccionado */}
              <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '16px', display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#f8fafc' }}>
                    {activeGame.title}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    ID Juego: {activeGame.gameId} | Fecha: {activeGame.date} | Importado: {new Date(activeGame.captured_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Contenedor de las dos columnas de lineups */}
              <div className="ba-lineups" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 480px))', justifyContent: 'center', gap: '16px' }}>
                {activeGame.boxscores.map((team, tIdx) => (
                  <div key={tIdx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#ef4444', borderBottom: '2px solid rgba(239, 68, 68, 0.2)', paddingBottom: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {team.teamName}
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {team.lineup.map((p, pIdx) => {
                        const isSub = p.isSubstitution;
                        const isRev = p.todosCeros;
                        const indentStyle = isSub ? { color: '#64748b', fontStyle: 'italic' } : { fontWeight: '500' };
                        
                        let badgeStyle = { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', opacity: 0.6 };
                        let badgeText = p.tb;
                        
                        if (isRev) {
                          badgeStyle = { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
                          badgeText = 'Revisar';
                        } else if (isSub) {
                          badgeStyle = { background: 'rgba(255, 255, 255, 0.03)', color: '#64748b', border: '1px solid rgba(255, 255, 255, 0.05)' };
                          badgeText = '0';
                        } else if (p.tb > 0) {
                          badgeStyle = { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
                          badgeText = p.tb;
                        }

                        let statsDetail = '';
                        if (isRev) {
                          statsDetail = 'Todos ceros';
                        } else if (p.stats) {
                          statsDetail = `AB:${p.stats.ab} R:${p.stats.r} H:${p.stats.h} RBI:${p.stats.rbi} K:${p.stats.so}`;
                        } else {
                          statsDetail = isSub ? 'Suplente' : `Hits: ${p.hits}`;
                        }

                        let stateText = '';
                        if (isRev) {
                          stateText = 'Revisar';
                        } else if (isSub) {
                          stateText = 'Suplente';
                        } else {
                          stateText = 'Titular';
                        }
                        
                        return (
                          <div 
                            key={pIdx} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '8px 12px', 
                              background: isSub ? 'rgba(255,255,255,0.005)' : 'rgba(255,255,255,0.015)', 
                              borderRadius: '4px',
                              border: isSub ? '1px dashed rgba(255,255,255,0.02)' : '1px solid rgba(255,255,255,0.03)',
                              ...indentStyle 
                            }}
                          >
                            <span style={{ fontSize: '0.9rem' }}>
                              {isSub ? '\u00A0\u00A0\u00A0\u00A0' : ''}{p.cleanName}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '0.75rem', opacity: isRev ? 0.8 : 0.5, color: isRev ? '#f59e0b' : 'inherit', fontWeight: isRev ? 'bold' : 'normal' }}>
                                {isRev ? '⚠️ ' : ''}{statsDetail}
                              </span>
                              <span style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: 'bold', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                minWidth: '32px', 
                                textAlign: 'center',
                                ...badgeStyle 
                              }}>
                                 {badgeText}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
          </div>
        </div>

      </div>
    </div>
  );
}
