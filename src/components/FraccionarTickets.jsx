import React, { useState } from 'react';

const resumenInicial = {
  encontrado: false,
  tickets: 0,
  montoPorTicket: 0,
  gananciaPorTicket: 0,
  gananciaPorTicketDecimal: 0,
  totalApostado: 0,
  totalGananciaReal: 0,
  diferenciaRedondeo: 0,
  faltante: 0,
  multiplicador: 0,
  lineas: [],
  ticketRows: []
};

function parseAmericanOdds(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed === 0) return null;
  return normalized.startsWith('-') ? -Math.abs(parsed) : Math.abs(parsed);
}

function decimalOddsFromAmerican(odds) {
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

function combinedProfitMultiplier(oddsList) {
  return oddsList.reduce((acc, odds) => acc * decimalOddsFromAmerican(odds), 1) - 1;
}

function formatOdds(odds) {
  return odds > 0 ? `+${odds}` : String(odds);
}

function floorMoney(value) {
  return Math.floor((Number(value) || 0) + 1e-6);
}

function ceilMoney(value) {
  return Math.ceil((Number(value) || 0) - 1e-6);
}

export default function FraccionarTickets() {
  const [gananciaDeseada, setGananciaDeseada] = useState('');
  const [lineas, setLineas] = useState(['']);
  const [limiteTicket, setLimiteTicket] = useState('200000');
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [calculado, setCalculado] = useState(false);
  const [resumen, setResumen] = useState(resumenInicial);

  const actualizarLinea = (index, value) => {
    setLineas(prev => prev.map((linea, i) => (i === index ? value : linea)));
  };

  const agregarLinea = () => {
    setLineas(prev => [...prev, '']);
  };

  const quitarLinea = (index) => {
    setLineas(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const calcular = (e) => {
    e.preventDefault();
    const targetGain = parseFloat(gananciaDeseada);
    const maxGainVal = parseFloat(limiteTicket);
    const parsedLines = lineas.map(parseAmericanOdds);

    if (isNaN(targetGain) || targetGain <= 0) {
      alert('Ingrese una ganancia deseada valida');
      return;
    }
    if (parsedLines.some(linea => linea === null)) {
      alert('Ingrese lineas validas. Ejemplos: 115, +115 o -110');
      return;
    }
    if (isNaN(maxGainVal) || maxGainVal <= 0) {
      alert('Ingrese una maxima ganancia por ticket valida');
      return;
    }

    const multiplier = combinedProfitMultiplier(parsedLines);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      alert('No se pudo calcular el multiplicador de la jugada');
      return;
    }

    const totalApostadoBase = ceilMoney(targetGain / multiplier);
    let tickets = 0;
    let totalApostado = totalApostadoBase;
    let ticketRows = [];
    let encontrado = false;

    for (let stakeOffset = 0; stakeOffset <= 1000 && !encontrado; stakeOffset++) {
      totalApostado = totalApostadoBase + stakeOffset;
      const minTickets = Math.max(1, Math.ceil((totalApostado * multiplier) / maxGainVal));

      for (tickets = minTickets; tickets <= 500; tickets++) {
        const baseStake = Math.floor(totalApostado / tickets);
        const extraTickets = totalApostado % tickets;
        ticketRows = Array.from({ length: tickets }, (_, index) => {
          const monto = baseStake + (index < extraTickets ? 1 : 0);
          const gananciaDecimal = monto * multiplier;
          return {
          n: index + 1,
          monto,
          gananciaDecimal,
          gananciaMostrada: floorMoney(gananciaDecimal),
          redondeo: gananciaDecimal - floorMoney(gananciaDecimal)
        };
      });

        const totalGananciaMostrada = ticketRows.reduce((sum, row) => sum + row.gananciaMostrada, 0);
        if (ticketRows.every(row => row.gananciaDecimal <= maxGainVal) && totalGananciaMostrada >= targetGain) {
          encontrado = true;
          break;
        }
      }
    }

    if (encontrado) {
      const totalGananciaReal = ticketRows.reduce((sum, row) => sum + row.gananciaMostrada, 0);
      const totalGananciaDecimal = ticketRows.reduce((sum, row) => sum + row.gananciaDecimal, 0);
      const faltante = Math.max(0, targetGain - totalGananciaReal);
      const montoPorTicket = ticketRows[0]?.monto || 0;
      const gananciaPorTicketDecimal = ticketRows[0]?.gananciaDecimal || 0;
      const gananciaPorTicketEntero = ticketRows[0]?.gananciaMostrada || 0;
      const diferenciaRedondeo = totalGananciaDecimal - totalGananciaReal;

      setResumen({
        encontrado: true,
        tickets,
        montoPorTicket,
        gananciaPorTicket: gananciaPorTicketEntero,
        gananciaPorTicketDecimal,
        totalApostado,
        totalGananciaReal,
        diferenciaRedondeo,
        faltante,
        multiplicador: multiplier,
        lineas: parsedLines,
        ticketRows
      });
    } else {
      setResumen({ ...resumenInicial, encontrado: false });
    }
    setCalculado(true);
    setMostrarDetalle(false);
  };

  const limpiar = () => {
    setGananciaDeseada('');
    setLineas(['']);
    setLimiteTicket('200000');
    setCalculado(false);
    setResumen(resumenInicial);
  };

  const formatCurrency = (num) => {
    return 'RD$ ' + new Intl.NumberFormat('de-DE').format(floorMoney(num));
  };

  const formatDecimal = (num) => {
    return 'RD$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(num) || 0);
  };

  const lineasNormalizadas = resumen.lineas.map(formatOdds).join(' x ');
  const hayMontosDiferentes = new Set(resumen.ticketRows.map(row => row.monto)).size > 1;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Fraccionar Tickets</h2>
          <p className="page-subtitle">Divide tu jugada en tickets de montos permitidos segun la ganancia deseada.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ maxWidth: '720px', margin: '0 auto' }}>
        <form onSubmit={calcular}>
          <div className="calc-form-grid">
            <div className="form-group">
              <label className="form-label">Ganancia Deseada (RD$)</label>
              <input
                type="number"
                placeholder="Ej: 115000"
                className="form-input"
                value={gananciaDeseada}
                onChange={e => setGananciaDeseada(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Lineas del Logro</label>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {lineas.map((linea, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={index === 0 ? 'Ej: 115, +115 o -110' : 'Otra linea'}
                      className="form-input"
                      value={linea}
                      onChange={e => actualizarLinea(index, e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => quitarLinea(index)}
                      disabled={lineas.length === 1}
                      style={{ padding: '0.45rem 0.75rem' }}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-secondary" onClick={agregarLinea} style={{ marginTop: '0.65rem', width: '100%' }}>
                Agregar Linea
              </button>
            </div>
          </div>

          <div className="form-group" style={{ margin: '1.25rem 0' }}>
            <label className="form-label">Maxima Ganancia por Ticket (RD$)</label>
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
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { valor: 60000, etiqueta: 'Sin Codigo' },
                { valor: 200000, etiqueta: 'Con Codigo' }
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
                No es posible dividir esta jugada en tickets que cumplan la maxima ganancia por ticket.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                  <div>
                    <h4 style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--primary-hover)' }}>Resultado del Analisis</h4>
                    <div style={{ color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      Lineas: {lineasNormalizadas} | Multiplicador ganancia: {resumen.multiplicador.toFixed(4)}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setMostrarDetalle(!mostrarDetalle)}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                  >
                    {mostrarDetalle ? 'Ver Resumen' : 'Ver Detalle Completo'}
                  </button>
                </div>

                {!mostrarDetalle ? (
                  <div className="calc-results-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    <div className="result-card">
                      <div className="result-card-title">Monto a Apostar</div>
                      <div className="result-card-value" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{formatCurrency(resumen.totalApostado)}</div>
                    </div>
                    <div className="result-card">
                      <div className="result-card-title">{hayMontosDiferentes ? 'Tickets con montos mixtos' : 'Apostado por Ticket'}</div>
                      <div className="result-card-value" style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>
                        {hayMontosDiferentes ? `${resumen.tickets} tickets` : formatCurrency(resumen.montoPorTicket)}
                      </div>
                    </div>
                    <div className="result-card">
                      <div className="result-card-title">Total Ganancia Calculada</div>
                      <div className="result-card-value" style={{ fontSize: '1.5rem', color: 'var(--color-ok)' }}>{formatCurrency(resumen.totalGananciaReal)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel" style={{ background: 'rgba(6,8,19,0.3)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">Tickets necesarios</span>
                        <span className="calc-cell" style={{ color: 'var(--primary-hover)', fontSize: '1.1rem' }}>{resumen.tickets}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">Total apostado</span>
                        <span className="calc-cell">{formatCurrency(resumen.totalApostado)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">Total a ganar deseado</span>
                        <span className="calc-cell">{formatCurrency(gananciaDeseada)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">Realmente se ganan</span>
                        <span className="calc-cell" style={{ color: 'var(--color-ok)' }}>{formatCurrency(resumen.totalGananciaReal)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span className="label-cell">Redondeo total</span>
                        <span className="feed-cell">{formatDecimal(resumen.diferenciaRedondeo)}</span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table className="mapping-table">
                          <thead>
                            <tr>
                              <th>Ticket</th>
                              <th>Apostar</th>
                              <th>Ganancia real</th>
                              <th>Ganancia mostrada</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.ticketRows.map(row => (
                              <tr key={row.n}>
                                <td>{row.n}</td>
                                <td>{formatCurrency(row.monto)}</td>
                                <td>{formatDecimal(row.gananciaDecimal)}</td>
                                <td>{formatCurrency(row.gananciaMostrada)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
