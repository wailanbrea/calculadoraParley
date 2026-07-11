import React, { useState } from 'react';

export default function FraccionarTickets() {
  const [gananciaDeseada, setGananciaDeseada] = useState('');
  const [linea, setLinea] = useState('');
  const [limiteTicket, setLimiteTicket] = useState('200000');
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [calculado, setCalculado] = useState(false);

  const [resumen, setResumen] = useState({
    encontrado: false,
    tickets: 0,
    montoPorTicket: 0,
    gananciaPorTicket: 0,
    gananciaPorTicketDecimal: 0,
    totalApostado: 0,
    totalGananciaReal: 0,
    diferenciaRedondeo: 0,
    faltante: 0
  });

  const calcular = (e) => {
    e.preventDefault();
    const targetGain = parseFloat(gananciaDeseada);
    const lineVal = parseFloat(linea);
    const maxGainVal = parseFloat(limiteTicket);

    if (isNaN(targetGain) || targetGain <= 0) {
      alert("Ingrese una ganancia deseada válida");
      return;
    }
    if (isNaN(lineVal) || lineVal === 0) {
      alert("Ingrese una línea válida (diferente de 0)");
      return;
    }
    if (isNaN(maxGainVal) || maxGainVal <= 0) {
      alert("Ingrese una máxima ganancia por ticket válida");
      return;
    }

    const L = Math.abs(lineVal);
    const totalApostado = Math.ceil(targetGain * (L / 100.0));

    let tickets = 0;
    let montoPorTicket = 0;
    let gananciaPorTicket = 0;
    let encontrado = false;

    while (tickets <= 100) {
      tickets++;
      if (totalApostado % tickets === 0) {
        montoPorTicket = totalApostado / tickets;
        gananciaPorTicket = montoPorTicket / (L / 100.0);
        if (gananciaPorTicket <= maxGainVal) {
          encontrado = true;
          break;
        }
      }
    }

    if (encontrado) {
      const gananciaPorTicketDecimal = montoPorTicket / (L / 100.0);
      const gananciaPorTicketEntero = Math.floor(gananciaPorTicket);
      const diferenciaRedondeo = gananciaPorTicketDecimal - gananciaPorTicketEntero;
      const totalGananciaReal = gananciaPorTicketEntero * tickets;
      const faltante = targetGain - totalGananciaReal;

      setResumen({
        encontrado: true,
        tickets,
        montoPorTicket,
        gananciaPorTicket: gananciaPorTicketEntero,
        gananciaPorTicketDecimal,
        totalApostado: montoPorTicket * tickets,
        totalGananciaReal,
        diferenciaRedondeo,
        faltante
      });
    } else {
      setResumen({ encontrado: false });
    }
    setCalculado(true);
    setMostrarDetalle(false);
  };

  const limpiar = () => {
    setGananciaDeseada('');
    setLinea('');
    setLimiteTicket('200000');
    setCalculado(false);
    setResumen({ encontrado: false });
  };

  const formatCurrency = (num) => {
    return "RD$ " + new Intl.NumberFormat('de-DE').format(Math.floor(num));
  };

  const formatDecimal = (num) => {
    return "RD$ " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Fraccionar Tickets</h2>
          <p className="page-subtitle">Divide tu jugada en tickets de montos permitidos según la ganancia deseada.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={calcular}>
          <div className="calc-form-grid">
            <div className="form-group">
              <label className="form-label">Ganancia Deseada (RD$)</label>
              <input 
                type="number" 
                placeholder="Ej: 50000" 
                className="form-input"
                value={gananciaDeseada}
                onChange={e => setGananciaDeseada(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Línea del Logro</label>
              <input 
                type="number" 
                placeholder="Ej: -110 o 150" 
                className="form-input"
                value={linea}
                onChange={e => setLinea(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: '1.25rem 0' }}>
            <label className="form-label">Máxima Ganancia por Ticket (RD$)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="number" 
                placeholder="Ej: 200000" 
                className="form-input"
                value={limiteTicket}
                onChange={e => setLimiteTicket(e.target.value)}
                required
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              {[
                { valor: 200000, etiqueta: 'Sin Código' },
                { valor: 200000, etiqueta: 'Con Código' }
              ].map(({ valor, etiqueta }) => (
                <button
                  key={etiqueta}
                  type="button"
                  className={`filter-btn ${parseInt(limiteTicket, 10) === valor ? 'active' : ''}`}
                  onClick={() => setLimiteTicket(valor.toString())}
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: '8px' }}
                >
                  RD$ {valor.toLocaleString('de-DE')} ({etiqueta})
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={limpiar} style={{ flex: 1 }}>
              Limpiar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
              Fraccionar Jugada
            </button>
          </div>
        </form>

        {calculado && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
            {!resumen.encontrado ? (
              <div className="badge badge-error" style={{ width: '100%', padding: '1rem', display: 'block', textAlign: 'center', fontSize: '0.9rem', borderRadius: '12px' }}>
                ⚠️ No es posible dividir esta jugada en tickets exactos que cumplan la máxima ganancia por ticket.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--primary-hover)' }}>Resultado del Análisis</h4>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setMostrarDetalle(!mostrarDetalle)}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                  >
                    {mostrarDetalle ? 'Ver Resumen' : 'Ver Detalle Completo'}
                  </button>
                </div>

                {/* Vista 1: Resumen */}
                {!mostrarDetalle ? (
                  <div className="calc-results-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    <div className="result-card">
                      <div className="result-card-title">Monto a Apostar</div>
                      <div className="result-card-value" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{formatCurrency(resumen.totalApostado)}</div>
                    </div>
                    <div className="result-card">
                      <div className="result-card-title">Total (Apostar + Ganar)</div>
                      <div className="result-card-value" style={{ fontSize: '1.5rem', color: 'var(--color-ok)' }}>{formatCurrency(resumen.totalApostado + parseFloat(gananciaDeseada))}</div>
                    </div>
                  </div>
                ) : (
                  /* Vista 2: Detalle Completo */
                  <div className="glass-panel" style={{ background: 'rgba(6,8,19,0.3)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">🎟️ TICKETS NECESARIOS</span>
                        <span className="calc-cell" style={{ color: 'var(--primary-hover)', fontSize: '1.1rem' }}>{resumen.tickets}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">Apostado por Ticket</span>
                        <span className="feed-cell">{formatCurrency(resumen.montoPorTicket)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">Ganancia Real por Ticket</span>
                        <span className="feed-cell">{formatDecimal(resumen.gananciaPorTicketDecimal)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">Ganancia Mostrada por Ticket</span>
                        <span className="feed-cell">{formatCurrency(resumen.gananciaPorTicket)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">Redondeo por Ticket</span>
                        <span className="feed-cell">{formatDecimal(resumen.diferenciaRedondeo)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">💰 Total Apostado</span>
                        <span className="calc-cell">{formatCurrency(resumen.totalApostado)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">🏆 Total a Ganar (Deseado)</span>
                        <span className="calc-cell">{formatCurrency(gananciaDeseada)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
                        <span className="label-cell">⚠️ Realmente se ganan</span>
                        <span className="calc-cell" style={{ color: 'var(--color-ok)' }}>{formatCurrency(resumen.totalGananciaReal)}</span>
                      </div>
                      {resumen.faltante > 0 && (
                        <div className="detail-footer-info" style={{ borderColor: 'var(--color-review)' }}>
                          Faltan <strong>{formatCurrency(resumen.faltante)}</strong> para alcanzar la ganancia deseada original debido a diferencias de redondeo por ticket.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
