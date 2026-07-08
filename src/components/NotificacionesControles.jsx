import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Controles de notificaciones para la barra lateral: silenciar todo, "solo favoritos"
// e historial. Guarda las preferencias en localStorage y avisa a AlertasGlobales con el
// evento 'calcparley-prefs'. El historial lo escribe AlertasGlobales en 'historialAlertas'.

const iconoTipo = { soccer: '⚽', basket: '🏀', mlb: '⚾' };

export default function NotificacionesControles() {
  const [silenciado, setSilenciado] = useState(() => localStorage.getItem('alertasSilenciado') === '1');
  const [soloFav, setSoloFav] = useState(() => localStorage.getItem('alertasSoloFavoritos') === '1');
  const [abierto, setAbierto] = useState(false);
  const [historial, setHistorial] = useState([]);

  const guardar = (clave, valor) => {
    localStorage.setItem(clave, valor ? '1' : '0');
    window.dispatchEvent(new Event('calcparley-prefs'));
  };

  const cargarHistorial = () => {
    try { setHistorial(JSON.parse(localStorage.getItem('historialAlertas') || '[]')); }
    catch (e) { setHistorial([]); }
  };

  useEffect(() => {
    const onHist = () => { if (abierto) cargarHistorial(); };
    window.addEventListener('calcparley-historial', onHist);
    return () => window.removeEventListener('calcparley-historial', onHist);
  }, [abierto]);

  const Switch = ({ activo, onClick, children, colorOn = '#00d2ff' }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        width: '100%', padding: '8px 10px', marginBottom: '6px', cursor: 'pointer',
        borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
        background: 'rgba(0,0,0,0.03)', color: '#1e293b', fontSize: '0.82rem', textAlign: 'left', fontWeight: 600,
      }}
    >
      <span>{children}</span>
      <span style={{
        width: '34px', height: '18px', borderRadius: '10px', position: 'relative', flexShrink: 0,
        background: activo ? colorOn : '#475569', transition: 'background .15s',
      }}>
        <span style={{
          position: 'absolute', top: '2px', left: activo ? '18px' : '2px', width: '14px', height: '14px',
          borderRadius: '50%', background: '#fff', transition: 'left .15s',
        }} />
      </span>
    </button>
  );

  return (
    <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: '8px' }}>
      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '.04em', marginBottom: '8px' }}>
        NOTIFICACIONES
      </div>

      <Switch activo={!silenciado} onClick={() => setSilenciado(s => { const n = !s; guardar('alertasSilenciado', n); return n; })}>
        {silenciado ? '🔕 Silenciadas' : '🔔 Activas'}
      </Switch>

      <Switch activo={soloFav} colorOn="#f59e0b" onClick={() => setSoloFav(s => { const n = !s; guardar('alertasSoloFavoritos', n); return n; })}>
        ★ Solo favoritos
      </Switch>

      <button
        onClick={() => { cargarHistorial(); setAbierto(true); }}
        style={{
          width: '100%', padding: '8px 10px', cursor: 'pointer', borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.03)',
          color: '#1e293b', fontSize: '0.82rem', textAlign: 'left', fontWeight: 600,
        }}
      >
        🕑 Historial de alertas
      </button>

      {abierto && createPortal(
        <div
          onClick={() => setAbierto(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #0b1a2b 0%, #0b0f19 100%)', border: '1px solid rgba(0,210,255,0.35)',
              borderRadius: '14px', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <strong style={{ color: '#f8fafc', fontSize: '1rem' }}>Historial de alertas</strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { localStorage.setItem('historialAlertas', '[]'); setHistorial([]); }}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#cbd5e1', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem' }}
                >Limpiar</button>
                <button
                  onClick={() => setAbierto(false)}
                  style={{ background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}
                >×</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '12px 16px' }}>
              {historial.length === 0 ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px 0', fontSize: '0.9rem' }}>
                  Aún no hay alertas registradas.
                </div>
              ) : historial.map(h => (
                <div key={h.id} style={{ display: 'flex', gap: '10px', padding: '10px 4px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '1.2rem' }}>{iconoTipo[h.tipo] || '🔔'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: h.fav ? '#f59e0b' : '#00d2ff', marginBottom: '2px' }}>
                      {h.time}{h.fav ? ' · ★ favorito' : ''}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '0.86rem' }}>{h.titulo}</div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{h.texto}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
