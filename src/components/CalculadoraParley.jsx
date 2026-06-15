import React, { useState } from 'react';

export default function CalculadoraParley() {
  const [monto, setMonto] = useState('');
  const [logros, setLogros] = useState([
    { valor: '' },
    { valor: '' },
    { valor: '' },
    { valor: '' },
    { valor: '' }
  ]);
  const [resultados, setResultados] = useState({ montoTotal: 0, ganancia: 0 });

  const handleLogroChange = (idx, value) => {
    setLogros(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], valor: value };
      return copy;
    });
  };

  const agregarLogro = () => {
    if (logros.length < 12) {
      setLogros(prev => [...prev, { valor: '' }]);
    }
  };

  const eliminarLogro = (idx) => {
    if (logros.length > 1) {
      setLogros(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx < logros.length - 1) {
        const nextInput = document.getElementById(`logro-input-${idx + 1}`);
        if (nextInput) nextInput.focus();
      } else if (logros.length < 12) {
        agregarLogro();
        setTimeout(() => {
          const nextInput = document.getElementById(`logro-input-${idx + 1}`);
          if (nextInput) nextInput.focus();
        }, 50);
      } else {
        const montoInput = document.getElementById('monto-apuesta-input');
        if (montoInput) montoInput.focus();
      }
    }
  };

  const handleMontoKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      calcular();
    }
  };

  const calcular = () => {
    const bet = parseFloat(monto);
    if (isNaN(bet) || bet <= 0) {
      alert("Ingrese un monto de apuesta válido");
      return;
    }

    let resultado = bet;
    logros.forEach(logro => {
      const val = parseFloat(logro.valor);
      if (!isNaN(val) && val !== 0) {
        const isNegativo = val < 0;
        const absVal = Math.abs(val);
        const decimal = isNegativo 
          ? 1 + (100.0 / absVal)
          : 1 + (absVal / 100.0);
        resultado *= decimal;
      }
    });

    const total = Math.ceil(resultado);
    const ganancia = total - Math.floor(bet);
    setResultados({ montoTotal: total, ganancia });
  };

  const limpiar = () => {
    setMonto('');
    setLogros([
      { valor: '' },
      { valor: '' },
      { valor: '' },
      { valor: '' },
      { valor: '' }
    ]);
    setResultados({ montoTotal: 0, ganancia: 0 });
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('de-DE').format(num);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Calculadora Parley</h2>
          <p className="page-subtitle">Ingresa tus logros con su signo (+/-) y el sistema detectará el tipo automáticamente.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className="calc-parley-layout">
          {/* Columna Izquierda: Logros */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-main)' }}>Logros / Odds del Parley</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>{logros.length} de 12 máx.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {logros.map((logro, idx) => {
                const parsedVal = parseFloat(logro.valor);
                const isNegative = !isNaN(parsedVal) && parsedVal < 0;
                const isPositive = !isNaN(parsedVal) && parsedVal > 0;

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-glass-active)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--primary)', minWidth: '24px' }}>#{idx + 1}</span>
                    
                    <input 
                      id={`logro-input-${idx}`}
                      type="text" 
                      placeholder="Logro (ej. -120 o 150)" 
                      className="form-input"
                      value={logro.valor}
                      onChange={e => handleLogroChange(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx)}
                      style={{ flex: 1, padding: '0.55rem 0.75rem' }}
                    />

                    {/* Indicador visual de tipo de logro */}
                    <span style={{
                      minWidth: '70px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      textAlign: 'center',
                      backgroundColor: isNegative ? 'var(--color-error-bg)' : isPositive ? 'var(--color-ok-bg)' : 'rgba(0,0,0,0.03)',
                      color: isNegative ? 'var(--color-error)' : isPositive ? 'var(--color-ok)' : 'var(--text-muted)',
                      border: '1px solid',
                      borderColor: isNegative ? 'var(--color-error-border)' : isPositive ? 'var(--color-ok-border)' : 'var(--border-glass)'
                    }}>
                      {isNegative ? 'Negativo' : isPositive ? 'Positivo' : '—'}
                    </span>

                    {logros.length > 1 && (
                      <button type="button" className="action-icon-btn delete" onClick={() => eliminarLogro(idx)} title="Eliminar logro">
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={agregarLogro}
              disabled={logros.length >= 12}
              style={{ width: '100%', borderStyle: 'dashed', borderColor: 'rgba(0, 0, 0, 0.12)' }}
            >
              + Añadir Logro
            </button>
          </div>

          {/* Columna Derecha: Monto, Botones y Resultados */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.95rem', fontWeight: '600' }}>Monto de Apuesta (RD$)</label>
              <input 
                id="monto-apuesta-input"
                type="number" 
                placeholder="Ingresa el monto, Ej: 1000" 
                className="form-input"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                onKeyDown={handleMontoKeyDown}
                style={{ fontSize: '1.2rem', padding: '0.8rem 1.2rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={limpiar} style={{ flex: 1 }}>
                Limpiar
              </button>
              <button type="button" className="btn btn-primary" onClick={calcular} style={{ flex: 2 }}>
                Calcular Parley
              </button>
            </div>

            {resultados.montoTotal > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                <div className="result-card" style={{ background: 'rgba(100, 116, 139, 0.06)', borderColor: 'rgba(100, 116, 139, 0.16)', padding: '1.5rem' }}>
                  <div className="result-card-title" style={{ fontSize: '0.8rem', letterSpacing: '0.8px' }}>Ganancia Neta</div>
                  <div className="result-card-value" style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>RD$ {formatCurrency(resultados.ganancia)}</div>
                </div>
                <div className="result-card" style={{ background: 'var(--color-ok-bg)', borderColor: 'var(--color-ok-border)', padding: '1.5rem' }}>
                  <div className="result-card-title" style={{ fontSize: '0.8rem', letterSpacing: '0.8px' }}>Monto Total a Cobrar</div>
                  <div className="result-card-value" style={{ fontSize: '1.8rem', color: 'var(--color-ok)', marginTop: '0.25rem' }}>RD$ {formatCurrency(resultados.montoTotal)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
