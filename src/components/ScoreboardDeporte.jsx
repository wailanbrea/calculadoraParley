import React, { useState, useEffect } from 'react';

// Marcadores genéricos para NBA/básquet y soccer usando los endpoints públicos de ESPN
// (gratuitos y consultados directo desde el navegador, sin cargar el servidor)

function fechaHoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function hora12(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

const ESTILOS_ESTADO = {
  post: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.45)', accent: '#fca5a5' },
  in: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.45)', accent: '#6ee7b7' },
  pre: { bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.1)', accent: '#94a3b8' }
};

export default function ScoreboardDeporte({ titulo, icono, ligas, ordenLocalPrimero = false }) {
  const [liga, setLiga] = useState(ligas[0].id);
  const [selectedDate, setSelectedDate] = useState(fechaHoyISO());
  const [eventos, setEventos] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  const esHoy = selectedDate === fechaHoyISO();

  const cargar = (ligaActual, fechaActual) => {
    const fechaParam = fechaActual.replace(/-/g, '');
    fetch(`https://site.api.espn.com/apis/site/v2/sports/${ligaActual}/scoreboard?dates=${fechaParam}`)
      .then(r => {
        if (!r.ok) throw new Error(`Error consultando ESPN (HTTP ${r.status})`);
        return r.json();
      })
      .then(data => {
        const evs = (data.events || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
        setEventos(evs);
        setCargado(true);
        setLastUpdate(new Date());
        setError(null);
      })
      .catch(err => {
        setError(err.message);
        setCargado(true);
      });
  };

  useEffect(() => {
    setCargado(false);
    setEventos([]);
    cargar(liga, selectedDate);
    // Solo el día actual se refresca automáticamente (cada 60s)
    if (selectedDate === fechaHoyISO()) {
      const t = setInterval(() => cargar(liga, selectedDate), 60000);
      return () => clearInterval(t);
    }
  }, [liga, selectedDate]);

  const sumarDias = (n) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + n);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${mm}-${dd}`);
  };

  const renderTarjeta = (ev) => {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) return null;
    const state = (ev.status && ev.status.type && ev.status.type.state) || 'pre';
    const est = ESTILOS_ESTADO[state] || ESTILOS_ESTADO.pre;

    let estadoTexto;
    if (state === 'pre') {
      estadoTexto = `Inicia: ${hora12(ev.date)}`;
    } else if (state === 'in') {
      estadoTexto = (ev.status.type.shortDetail || 'En juego');
    } else {
      estadoTexto = (ev.status.type.completed === false ? (ev.status.type.shortDetail || 'Final') : 'Final') + ` · ${hora12(ev.date)}`;
    }

    let competidores = (comp.competitors || []).slice();
    competidores.sort((a, b) => {
      const orden = (c) => (c.homeAway === 'home' ? (ordenLocalPrimero ? 0 : 1) : (ordenLocalPrimero ? 1 : 0));
      return orden(a) - orden(b);
    });

    const tieneLinescores = competidores.some(c => Array.isArray(c.linescores) && c.linescores.length > 0);
    const numPeriodos = tieneLinescores
      ? Math.max(...competidores.map(c => (c.linescores || []).length))
      : 0;

    const tdS = { padding: '2px 6px', textAlign: 'center', fontSize: '0.72rem', color: '#cbd5e1' };
    const thS = { ...tdS, color: '#64748b', fontWeight: 'normal' };

    return (
      <div key={ev.id} style={{ background: est.bg, border: `1px solid ${est.border}`, borderRadius: '12px', padding: '14px 16px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 10px', borderRadius: '10px', color: est.accent, background: 'rgba(0,0,0,0.25)' }}>
            {estadoTexto}
          </span>
        </div>

        {competidores.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              {c.team && c.team.logo && (
                <img src={c.team.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              )}
              <span style={{ fontWeight: 'bold', fontSize: '0.88rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.team ? c.team.displayName : '?'}
              </span>
              {c.records && c.records[0] && (
                <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>{c.records[0].summary}</span>
              )}
            </div>
            <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#00d2ff', minWidth: '30px', textAlign: 'right' }}>
              {state === 'pre' ? '-' : (c.score !== undefined ? c.score : '-')}
            </span>
          </div>
        ))}

        {tieneLinescores && (
          <div style={{ overflowX: 'auto', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ ...thS, textAlign: 'left' }}></th>
                  {Array.from({ length: numPeriodos }, (_, i) => (
                    <th key={i} style={thS}>{i + 1}</th>
                  ))}
                  <th style={{ ...thS, color: '#00d2ff', fontWeight: 'bold' }}>T</th>
                </tr>
              </thead>
              <tbody>
                {competidores.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ ...tdS, textAlign: 'left', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {c.team ? (c.team.abbreviation || c.team.shortDisplayName) : '?'}
                    </td>
                    {Array.from({ length: numPeriodos }, (_, i) => (
                      <td key={i} style={tdS}>
                        {c.linescores && c.linescores[i] !== undefined && c.linescores[i].value !== undefined
                          ? c.linescores[i].value
                          : ''}
                      </td>
                    ))}
                    <td style={{ ...tdS, fontWeight: 'bold', color: '#00d2ff' }}>{c.score !== undefined ? c.score : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', background: '#060813', minHeight: '100vh', color: '#f8fafc' }}>
      <style>{`
        @media (max-width: 760px) {
          .sd-controles { flex-direction: column !important; align-items: stretch !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Cabecera */}
        <div style={{ marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#00d2ff', textShadow: '0 0 10px rgba(0, 210, 255, 0.2)' }}>
            {icono} {titulo}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Marcadores en vivo desde ESPN (se actualiza cada 60 segundos, no consume tu servidor)
            {lastUpdate && ` · Actualizado: ${lastUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`}
          </p>
        </div>

        {/* Controles: liga y fecha */}
        <div className="sd-controles" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select
            value={liga}
            onChange={(e) => setLiga(e.target.value)}
            style={{ padding: '8px 12px', background: '#0b0f19', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem', fontWeight: 'bold' }}
          >
            {ligas.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => sumarDias(-1)}
              style={{ padding: '7px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ◀
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              style={{ padding: '7px 8px', background: '#060813', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.8rem', colorScheme: 'dark' }}
            />
            <button
              onClick={() => sumarDias(1)}
              style={{ padding: '7px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ▶
            </button>
            {!esHoy && (
              <button
                onClick={() => setSelectedDate(fechaHoyISO())}
                style={{ padding: '7px 12px', background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.4)', borderRadius: '6px', color: '#00d2ff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                📅 Hoy
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: '#64748b' }}>
            <span><span style={{ color: '#ef4444' }}>●</span> Final</span>
            <span><span style={{ color: '#10b981' }}>●</span> En juego</span>
            <span><span style={{ color: '#94a3b8' }}>●</span> Sin empezar</span>
          </div>
        </div>

        {/* Contenido */}
        {error ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '16px', color: '#fca5a5', fontSize: '0.9rem' }}>
            {error} — reintentando en la próxima actualización.
          </div>
        ) : !cargado ? (
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#64748b' }}>
            Cargando juegos...
          </div>
        ) : eventos.length === 0 ? (
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
            No hay juegos de esta liga en la fecha {selectedDate}.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
            {eventos.map(renderTarjeta)}
          </div>
        )}
      </div>
    </div>
  );
}
