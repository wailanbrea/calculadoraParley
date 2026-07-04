import React, { useState, useEffect, useRef } from 'react';

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
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [loading, setLoading] = useState(false);
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
    
    function getText(el) { return el ? el.textContent.trim() : ''; }
    
    function getLines(td) {
      if (!td) return [];
      return td.innerText.split(String.fromCharCode(10)).map(function(s) { return s.trim(); }).filter(Boolean);
    }
    function parseTbLine(battingText) {
      const tbMap = {};
      if (!battingText) return tbMap;
      
      var tbIdx = battingText.indexOf('TB');
      if (tbIdx === -1) return tbMap;
      
      var tbContent = battingText.substring(tbIdx + 2).trim();
      
      var nextSectionMatch = tbContent.match(/(RBI|Runs\\s+left|SF|SH|GIDP|Team\\s+RISP|Team\\s+LOB|BASERUNNING|FIELDING|OUTS)/i);
      if (nextSectionMatch) {
        tbContent = tbContent.substring(0, nextSectionMatch.index).trim();
      }
      
      if (tbContent.endsWith('.')) {
        tbContent = tbContent.substring(0, tbContent.length - 1).trim();
      }
      
      const tokens = tbContent.split(';');
      tokens.forEach(function(token) {
        const txt = token.trim();
        if (!txt) return;
        
        const m = txt.match(/(.*?)\\s+([0-9]+)$/);
        if (m) {
          tbMap[m[1].trim()] = parseInt(m[2], 10);
        } else {
          tbMap[txt] = 1;
        }
      });
      return tbMap;
    }
    
    function limpiarNombreJugador(rawName) {
      let name = rawName.replace(/^([a-z]|[0-9]+)-/i, '').trim();
      const posRegex = /(?:1B|2B|3B|SS|LF|CF|RF|C|DH|PH|PR|P)(?:-(?:1B|2B|3B|SS|LF|CF|RF|C|DH|PH|PR|P))?$/i;
      name = name.replace(posRegex, '').trim();
      return name;
    }
    
    function obtenerBasesAlcanzadas(nombreLimpio, tbMap, hits) {
      if (hits === 0) return 0;
      const norm = function(s) {
        return s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z\\s,]/g, "").trim();
      };
      const normNombre = norm(nombreLimpio);
      for (const tbName in tbMap) {
        const normTb = norm(tbName);
        if (normNombre === normTb || normNombre.indexOf(normTb) !== -1 || normTb.indexOf(normNombre) !== -1) {
          return tbMap[tbName];
        }
      }
      return hits > 0 ? hits : 0;
    }
    
    const tables = document.querySelectorAll('table');
    const battingTables = [];
    tables.forEach(function(table) {
      const headers = Array.from(table.querySelectorAll('th')).map(function(th) { return th.textContent.trim().toUpperCase(); });
      const isBattingTable = headers.indexOf('AB') !== -1 && headers.indexOf('H') !== -1 && headers.indexOf('R') !== -1;
      if (isBattingTable) {
        battingTables.push(table);
      }
    });

    const candidates = [];
    const allElements = document.querySelectorAll('div, p, section');
    allElements.forEach(function(el) {
      const text = el.textContent.trim();
      if (text.toUpperCase().indexOf('BATTING') !== -1 && text.indexOf('TB') !== -1 && text.length < 2000) {
        candidates.push({ el: el, text: text, len: text.length });
      }
    });

    candidates.sort(function(a, b) { return a.len - b.len; });
    const uniqueNotes = [];
    candidates.forEach(function(cand) {
      var isDuplicate = false;
      for (var i = 0; i < uniqueNotes.length; i++) {
        if (uniqueNotes[i].text.indexOf(cand.text) !== -1 || cand.text.indexOf(uniqueNotes[i].text) !== -1) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        uniqueNotes.push(cand);
      }
    });

    uniqueNotes.sort(function(a, b) {
      return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    const boxscores = [];
    battingTables.forEach(function(table, tIdx) {
      const headers = Array.from(table.querySelectorAll('th')).map(function(th) { return th.textContent.trim().toUpperCase(); });
      
      let teamName = "Equipo " + (boxscores.length + 1);
      const possibleHeader = table.parentElement.querySelector('h1, h2, h3, .Boxscore__team-name');
      if (possibleHeader) {
        teamName = possibleHeader.textContent.trim();
      } else {
        const prevEl = table.previousElementSibling;
        if (prevEl && prevEl.textContent) teamName = prevEl.textContent.trim();
      }
      teamName = teamName.split(String.fromCharCode(10))[0].replace(/text/i, '').trim();
      
      let battingNotes = "";
      if (uniqueNotes[tIdx]) {
        battingNotes = uniqueNotes[tIdx].text;
      } else {
        let parent = table.parentElement;
        while (parent) {
          const notes = parent.querySelectorAll('div, p, span, section');
          for (let i = 0; i < notes.length; i++) {
            const text = notes[i].textContent.trim();
            if (text.toUpperCase().indexOf('BATTING') !== -1 && text.toUpperCase().indexOf('TB') !== -1 && text.length < 2000) {
              battingNotes = text;
              break;
            }
          }
          if (battingNotes) break;
          parent = parent.parentElement;
        }
      }
      
      const tbMap = parseTbLine(battingNotes);
      const rows = table.querySelectorAll('tbody tr');
      const lineup = [];
      
      rows.forEach(function(row) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;
        
        const nameCell = cells[0];
        const rawName = nameCell.textContent.trim();
        if (rawName.toLowerCase() === 'totals') return;
        
        const cleanName = limpiarNombreJugador(rawName);
        const isSub = nameCell.querySelector('span[style*="margin-left"]') || 
                     nameCell.classList.contains('indent') || 
                     rawName.indexOf('-') === 0 || 
                     /^[a-z0-9]-/i.test(rawName) ||
                     nameCell.innerHTML.indexOf('&nbsp;&nbsp;') !== -1;
                     
        const abIdx = headers.indexOf('AB');
        const rIdx = headers.indexOf('R');
        const hIdx = headers.indexOf('H');
        const rbiIdx = headers.indexOf('RBI');
        const soIdx = headers.indexOf('SO') !== -1 ? headers.indexOf('SO') : headers.indexOf('K');

        const ab = abIdx !== -1 && cells[abIdx] ? parseInt(cells[abIdx].textContent.trim(), 10) || 0 : 0;
        const r = rIdx !== -1 && cells[rIdx] ? parseInt(cells[rIdx].textContent.trim(), 10) || 0 : 0;
        const h = hIdx !== -1 && cells[hIdx] ? parseInt(cells[hIdx].textContent.trim(), 10) || 0 : 0;
        const rbi = rbiIdx !== -1 && cells[rbiIdx] ? parseInt(cells[rbiIdx].textContent.trim(), 10) || 0 : 0;
        const so = soIdx !== -1 && cells[soIdx] ? parseInt(cells[soIdx].textContent.trim(), 10) || 0 : 0;

        const todosCeros = (ab === 0 && r === 0 && h === 0 && rbi === 0 && so === 0);
        let tb = 0;

        if (!todosCeros) {
          if (!isSub) {
            tb = obtenerBasesAlcanzadas(cleanName, tbMap, h);
          }
        }

        lineup.push({
          rawName: rawName,
          cleanName: cleanName,
          isSubstitution: !!isSub,
          hits: h,
          tb: tb,
          todosCeros: todosCeros,
          stats: { ab: ab, r: r, h: h, rbi: rbi, so: so }
        });
      });
      
      let runs = 0;
      const tRows = table.querySelectorAll('tr');
      tRows.forEach(function(row) {
        const cells = row.querySelectorAll('td, th');
        if (cells.length > 0 && cells[0].textContent.trim().toLowerCase() === 'totals') {
          const rColIdx = headers.indexOf('R');
          if (rColIdx !== -1 && cells[rColIdx]) {
            runs = parseInt(cells[rColIdx].textContent.trim(), 10) || 0;
          }
        }
      });

      boxscores.push({
        teamName: teamName,
        runs: runs,
        lineup: lineup
      });
    });
    
    if (boxscores.length === 0) {
      alert("No se detectaron tablas de boxscore. Asegúrate de estar en la pestaña 'Box' de MLB Boxscore.");
      return;
    }
    
    const gameIdMatch = window.location.href.match(/\\/([0-9]{5,8})\\//);
    const gameId = gameIdMatch ? gameIdMatch[1] : 'game_' + Date.now();
    
    const dateMatch = window.location.href.match(/\\/([0-9]{4})\\/([0-9]{2})\\/([0-9]{2})\\//);
    const date = dateMatch ? dateMatch[1] + '/' + dateMatch[2] + '/' + dateMatch[3] : new Date().toLocaleDateString();
    
    let title = document.title.replace('Boxscore | ', '').replace(' | MLB.com', '').trim();
    if (!title || title.indexOf('http') === 0) {
      title = boxscores.map(function(t){ return t.teamName; }).join(' vs ');
    }
    
    fetch(serverUrl + '?action=save_bases', {
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
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Error de servidor (Status: ' + res.status + ')');
      return res.json();
    })
    .then(function(data) {
      alert('Sincronización exitosa: Bases alcanzadas guardadas para ' + title);
    })
    .catch(function(err) {
      alert('Fallo al guardar: ' + err.message);
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

  const activeGame = selectedGameId ? games[selectedGameId] : null;
  const gameIds = Object.keys(games);

  return (
    <div style={{ padding: '24px', background: '#060813', minHeight: '100vh', color: '#f8fafc' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: '#00d2ff', textShadow: '0 0 10px rgba(0, 210, 255, 0.2)' }}>
            ⚾ Bases Alcanzadas Resultados
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
            Visualiza los lineups y las bases alcanzadas (TB) importados desde MLB.com
          </p>
        </div>
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

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', border: message.type === 'error' ? '1px solid #ef4444' : '1px solid #10b981', color: message.type === 'error' ? '#fca5a5' : '#a7f3d0' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Barra lateral: Bookmarklet y Lista de partidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tarjeta del Bookmarklet */}
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 'bold', color: '#f8fafc' }}>
              ⚡ Importador 1-Clic MLB
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.4' }}>
              Arrastra el botón azul a tu barra de favoritos. Luego, en la pestaña "Box" de un juego finalizado en MLB.com, haz clic en él para importar.
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
          </div>

          {/* Lista de partidos importados */}
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 'bold', color: '#f8fafc' }}>
              Partidos Cargados
            </h3>
            
            {loading && gameIds.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>Cargando...</div>
            ) : gameIds.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                No hay partidos cargados. Usa el importador 1-Clic en MLB.com.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                {gameIds.map(id => {
                  const game = games[id];
                  const isSelected = id === selectedGameId;
                  let displayTitle = game.title;
                  if (game.boxscores && game.boxscores.length === 2) {
                    const team1 = simplificarNombreEquipo(game.boxscores[0].teamName);
                    const runs1 = game.boxscores[0].runs !== undefined ? game.boxscores[0].runs : 0;
                    const team2 = simplificarNombreEquipo(game.boxscores[1].teamName);
                    const runs2 = game.boxscores[1].runs !== undefined ? game.boxscores[1].runs : 0;
                    displayTitle = `${team1} ${runs1}, ${team2} ${runs2}`;
                  }
                  
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedGameId(id)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        background: isSelected ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid #00d2ff' : '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '6px',
                        color: isSelected ? '#00d2ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: '0.15s',
                        width: '100%'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayTitle}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isSelected ? 'rgba(0, 210, 255, 0.7)' : '#64748b', marginTop: '4px' }}>
                        {game.date}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Panel derecho: Visor de Lineups y Bases Alcanzadas */}
        <div style={{ flex: 1 }}>
          {!activeGame ? (
            <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>⚾</span>
              Selecciona un partido importado de la lista o utiliza el marcador en MLB.com para cargar uno nuevo.
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {activeGame.boxscores.map((team, tIdx) => (
                  <div key={tIdx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#ef4444', borderBottom: '2px solid rgba(239, 68, 68, 0.2)', paddingBottom: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {team.teamName}
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {team.lineup.map((p, pIdx) => {
                        const isSub = p.isSubstitution;
                        const isRev = p.todosCeros;
                        const indentStyle = isSub ? { paddingLeft: '20px', color: '#64748b', fontStyle: 'italic' } : { fontWeight: '500' };
                        
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
                              {isSub ? '↳ ' : ''}{p.cleanName}
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
  );
}
