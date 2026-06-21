import React, { useState, useEffect, useMemo } from 'react';
import { 
  defaultCasaAdjustRanges, 
  defaultVisitAdjustRanges, 
  defaultSiNoPrecios, 
  defaultPaPrecios, 
  defaultTercioPrecios, 
  defaultTercioMlRules,
  defaultMlbRunlineRules,
  defaultMargins
} from '../defaultData';
import { cleanDouble } from '../calculatorEngine';

// ==========================================
// Subcomponente: Tab SOLO
// ==========================================
const SoloSettingsTab = React.memo(({ casaRanges, visitRanges, onRowChange, onDeleteRow, onAddRow, highlightedRules, margin, onMarginChange }) => {
  const [newSolo, setNewSolo] = useState({ min: '', max: '', adjust: '', isCasa: true });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { min, max, adjust, isCasa } = newSolo;
    const row = { min: parseInt(min, 10), max: parseInt(max, 10), adjust: parseFloat(adjust) };
    if (isNaN(row.min) || isNaN(row.max) || isNaN(row.adjust)) return;
    onAddRow(row, isCasa);
    setNewSolo({ min: '', max: '', adjust: '', isCasa });
  };

  return (
    <div>
      {/* Margen de Aceptación */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>Margen de Aceptación SOLO</h4>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Diferencias menores o iguales a este rango se mostrarán en naranja/mamey (Revisar). Diferencias mayores se mostrarán en rojo.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="number" 
            step="0.05" 
            className="form-input" 
            style={{ width: '100px', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold' }} 
            value={margin} 
            onChange={e => onMarginChange(parseFloat(e.target.value) || 0)} 
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            carreras
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Casa */}
        <div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Ajuste Casa (Home Favorito)</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{casaRanges.length} rangos</span>
          </h3>
          <div className="table-responsive">
            <table className="config-table">
              <thead>
                <tr>
                  <th colSpan={3} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.08)', color: 'var(--primary)' }}>SOLO</th>
                  <th></th>
                </tr>
                <tr>
                  <th>DESDE</th>
                  <th>HASTA</th>
                  <th>=</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {casaRanges.map((row, idx) => (
                  <tr key={idx} className={highlightedRules?.casa?.has(idx) ? 'settings-row-used-rule' : ''}>
                    <td><input type="number" className="table-input" key={`cmin-${idx}-${row.min}`} defaultValue={row.min} onBlur={e => onRowChange(idx, 'min', e.target.value, true)} /></td>
                    <td><input type="number" className="table-input" key={`cmax-${idx}-${row.max}`} defaultValue={row.max} onBlur={e => onRowChange(idx, 'max', e.target.value, true)} /></td>
                    <td><input type="number" step="0.1" className="table-input" key={`cadj-${idx}-${row.adjust}`} defaultValue={row.adjust} onBlur={e => onRowChange(idx, 'adjust', e.target.value, true)} /></td>
                    <td>
                      <button className="action-icon-btn delete" onClick={() => onDeleteRow(idx, true)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visitante */}
        <div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Ajuste Visitante (Away Favorito)</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{visitRanges.length} rangos</span>
          </h3>
          <div className="table-responsive">
            <table className="config-table">
              <thead>
                <tr>
                  <th colSpan={3} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.08)', color: 'var(--primary)' }}>SOLO</th>
                  <th></th>
                </tr>
                <tr>
                  <th>DESDE</th>
                  <th>HASTA</th>
                  <th>=</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visitRanges.map((row, idx) => (
                  <tr key={idx} className={highlightedRules?.visitante?.has(idx) ? 'settings-row-used-rule' : ''}>
                    <td><input type="number" className="table-input" key={`vmin-${idx}-${row.min}`} defaultValue={row.min} onBlur={e => onRowChange(idx, 'min', e.target.value, false)} /></td>
                    <td><input type="number" className="table-input" key={`vmax-${idx}-${row.max}`} defaultValue={row.max} onBlur={e => onRowChange(idx, 'max', e.target.value, false)} /></td>
                    <td><input type="number" step="0.1" className="table-input" key={`vadj-${idx}-${row.adjust}`} defaultValue={row.adjust} onBlur={e => onRowChange(idx, 'adjust', e.target.value, false)} /></td>
                    <td>
                      <button className="action-icon-btn delete" onClick={() => onDeleteRow(idx, false)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Formulario Añadir Fila */}
      <form className="add-row-form" onSubmit={handleSubmit}>
        <div className="add-row-title">Añadir Nuevo Rango SOLO</div>
        <div className="add-row-fields">
          <div className="form-group">
            <label className="form-label">ML Mínimo</label>
            <input type="number" placeholder="Ej: -249" className="form-input" value={newSolo.min} onChange={e => setNewSolo(p => ({...p, min: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">ML Máximo</label>
            <input type="number" placeholder="Ej: -200" className="form-input" value={newSolo.max} onChange={e => setNewSolo(p => ({...p, max: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Ajuste de Línea</label>
            <input type="number" step="0.1" placeholder="Ej: 1.5" className="form-input" value={newSolo.adjust} onChange={e => setNewSolo(p => ({...p, adjust: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Lado Ajuste</label>
            <select className="form-input" value={newSolo.isCasa ? 'Casa' : 'Visitante'} onChange={e => setNewSolo(p => ({...p, isCasa: e.target.value === 'Casa'}))}>
              <option value="Casa">Casa</option>
              <option value="Visitante">Visitante</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem' }}>Agregar</button>
        </div>
      </form>
    </div>
  );
});

// ==========================================
// Subcomponente: Tab SI / NO
// ==========================================
const SiNoSettingsTab = React.memo(({ precios, onRowChange, onDeleteRow, onAddRow, margin, onMarginChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newSiNo, setNewSiNo] = useState({ total: '', tipo: 'O', linea: '', precioSi: '', precioNo: '' });

  const filteredPrecios = useMemo(() => {
    return precios.map((row, index) => ({ ...row, originalIndex: index }))
      .filter(row => {
        const query = searchQuery.toLowerCase();
        return row.total.toString().includes(query) || 
               row.tipo.toLowerCase().includes(query) || 
               row.linea.toLowerCase().includes(query);
      });
  }, [precios, searchQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const { total, tipo, linea, precioSi, precioNo } = newSiNo;
    const row = { 
      total: parseFloat(total), 
      tipo, 
      linea, 
      precioSi: parseInt(precioSi, 10), 
      precioNo: parseInt(precioNo, 10) 
    };
    if (isNaN(row.total) || !row.linea || isNaN(row.precioSi) || isNaN(row.precioNo)) return;
    onAddRow(row);
    setNewSiNo({ total: '', tipo: 'O', linea: '', precioSi: '', precioNo: '' });
  };

  return (
    <div>
      {/* Margen de Aceptación */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>Margen de Aceptación SI / NO</h4>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Diferencias menores o iguales a este rango se mostrarán en naranja/mamey (Revisar). Diferencias mayores se mostrarán en rojo.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="number" 
            step="1" 
            className="form-input" 
            style={{ width: '100px', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold' }} 
            value={margin} 
            onChange={e => onMarginChange(parseInt(e.target.value, 10) || 0)} 
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            centavos (ej: 5 = 0.5 puntos)
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="search-input-wrapper" style={{ margin: 0, maxWidth: '300px' }}>
          <svg className="search-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
          </svg>
          <input 
            type="text" 
            placeholder="Filtrar por total/línea..." 
            className="search-input" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Mostrando {filteredPrecios.length} de {precios.length} registros
        </span>
      </div>

      <div className="table-responsive">
        <table className="config-table">
          <thead>
            <tr>
              <th colSpan={5} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.08)', color: 'var(--primary)' }}>SI O NO</th>
              <th></th>
            </tr>
            <tr>
              <th>JUEGO</th>
              <th>TIPO</th>
              <th>LINEA</th>
              <th>SI</th>
              <th>NO</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredPrecios.map((row) => (
              <tr key={row.originalIndex}>
                <td><input type="number" step="0.5" className="table-input" key={`sntot-${row.originalIndex}-${row.total}`} defaultValue={row.total} onBlur={e => onRowChange(row.originalIndex, 'total', e.target.value)} style={{ width: '70px' }} /></td>
                <td>
                  <select className="table-input" value={row.tipo} onChange={e => onRowChange(row.originalIndex, 'tipo', e.target.value)} style={{ width: '70px' }}>
                    <option value="O">O</option>
                    <option value="U">U</option>
                    <option value="P">P</option>
                  </select>
                </td>
                <td><input type="text" className="table-input" key={`snlin-${row.originalIndex}-${row.linea}`} defaultValue={row.linea} onBlur={e => onRowChange(row.originalIndex, 'linea', e.target.value)} style={{ width: '80px' }} /></td>
                <td><input type="number" className="table-input" key={`snsi-${row.originalIndex}-${row.precioSi}`} defaultValue={row.precioSi} onBlur={e => onRowChange(row.originalIndex, 'precioSi', e.target.value)} /></td>
                <td><input type="number" className="table-input" key={`snno-${row.originalIndex}-${row.precioNo}`} defaultValue={row.precioNo} onBlur={e => onRowChange(row.originalIndex, 'precioNo', e.target.value)} /></td>
                <td>
                  <button className="action-icon-btn delete" onClick={() => onDeleteRow(row.originalIndex)}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="add-row-form" onSubmit={handleSubmit}>
        <div className="add-row-title">Añadir Equivalencia SI / NO</div>
        <div className="add-row-fields">
          <div className="form-group">
            <label className="form-label">Total juego</label>
            <input type="number" step="0.5" placeholder="Ej: 8.5" className="form-input" value={newSiNo.total} onChange={e => setNewSiNo(p => ({...p, total: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-input" value={newSiNo.tipo} onChange={e => setNewSiNo(p => ({...p, tipo: e.target.value}))}>
              <option value="O">Over (O)</option>
              <option value="U">Under (U)</option>
              <option value="P">Push (P)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Línea juice</label>
            <input type="text" placeholder="Ej: -115" className="form-input" value={newSiNo.linea} onChange={e => setNewSiNo(p => ({...p, linea: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Precio Sí</label>
            <input type="number" placeholder="Ej: 120" className="form-input" value={newSiNo.precioSi} onChange={e => setNewSiNo(p => ({...p, precioSi: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Precio No</label>
            <input type="number" placeholder="Ej: -120" className="form-input" value={newSiNo.precioNo} onChange={e => setNewSiNo(p => ({...p, precioNo: e.target.value}))} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem' }}>Agregar</button>
        </div>
      </form>
    </div>
  );
});

// ==========================================
// Subcomponente: Tab PA
// ==========================================
const PaSettingsTab = React.memo(({ precios, onRowChange, onDeleteRow, onAddRow, margin, onMarginChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newPa, setNewPa] = useState({ linea: '', precioSi: '', precioNo: '', side: 'Casa' });

  const casaPrecios = useMemo(() => {
    return precios.map((row, index) => ({ ...row, originalIndex: index }))
      .filter(row => row.side === 'Casa')
      .filter(row => {
        const query = searchQuery.toLowerCase();
        return row.linea.toLowerCase().includes(query);
      });
  }, [precios, searchQuery]);

  const visitPrecios = useMemo(() => {
    return precios.map((row, index) => ({ ...row, originalIndex: index }))
      .filter(row => row.side === 'Visitante')
      .filter(row => {
        const query = searchQuery.toLowerCase();
        return row.linea.toLowerCase().includes(query);
      });
  }, [precios, searchQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const { linea, precioSi, precioNo, side } = newPa;
    const row = { 
      linea, 
      precioSi: parseInt(precioSi, 10), 
      precioNo: parseInt(precioNo, 10), 
      side 
    };
    if (!row.linea || isNaN(row.precioSi) || isNaN(row.precioNo)) return;
    onAddRow(row);
    setNewPa({ linea: '', precioSi: '', precioNo: '', side: 'Casa' });
  };

  return (
    <div>
      {/* Margen de Aceptación */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>Margen de Aceptación PA</h4>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Diferencias menores o iguales a este rango se mostrarán en naranja/mamey (Revisar). Diferencias mayores se mostrarán en rojo.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="number" 
            step="1" 
            className="form-input" 
            style={{ width: '100px', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold' }} 
            value={margin} 
            onChange={e => onMarginChange(parseInt(e.target.value, 10) || 0)} 
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            centavos (ej: 5 = 0.5 puntos)
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="search-input-wrapper" style={{ margin: 0, maxWidth: '300px' }}>
          <svg className="search-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
          </svg>
          <input 
            type="text" 
            placeholder="Filtrar por línea..." 
            className="search-input" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Mostrando {casaPrecios.length + visitPrecios.length} de {precios.length} registros
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* CASA */}
        <div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>CASA</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{casaPrecios.length} líneas</span>
          </h3>
          <div className="table-responsive">
            <table className="config-table">
              <thead>
                <tr>
                  <th colSpan={3} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.08)', color: 'var(--primary)' }}>PA - CASA</th>
                  <th></th>
                </tr>
                <tr>
                  <th>LINEA</th>
                  <th>SI</th>
                  <th>NO</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {casaPrecios.map((row) => (
                  <tr key={row.originalIndex}>
                    <td><input type="text" className="table-input" key={`palin-casa-${row.originalIndex}-${row.linea}`} defaultValue={row.linea} onBlur={e => onRowChange(row.originalIndex, 'linea', e.target.value)} style={{ width: '80px' }} /></td>
                    <td><input type="number" className="table-input" key={`pasi-casa-${row.originalIndex}-${row.precioSi}`} defaultValue={row.precioSi} onBlur={e => onRowChange(row.originalIndex, 'precioSi', e.target.value)} style={{ width: '70px' }} /></td>
                    <td><input type="number" className="table-input" key={`pano-casa-${row.originalIndex}-${row.precioNo}`} defaultValue={row.precioNo} onBlur={e => onRowChange(row.originalIndex, 'precioNo', e.target.value)} style={{ width: '70px' }} /></td>
                    <td>
                      <button className="action-icon-btn delete" onClick={() => onDeleteRow(row.originalIndex)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* VISITANTE */}
        <div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>VISITANTE</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{visitPrecios.length} líneas</span>
          </h3>
          <div className="table-responsive">
            <table className="config-table">
              <thead>
                <tr>
                  <th colSpan={3} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.08)', color: 'var(--primary)' }}>PA - VISITANTE</th>
                  <th></th>
                </tr>
                <tr>
                  <th>LINEA</th>
                  <th>SI</th>
                  <th>NO</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visitPrecios.map((row) => (
                  <tr key={row.originalIndex}>
                    <td><input type="text" className="table-input" key={`palin-visit-${row.originalIndex}-${row.linea}`} defaultValue={row.linea} onBlur={e => onRowChange(row.originalIndex, 'linea', e.target.value)} style={{ width: '80px' }} /></td>
                    <td><input type="number" className="table-input" key={`pasi-visit-${row.originalIndex}-${row.precioSi}`} defaultValue={row.precioSi} onBlur={e => onRowChange(row.originalIndex, 'precioSi', e.target.value)} style={{ width: '70px' }} /></td>
                    <td><input type="number" className="table-input" key={`pano-visit-${row.originalIndex}-${row.precioNo}`} defaultValue={row.precioNo} onBlur={e => onRowChange(row.originalIndex, 'precioNo', e.target.value)} style={{ width: '70px' }} /></td>
                    <td>
                      <button className="action-icon-btn delete" onClick={() => onDeleteRow(row.originalIndex)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <form className="add-row-form" onSubmit={handleSubmit}>
        <div className="add-row-title">Añadir Fila de Precios PA</div>
        <div className="add-row-fields">
          <div className="form-group">
            <label className="form-label">Línea (Juice)</label>
            <input type="text" placeholder="Ej: -115" className="form-input" value={newPa.linea} onChange={e => setNewPa(p => ({...p, linea: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Lado (Side)</label>
            <select className="form-input" value={newPa.side} onChange={e => setNewPa(p => ({...p, side: e.target.value}))}>
              <option value="Casa">Casa</option>
              <option value="Visitante">Visitante</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Precio Sí</label>
            <input type="number" placeholder="Ej: -160" className="form-input" value={newPa.precioSi} onChange={e => setNewPa(p => ({...p, precioSi: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Precio No</label>
            <input type="number" placeholder="Ej: 120" className="form-input" value={newPa.precioNo} onChange={e => setNewPa(p => ({...p, precioNo: e.target.value}))} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem' }}>Agregar</button>
        </div>
      </form>
    </div>
  );
});

// ==========================================
// Subcomponente: Tab TERCIO
// ==========================================
const TercioSettingsTab = React.memo(({ precios, onRowChange, onDeleteRow, onAddRow, margin, onMarginChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newTercio, setNewTercio] = useState({ total: '', tipoH: 'O', lineaH: '', tercio: '', tipoT: 'O', lineaT: '' });

  const filteredPrecios = useMemo(() => {
    return precios.map((row, index) => ({ ...row, originalIndex: index }))
      .filter(row => {
        const query = searchQuery.toLowerCase();
        return row.total.toString().includes(query) || 
               row.tipoH.toLowerCase().includes(query) || 
               row.lineaH.toLowerCase().includes(query) ||
               row.tercio.toString().includes(query) || 
               row.tipoT.toLowerCase().includes(query) ||
               row.lineaT.toLowerCase().includes(query);
      });
  }, [precios, searchQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const { total, tipoH, lineaH, tercio, tipoT, lineaT } = newTercio;
    const row = { 
      total: parseFloat(total), 
      tipoH, 
      lineaH, 
      tercio: parseFloat(tercio), 
      tipoT, 
      lineaT 
    };
    if (isNaN(row.total) || !row.lineaH || isNaN(row.tercio) || !row.lineaT) return;
    onAddRow(row);
    setNewTercio({ total: '', tipoH: 'O', lineaH: '', tercio: '', tipoT: 'O', lineaT: '' });
  };

  return (
    <div>
      {/* Margen de Aceptación */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: '600' }}>Margen de Aceptación TERCIO O/U</h4>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Diferencias menores o iguales a este rango se mostrarán en naranja/mamey (Revisar). Diferencias mayores se mostrarán en rojo.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="number" 
            step="1" 
            className="form-input" 
            style={{ width: '100px', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold' }} 
            value={margin} 
            onChange={e => onMarginChange(parseInt(e.target.value, 10) || 0)} 
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            centavos (ej: 5 = 0.5 puntos)
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="search-input-wrapper" style={{ margin: 0, maxWidth: '300px' }}>
          <svg className="search-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
          </svg>
          <input 
            type="text" 
            placeholder="Buscar total H/Tercio/líneas..." 
            className="search-input" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Mostrando {filteredPrecios.length} de {precios.length} registros
        </span>
      </div>

      <div className="table-responsive">
        <table className="config-table">
          <thead>
            <tr>
              <th colSpan={3} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.08)', color: 'var(--primary)', borderRight: '1px solid var(--border-glass)' }}>1H</th>
              <th colSpan={3} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.08)', color: 'var(--primary)' }}>1T</th>
              <th></th>
            </tr>
            <tr>
              <th>Total</th>
              <th>Tipo</th>
              <th style={{ borderRight: '1px solid var(--border-glass)' }}>Línea</th>
              <th>Total</th>
              <th>Tipo</th>
              <th>Línea</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredPrecios.map((row) => (
              <tr key={row.originalIndex}>
                <td><input type="number" step="0.5" className="table-input" key={`t1h-${row.originalIndex}-${row.total}`} defaultValue={row.total} onBlur={e => onRowChange(row.originalIndex, 'total', e.target.value)} style={{ width: '70px' }} /></td>
                <td>
                  <select className="table-input" value={row.tipoH} onChange={e => onRowChange(row.originalIndex, 'tipoH', e.target.value)} style={{ width: '70px' }}>
                    <option value="O">O</option>
                    <option value="U">U</option>
                    <option value="PK">PK</option>
                  </select>
                </td>
                <td style={{ borderRight: '1px solid var(--border-glass)' }}><input type="text" className="table-input" key={`tlinh-${row.originalIndex}-${row.lineaH}`} defaultValue={row.lineaH} onBlur={e => onRowChange(row.originalIndex, 'lineaH', e.target.value)} style={{ width: '80px' }} /></td>
                <td><input type="number" step="0.5" className="table-input" key={`tterc-${row.originalIndex}-${row.tercio}`} defaultValue={row.tercio} onBlur={e => onRowChange(row.originalIndex, 'tercio', e.target.value)} style={{ width: '80px' }} /></td>
                <td>
                  <select className="table-input" value={row.tipoT} onChange={e => onRowChange(row.originalIndex, 'tipoT', e.target.value)} style={{ width: '70px' }}>
                    <option value="O">O</option>
                    <option value="U">U</option>
                    <option value="PK">PK</option>
                  </select>
                </td>
                <td><input type="text" className="table-input" key={`tlint-${row.originalIndex}-${row.lineaT}`} defaultValue={row.lineaT} onBlur={e => onRowChange(row.originalIndex, 'lineaT', e.target.value)} style={{ width: '85px' }} /></td>
                <td>
                  <button className="action-icon-btn delete" onClick={() => onDeleteRow(row.originalIndex)}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="add-row-form" onSubmit={handleSubmit}>
        <div className="add-row-title">Añadir Mapeo Tercio O/U</div>
        <div className="add-row-fields">
          <div className="form-group">
            <label className="form-label">Total 1H (H)</label>
            <input type="number" step="0.5" placeholder="Ej: 4.5" className="form-input" value={newTercio.total} onChange={e => setNewTercio(p => ({...p, total: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo H</label>
            <select className="form-input" value={newTercio.tipoH} onChange={e => setNewTercio(p => ({...p, tipoH: e.target.value}))}>
              <option value="O">Over (O)</option>
              <option value="U">Under (U)</option>
              <option value="PK">PK</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Línea H</label>
            <input type="text" placeholder="Ej: -115" className="form-input" value={newTercio.lineaH} onChange={e => setNewTercio(p => ({...p, lineaH: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Total Tercio</label>
            <input type="number" step="0.5" placeholder="Ej: 2.5" className="form-input" value={newTercio.tercio} onChange={e => setNewTercio(p => ({...p, tercio: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo T</label>
            <select className="form-input" value={newTercio.tipoT} onChange={e => setNewTercio(p => ({...p, tipoT: e.target.value}))}>
              <option value="O">Over (O)</option>
              <option value="U">Under (U)</option>
              <option value="PK">PK</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Línea T</label>
            <input type="text" placeholder="Ej: -125" className="form-input" value={newTercio.lineaT} onChange={e => setNewTercio(p => ({...p, lineaT: e.target.value}))} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem' }}>Agregar</button>
        </div>
      </form>
    </div>
  );
});

// ==========================================
// Subcomponente: Tab TERCIO ML (Reglas)
// ==========================================
const TercioMlSettingsTab = React.memo(({ rules, onChange }) => {
  return (
    <div>
      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--primary-hover)' }}>Parámetros y umbrales de Tercio ML</h3>
      
      <div className="calc-form-grid" style={{ marginBottom: '2rem' }}>
        <div className="form-group">
          <label className="form-label">Umbral 130 o inferior - Fav Tercio</label>
          <input type="number" name="rule130_favT" className="form-input" value={rules.rule130_favT} onChange={onChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Umbral 130 o inferior - Hembra Tercio</label>
          <input type="number" name="rule130_dogT" className="form-input" value={rules.rule130_dogT} onChange={onChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Umbral exacto 135 - Fav Tercio</label>
          <input type="number" name="rule135_favT" className="form-input" value={rules.rule135_favT} onChange={onChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Umbral exacto 135 - Hembra Tercio</label>
          <input type="number" name="rule135_dogT" className="form-input" value={rules.rule135_dogT} onChange={onChange} />
        </div>
      </div>

      <div className="calc-form-grid" style={{ marginBottom: '2rem' }}>
        <div className="form-group">
          <label className="form-label">Umbral 140/145 - Fav Tercio</label>
          <input type="number" name="rule145_favT" className="form-input" value={rules.rule145_favT} onChange={onChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Umbral 140/145 - Hembra Tercio</label>
          <input type="number" name="rule145_dogT" className="form-input" value={rules.rule145_dogT} onChange={onChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Umbral 150 - Fav Tercio</label>
          <input type="number" name="rule150_favT" className="form-input" value={rules.rule150_favT} onChange={onChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Umbral 150 - Hembra Tercio</label>
          <input type="number" name="rule150_dogT" className="form-input" value={rules.rule150_dogT} onChange={onChange} />
        </div>
      </div>

      <div className="calc-form-grid" style={{ marginBottom: '2rem' }}>
        <div className="form-group">
          <label className="form-label">Diferencia de Spread (Regla de 30)</label>
          <input type="number" name="dogSpread" className="form-input" value={rules.dogSpread} onChange={onChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Margen Aceptación Tercio ML (centavos)</label>
          <input type="number" name="tercioMlMargin" className="form-input" value={rules.tercioMlMargin ?? 10} onChange={onChange} />
        </div>
      </div>
      
      <div className="detail-footer-info" style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
        ℹ️ <strong>Fórmula de cálculo para ML mayor a -150:</strong> El lado favorito toma la hembra del H (en negativo) y se convierte en macho en el tercio. El otro lado se calcula restando la diferencia del Spread (ej. dogAbs - 30).
      </div>
    </div>
  );
});

// ==========================================
// Subcomponente: Tab MLB RUN LINE RULES
// ==========================================

// Helper subcomponents
const DoubleCell = ({ top, bottom, isActive }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: isActive ? 1 : 0.65 }}>
    <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.85rem' }}>{top}</div>
    <div style={{ borderTop: '1px dashed var(--border-glass)', paddingTop: '2px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{bottom}</div>
  </div>
);

const PtsCell = ({ value, isActive }) => (
  <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)', opacity: isActive ? 1 : 0.65, fontSize: '0.85rem' }}>
    {value}
  </div>
);

const DoubleEditCell = ({ topValue, bottomValue, onTopChange, onBottomChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <input type="text" className="table-input" value={topValue} onChange={e => onTopChange(e.target.value)} style={{ width: '55px', padding: '0.2rem', fontSize: '0.8rem' }} />
    <input type="text" className="table-input" value={bottomValue} onChange={e => onBottomChange(e.target.value)} style={{ width: '55px', padding: '0.2rem', fontSize: '0.8rem' }} />
  </div>
);

const SingleEditCell = ({ value, onChange }) => (
  <div style={{ display: 'flex', justifyContent: 'center' }}>
    <input type="text" className="table-input" value={value} onChange={e => onChange(e.target.value)} style={{ width: '45px', padding: '0.2rem', fontSize: '0.8rem', textAlign: 'center' }} />
  </div>
);

// Legacy RUN LINE table kept unused while the editable table below handles the UI.
const LegacyMlbRulesTable = React.memo(({ 
  rulesList, 
  title, 
  totalCount, 
  editIndex, 
  editData, 
  setEditData, 
  handleSave, 
  handleCancel, 
  handleEdit, 
  handleToggleActive, 
  onDeleteRow 
}) => {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Table Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', textTransform: 'uppercase', margin: 0 }}>
          {title}
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Mostrando {rulesList.length} de {totalCount} reglas
        </span>
      </div>

      {/* Table Visual */}
      <div className="table-responsive" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
        <table className="config-table" style={{ width: '100%', minWidth: '810px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: '80px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border-glass)' }}>ML</th>
              <th colSpan={2} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.04)', borderRight: '1px solid var(--border-glass)' }}>RL</th>
              <th colSpan={2} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.04)', borderRight: '1px solid var(--border-glass)' }}>RLALT</th>
              <th colSpan={2} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.04)', borderRight: '1px solid var(--border-glass)' }}>SRL</th>
              <th colSpan={2} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.04)', borderRight: '1px solid var(--border-glass)' }}>HRL</th>
              <th rowSpan={2} style={{ width: '90px', textAlign: 'center', verticalAlign: 'middle' }}>ESTADO</th>
              <th rowSpan={2} style={{ width: '150px', textAlign: 'center', verticalAlign: 'middle' }}>ACCIONES</th>
            </tr>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>PTS</th>
              <th style={{ width: '75px', borderRight: '1px solid var(--border-glass)' }}>PRECIO</th>
              <th style={{ width: '45px', textAlign: 'center' }}>PTS</th>
              <th style={{ width: '75px', borderRight: '1px solid var(--border-glass)' }}>PRECIO</th>
              <th style={{ width: '45px', textAlign: 'center' }}>PTS</th>
              <th style={{ width: '75px', borderRight: '1px solid var(--border-glass)' }}>PRECIO</th>
              <th style={{ width: '45px', textAlign: 'center' }}>PTS</th>
              <th style={{ width: '75px', borderRight: '1px solid var(--border-glass)' }}>PRECIO</th>
            </tr>
          </thead>
          <tbody>
            {rulesList.map((row) => {
              const isEditing = editIndex === row.originalIndex;
              const isActive = row.is_active !== false;
              
              if (isEditing) {
                return (
                  <tr key={row.originalIndex}>
                    {/* ML */}
                    <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                      <DoubleEditCell 
                        topValue={editData.ml_visitante} 
                        bottomValue={editData.ml_casa}
                        onTopChange={val => setEditData(p => ({ ...p, ml_visitante: val }))}
                        onBottomChange={val => setEditData(p => ({ ...p, ml_casa: val }))}
                      />
                    </td>
                    
                    {/* RL */}
                    <td>
                      <SingleEditCell 
                        value={editData.rl_points} 
                        onChange={val => setEditData(p => ({ ...p, rl_points: val }))}
                      />
                    </td>
                    <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                      <DoubleEditCell 
                        topValue={editData.rl_visitante} 
                        bottomValue={editData.rl_casa}
                        onTopChange={val => setEditData(p => ({ ...p, rl_visitante: val }))}
                        onBottomChange={val => setEditData(p => ({ ...p, rl_casa: val }))}
                      />
                    </td>

                    {/* RLALT */}
                    <td>
                      <SingleEditCell 
                        value={editData.rlalt_points} 
                        onChange={val => setEditData(p => ({ ...p, rlalt_points: val }))}
                      />
                    </td>
                    <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                      <DoubleEditCell 
                        topValue={editData.rlalt_visitante} 
                        bottomValue={editData.rlalt_casa}
                        onTopChange={val => setEditData(p => ({ ...p, rlalt_visitante: val }))}
                        onBottomChange={val => setEditData(p => ({ ...p, rlalt_casa: val }))}
                      />
                    </td>

                    {/* SRL */}
                    <td>
                      <SingleEditCell 
                        value={editData.srl_points} 
                        onChange={val => setEditData(p => ({ ...p, srl_points: val }))}
                      />
                    </td>
                    <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                      <DoubleEditCell 
                        topValue={editData.srl_visitante} 
                        bottomValue={editData.srl_casa}
                        onTopChange={val => setEditData(p => ({ ...p, srl_visitante: val }))}
                        onBottomChange={val => setEditData(p => ({ ...p, srl_casa: val }))}
                      />
                    </td>

                    {/* HRL */}
                    <td>
                      <SingleEditCell 
                        value={editData.hrl_points} 
                        onChange={val => setEditData(p => ({ ...p, hrl_points: val }))}
                      />
                    </td>
                    <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                      <DoubleEditCell 
                        topValue={editData.hrl_visitante} 
                        bottomValue={editData.hrl_casa}
                        onTopChange={val => setEditData(p => ({ ...p, hrl_visitante: val }))}
                        onBottomChange={val => setEditData(p => ({ ...p, hrl_casa: val }))}
                      />
                    </td>

                    {/* Status */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${isActive ? 'badge-ok' : 'badge-error'}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                        {isActive ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button type="button" className="btn btn-success" style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} onClick={() => handleSave(row.originalIndex)}>
                          💾
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} onClick={handleCancel}>
                          ❌
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={row.originalIndex} style={{ opacity: isActive ? 1 : 0.55 }}>
                  {/* ML */}
                  <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                    <DoubleCell top={row.ml_visitante} bottom={row.ml_casa} isActive={isActive} />
                  </td>
                  
                  {/* RL */}
                  <td>
                    <PtsCell value={row.rl_points} isActive={isActive} />
                  </td>
                  <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                    <DoubleCell top={row.rl_visitante} bottom={row.rl_casa} isActive={isActive} />
                  </td>

                  {/* RLALT */}
                  <td>
                    <PtsCell value={row.rlalt_points} isActive={isActive} />
                  </td>
                  <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                    <DoubleCell top={row.rlalt_visitante} bottom={row.rlalt_casa} isActive={isActive} />
                  </td>

                  {/* SRL */}
                  <td>
                    <PtsCell value={row.srl_points} isActive={isActive} />
                  </td>
                  <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                    <DoubleCell top={row.srl_visitante} bottom={row.srl_casa} isActive={isActive} />
                  </td>

                  {/* HRL */}
                  <td>
                    <PtsCell value={row.hrl_points} isActive={isActive} />
                  </td>
                  <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                    <DoubleCell top={row.hrl_visitante} bottom={row.hrl_casa} isActive={isActive} />
                  </td>

                  {/* Status */}
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${isActive ? 'badge-ok' : 'badge-error'}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                      {isActive ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }} onClick={() => handleEdit(row)}>
                        ✏️
                      </button>
                      <button type="button" className={`btn ${isActive ? 'btn-danger' : 'btn-success'}`} style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem', minWidth: '40px' }} onClick={() => handleToggleActive(row)}>
                        {isActive ? '🚫' : '✅'}
                      </button>
                      <button type="button" className="action-icon-btn delete" style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }} onClick={() => { if(window.confirm('¿Seguro de eliminar esta regla?')) onDeleteRow(row.originalIndex); }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const MlbRulesTable = React.memo(({ 
  rulesList, 
  title, 
  totalCount, 
  onRowChange, 
  onDeleteRow 
}) => {
  const updateRule = (row, field, value) => {
    if (value === row[field]) return;
    onRowChange(row.originalIndex, { ...row, [field]: value });
  };

  const RunlineDoubleEditCell = ({ row, topField, bottomField }) => (
    <div className="mlb-edit-stack">
      <input
        type="text"
        className="table-input"
        key={`${row.originalIndex}-${topField}-${row[topField]}`}
        defaultValue={row[topField] ?? ''}
        onBlur={e => updateRule(row, topField, e.target.value)}
      />
      <input
        type="text"
        className="table-input"
        key={`${row.originalIndex}-${bottomField}-${row[bottomField]}`}
        defaultValue={row[bottomField] ?? ''}
        onBlur={e => updateRule(row, bottomField, e.target.value)}
      />
    </div>
  );

  const RunlineSingleEditCell = ({ row, field }) => (
    <input
      type="text"
      className="table-input mlb-points-input"
      key={`${row.originalIndex}-${field}-${row[field]}`}
      defaultValue={row[field] ?? ''}
      onBlur={e => updateRule(row, field, e.target.value)}
    />
  );

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', textTransform: 'uppercase', margin: 0 }}>
          {title}
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Mostrando {rulesList.length} de {totalCount} reglas
        </span>
      </div>

      <div className="table-responsive mlb-rules-table-wrap">
        <table className="config-table mlb-rules-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: '80px', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border-glass)' }}>ML</th>
              <th colSpan={2} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.04)', borderRight: '1px solid var(--border-glass)' }}>RL</th>
              <th colSpan={2} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.04)', borderRight: '1px solid var(--border-glass)' }}>RLALT</th>
              <th colSpan={2} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.04)', borderRight: '1px solid var(--border-glass)' }}>SRL</th>
              <th colSpan={2} style={{ textAlign: 'center', backgroundColor: 'rgba(124, 58, 237, 0.04)', borderRight: '1px solid var(--border-glass)' }}>HRL</th>
              <th rowSpan={2} className="mlb-rules-actions-col">ACCIONES</th>
            </tr>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>PTS</th>
              <th style={{ width: '75px', borderRight: '1px solid var(--border-glass)' }}>PRECIO</th>
              <th style={{ width: '45px', textAlign: 'center' }}>PTS</th>
              <th style={{ width: '75px', borderRight: '1px solid var(--border-glass)' }}>PRECIO</th>
              <th style={{ width: '45px', textAlign: 'center' }}>PTS</th>
              <th style={{ width: '75px', borderRight: '1px solid var(--border-glass)' }}>PRECIO</th>
              <th style={{ width: '45px', textAlign: 'center' }}>PTS</th>
              <th style={{ width: '75px', borderRight: '1px solid var(--border-glass)' }}>PRECIO</th>
            </tr>
          </thead>
          <tbody>
            {rulesList.map((row) => (
              <tr key={row.originalIndex}>
                <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                  <RunlineDoubleEditCell row={row} topField="ml_visitante" bottomField="ml_casa" />
                </td>
                <td><RunlineSingleEditCell row={row} field="rl_points" /></td>
                <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                  <RunlineDoubleEditCell row={row} topField="rl_visitante" bottomField="rl_casa" />
                </td>
                <td><RunlineSingleEditCell row={row} field="rlalt_points" /></td>
                <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                  <RunlineDoubleEditCell row={row} topField="rlalt_visitante" bottomField="rlalt_casa" />
                </td>
                <td><RunlineSingleEditCell row={row} field="srl_points" /></td>
                <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                  <RunlineDoubleEditCell row={row} topField="srl_visitante" bottomField="srl_casa" />
                </td>
                <td><RunlineSingleEditCell row={row} field="hrl_points" /></td>
                <td style={{ borderRight: '1px solid var(--border-glass)' }}>
                  <RunlineDoubleEditCell row={row} topField="hrl_visitante" bottomField="hrl_casa" />
                </td>
                <td className="mlb-rules-actions-col">
                  <button
                    type="button"
                    className="action-icon-btn delete"
                    onClick={() => {
                      if (window.confirm('¿Seguro de eliminar esta regla?')) onDeleteRow(row.originalIndex);
                    }}
                    aria-label="Eliminar regla"
                    title="Eliminar regla"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const MlbRunlineSettingsTab = React.memo(({ rules, onRowChange, onDeleteRow, onAddRow, onImportRules }) => {
  const [searchMlV, setSearchMlV] = useState('');
  const [searchMlC, setSearchMlC] = useState('');
  
  // Test/Try search form
  const [testSide, setTestSide] = useState('CASA');
  const [testMlV, setTestMlV] = useState('');
  const [testMlC, setTestMlC] = useState('');
  const [testResult, setTestResult] = useState(null);
  
  // Add rule state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({
    side: 'CASA',
    ml_visitante: '',
    ml_casa: '',
    rl_points: '-1.5',
    rl_visitante: '',
    rl_casa: '',
    rlalt_points: '-1.5',
    rlalt_visitante: '',
    rlalt_casa: '',
    srl_points: '-2.5',
    srl_visitante: '',
    srl_casa: '',
    hrl_points: '-0.5',
    hrl_visitante: '',
    hrl_casa: '',
    is_active: true
  });
  
  // Edit row state
  const [editIndex, setEditIndex] = useState(null);
  const [editData, setEditData] = useState({});
  
  // JSON Importer state
  const [showImport, setShowImport] = useState(false);
  const [jsonText, setJsonText] = useState('');
  
  // Inject style override for full page width
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'mlb-runline-style-override';
    style.innerHTML = `
      .main-content {
        max-width: none !important;
        width: calc(100% - var(--sidebar-width)) !important;
      }
      .glass-panel {
        max-width: none !important;
        width: 100% !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('mlb-runline-style-override');
      if (el) el.remove();
    };
  }, []);

  const casaRules = useMemo(() => {
    return rules
      .map((r, index) => ({ ...r, originalIndex: index }))
      .filter(r => r.side === 'CASA')
      .filter(r => {
        if (searchMlV && !r.ml_visitante.includes(searchMlV)) return false;
        if (searchMlC && !r.ml_casa.includes(searchMlC)) return false;
        return true;
      });
  }, [rules, searchMlV, searchMlC]);

  const visitanteRules = useMemo(() => {
    return rules
      .map((r, index) => ({ ...r, originalIndex: index }))
      .filter(r => r.side === 'VISITANTE')
      .filter(r => {
        if (searchMlV && !r.ml_visitante.includes(searchMlV)) return false;
        if (searchMlC && !r.ml_casa.includes(searchMlC)) return false;
        return true;
      });
  }, [rules, searchMlV, searchMlC]);
  
  const handleEdit = (row) => {
    setEditIndex(row.originalIndex);
    setEditData({ ...row });
  };
  
  const handleCancel = () => {
    setEditIndex(null);
    setEditData({});
  };
  
  const handleSave = (originalIndex) => {
    if (!editData.ml_visitante || !editData.ml_casa) {
      alert("Los valores de Money Line (ML) son obligatorios.");
      return;
    }
    
    // Duplicate check
    const duplicate = rules.find((r, idx) => 
      idx !== originalIndex && 
      r.side === editData.side && 
      r.ml_visitante === editData.ml_visitante && 
      r.ml_casa === editData.ml_casa
    );
    if (duplicate) {
      alert(`Ya existe una regla para ${editData.side} con ML: Visitante ${editData.ml_visitante} / Casa ${editData.ml_casa}`);
      return;
    }
    
    onRowChange(originalIndex, editData);
    setEditIndex(null);
  };
  
  const handleToggleActive = (row) => {
    const updated = { ...row, is_active: row.is_active === undefined ? false : !row.is_active };
    onRowChange(row.originalIndex, updated);
  };
  
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newRule.ml_visitante || !newRule.ml_casa) return;
    
    // Duplicate check
    const duplicate = rules.some(r => 
      r.side === newRule.side && 
      r.ml_visitante === newRule.ml_visitante && 
      r.ml_casa === newRule.ml_casa
    );
    if (duplicate) {
      alert(`Ya existe una regla para ${newRule.side} con ML: Visitante ${newRule.ml_visitante} / Casa ${newRule.ml_casa}`);
      return;
    }
    
    onAddRow({ ...newRule, is_active: true });
    setNewRule({
      side: 'CASA',
      ml_visitante: '',
      ml_casa: '',
      rl_points: '-1.5',
      rl_visitante: '',
      rl_casa: '',
      rlalt_points: '-1.5',
      rlalt_visitante: '',
      rlalt_casa: '',
      srl_points: '-2.5',
      srl_visitante: '',
      srl_casa: '',
      hrl_points: '-0.5',
      hrl_visitante: '',
      hrl_casa: '',
      is_active: true
    });
    setShowAddForm(false);
    alert("Nueva regla agregada.");
  };
  
  const handleTestSearch = (e) => {
    e.preventDefault();
    if (!testMlV || !testMlC) return;
    const found = rules.find(r => 
      r.side === testSide && 
      r.ml_visitante === testMlV && 
      r.ml_casa === testMlC
    );
    if (found) {
      setTestResult(found);
    } else {
      setTestResult("Regla no encontrada");
    }
  };
  
  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(rules, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", "mlb_runline_rules.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };
  
  const handleImportSubmit = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        alert("El JSON debe ser un array.");
        return;
      }
      for (const item of parsed) {
        if (!item.side || !item.ml_visitante || !item.ml_casa) {
          alert("El JSON tiene un formato incorrecto. Cada objeto debe tener 'side', 'ml_visitante' y 'ml_casa'.");
          return;
        }
      }
      onImportRules(parsed);
      setJsonText('');
      setShowImport(false);
      alert("Reglas importadas con éxito (omitidos los duplicados).");
    } catch (err) {
      alert("Error al parsear JSON: " + err.message);
    }
  };

  return (
    <div>
      {/* Botones de acción superior e importación/exportación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '❌ Cerrar Formulario' : '➕ Agregar Nueva Regla'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowImport(!showImport)}>
            📥 Importar JSON
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            📤 Exportar JSON
          </button>
        </div>
      </div>

      {/* Formulario de Importación JSON */}
      {showImport && (
        <form className="glass-panel" onSubmit={handleImportSubmit} style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div className="add-row-title" style={{ marginBottom: '0.5rem' }}>Importar Reglas desde JSON</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Pega tu array JSON de reglas de Run Line MLB. Se validarán y omitirán los duplicados.
          </p>
          <textarea 
            className="form-input" 
            rows="6" 
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '1rem' }} 
            placeholder='[ { "side": "CASA", "ml_visitante": "-110", "ml_casa": "-110", ... } ]' 
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            required
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">Cargar Reglas</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Formulario Añadir Nueva Regla */}
      {showAddForm && (
        <form className="add-row-form" onSubmit={handleAddSubmit} style={{ marginBottom: '1.5rem' }}>
          <div className="add-row-title">Añadir Nueva Regla de Run Line</div>
          <div className="calc-form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Lado (Side)</label>
              <select className="form-input" value={newRule.side} onChange={e => setNewRule(p => ({ ...p, side: e.target.value }))}>
                <option value="CASA">CASA</option>
                <option value="VISITANTE">VISITANTE</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ML Visitante</label>
              <input type="text" placeholder="Ej: -110" className="form-input" value={newRule.ml_visitante} onChange={e => setNewRule(p => ({ ...p, ml_visitante: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">ML Casa</label>
              <input type="text" placeholder="Ej: -110" className="form-input" value={newRule.ml_casa} onChange={e => setNewRule(p => ({ ...p, ml_casa: e.target.value }))} required />
            </div>
          </div>
          
          <div className="add-row-title" style={{ fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Valores de Mercados (PTS y PRECIOS)</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Run Line (RL) */}
            <div style={{ border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>RL (Run Line)</div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">PTS</label>
                <input type="text" className="form-input" value={newRule.rl_points} onChange={e => setNewRule(p => ({ ...p, rl_points: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Precio Visitante</label>
                <input type="text" placeholder="Ej: -200" className="form-input" value={newRule.rl_visitante} onChange={e => setNewRule(p => ({ ...p, rl_visitante: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Precio Casa</label>
                <input type="text" placeholder="Ej: +170" className="form-input" value={newRule.rl_casa} onChange={e => setNewRule(p => ({ ...p, rl_casa: e.target.value }))} required />
              </div>
            </div>

            {/* Run Line Alternativo (RLALT) */}
            <div style={{ border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>RLALT (Alternativo)</div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">PTS</label>
                <input type="text" className="form-input" value={newRule.rlalt_points} onChange={e => setNewRule(p => ({ ...p, rlalt_points: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Precio Visitante</label>
                <input type="text" placeholder="Ej: +160" className="form-input" value={newRule.rlalt_visitante} onChange={e => setNewRule(p => ({ ...p, rlalt_visitante: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Precio Casa</label>
                <input type="text" placeholder="Ej: -200" className="form-input" value={newRule.rlalt_casa} onChange={e => setNewRule(p => ({ ...p, rlalt_casa: e.target.value }))} required />
              </div>
            </div>

            {/* Super Run Line (SRL) */}
            <div style={{ border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>SRL (Super RL)</div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">PTS</label>
                <input type="text" className="form-input" value={newRule.srl_points} onChange={e => setNewRule(p => ({ ...p, srl_points: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Precio Visitante</label>
                <input type="text" placeholder="Ej: -320" className="form-input" value={newRule.srl_visitante} onChange={e => setNewRule(p => ({ ...p, srl_visitante: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Precio Casa</label>
                <input type="text" placeholder="Ej: +200" className="form-input" value={newRule.srl_casa} onChange={e => setNewRule(p => ({ ...p, srl_casa: e.target.value }))} required />
              </div>
            </div>

            {/* H Run Line (HRL) */}
            <div style={{ border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>HRL (H Run Line)</div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">PTS</label>
                <input type="text" className="form-input" value={newRule.hrl_points} onChange={e => setNewRule(p => ({ ...p, hrl_points: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Precio Visitante</label>
                <input type="text" placeholder="Ej: -150" className="form-input" value={newRule.hrl_visitante} onChange={e => setNewRule(p => ({ ...p, hrl_visitante: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Precio Casa</label>
                <input type="text" placeholder="Ej: +130" className="form-input" value={newRule.hrl_casa} onChange={e => setNewRule(p => ({ ...p, hrl_casa: e.target.value }))} required />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Agregar Regla</button>
          </div>
        </form>
      )}

      {/* Buscador & Probador de Reglas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Probador de Reglas */}
        <form className="glass-panel" onSubmit={handleTestSearch} style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '1rem', color: 'var(--primary)' }}>🔍 Probador / Buscador de Reglas Exactas</div>
          <div className="calc-form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Lado (Side)</label>
              <select className="form-input" value={testSide} onChange={e => setTestSide(e.target.value)}>
                <option value="CASA">CASA</option>
                <option value="VISITANTE">VISITANTE</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ML Visitante</label>
              <input type="text" placeholder="Ej: -110" className="form-input" value={testMlV} onChange={e => setTestMlV(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">ML Casa</label>
              <input type="text" placeholder="Ej: -110" className="form-input" value={testMlC} onChange={e => setTestMlC(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.6rem' }}>Buscar Regla</button>
          
          {testResult && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: testResult === 'Regla no encontrada' ? 'rgba(220, 38, 38, 0.05)' : 'rgba(16, 185, 129, 0.05)', borderLeft: `4px solid ${testResult === 'Regla no encontrada' ? 'var(--color-error)' : 'var(--color-ok)'}` }}>
              {testResult === 'Regla no encontrada' ? (
                <div style={{ color: 'var(--color-error)', fontWeight: 'bold', textAlign: 'center' }}>Regla no encontrada</div>
              ) : (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.95rem', color: 'var(--text-main)' }}>Resultado para ML: {testResult.ml_visitante} / {testResult.ml_casa}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div><strong>RL:</strong> PTS: {testResult.rl_points} | V: {testResult.rl_visitante} / C: {testResult.rl_casa}</div>
                    <div><strong>RLALT:</strong> PTS: {testResult.rlalt_points} | V: {testResult.rlalt_visitante} / C: {testResult.rlalt_casa}</div>
                    <div><strong>SRL:</strong> PTS: {testResult.srl_points} | V: {testResult.srl_visitante} / C: {testResult.srl_casa}</div>
                    <div><strong>HRL:</strong> PTS: {testResult.hrl_points} | V: {testResult.hrl_visitante} / C: {testResult.hrl_casa}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Buscador de Tabla */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>🔍 Filtrar Tabla Visual</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Filtra las filas de la tabla abajo en tiempo real.</p>
          <div className="calc-form-grid">
            <div className="form-group">
              <label className="form-label">Filtrar ML Visitante</label>
              <input type="text" placeholder="Ej: -120" className="form-input" value={searchMlV} onChange={e => setSearchMlV(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Filtrar ML Casa</label>
              <input type="text" placeholder="Ej: -120" className="form-input" value={searchMlC} onChange={e => setSearchMlC(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Tablas lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 620px), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* TABLA CASA */}
        <div className="glass-panel mlb-rules-panel" style={{ padding: '1.25rem', overflow: 'hidden' }}>
          <MlbRulesTable 
            rulesList={casaRules}
            title="TABLA CASA"
            totalCount={rules.filter(r => r.side === 'CASA').length}
            onRowChange={onRowChange}
            editIndex={editIndex}
            editData={editData}
            setEditData={setEditData}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleEdit={handleEdit}
            handleToggleActive={handleToggleActive}
            onDeleteRow={onDeleteRow}
          />
        </div>

        {/* TABLA VISITANTE */}
        <div className="glass-panel mlb-rules-panel" style={{ padding: '1.25rem', overflow: 'hidden' }}>
          <MlbRulesTable 
            rulesList={visitanteRules}
            title="TABLA VISITANTE"
            totalCount={rules.filter(r => r.side === 'VISITANTE').length}
            onRowChange={onRowChange}
            editIndex={editIndex}
            editData={editData}
            setEditData={setEditData}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleEdit={handleEdit}
            handleToggleActive={handleToggleActive}
            onDeleteRow={onDeleteRow}
          />
        </div>
      </div>
    </div>
  );
});
// ==========================================
// Componente Principal: Settings
// ==========================================
export default function Settings({ config, onSaveConfig, dashboardGames = [] }) {
  const [activeTab, setActiveTab] = useState('solo');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- Estados Locales para Tablas ---
  const [casaRanges, setCasaRanges] = useState([]);
  const [visitRanges, setVisitRanges] = useState([]);
  const [siNoPrecios, setSiNoPrecios] = useState([]);
  const [paPrecios, setPaPrecios] = useState([]);
  const [tercioPrecios, setTercioPrecios] = useState([]);
  const [mlbRunlineRules, setMlbRunlineRules] = useState([]);
  const [tercioMlRules, setTercioMlRules] = useState({
    rule130_favT: -115, rule130_dogT: -115,
    rule135_favT: -120, rule135_dogT: -110,
    rule145_favT: -125, rule145_dogT: 105,
    rule150_favT: -130, rule150_dogT: 100,
    dogSpread: 30,
    tercioMlMargin: 10
  });

  const [margins, setMargins] = useState({
    solo: 0,
    sino: 5,
    pa: 5,
    tercioOu: 5,
    tercioMl: 10
  });

  // --- Inicializar estados locales con config global ---
  useEffect(() => {
    if (config) {
      setCasaRanges(config.casaAdjustRanges || []);
      setVisitRanges(config.visitAdjustRanges || []);
      setSiNoPrecios(config.preciosSiNo || []);
      setPaPrecios(config.preciosPa || []);
      setTercioPrecios(config.preciosTercio || []);
      setMlbRunlineRules(config.mlbRunlineRules || []);
      
      const r = config.tercioMlRules || defaultTercioMlRules;
      setTercioMlRules({
        rule130_favT: r.rule130?.favT ?? -115, rule130_dogT: r.rule130?.dogT ?? -115,
        rule135_favT: r.rule135?.favT ?? -120, rule135_dogT: r.rule135?.dogT ?? -110,
        rule145_favT: r.rule145?.favT ?? -125, rule145_dogT: r.rule145?.dogT ?? 105,
        rule150_favT: r.rule150?.favT ?? -130, rule150_dogT: r.rule150?.dogT ?? 100,
        dogSpread: r.dogSpread ?? 30,
        tercioMlMargin: r.tercioMlMargin ?? 10
      });

      if (config.margins) {
        setMargins(config.margins);
      } else {
        setMargins({
          solo: config.margins?.solo ?? 0,
          sino: config.margins?.sino ?? 5,
          pa: config.margins?.pa ?? 5,
          tercioOu: config.margins?.tercioOu ?? 5,
          tercioMl: r.tercioMlMargin ?? 10
        });
      }
    }
  }, [config]);

  const soloHighlightedRules = useMemo(() => {
    const highlighted = { casa: new Set(), visitante: new Set() };
    dashboardGames.forEach(game => {
      const rule = game.calc?.soloRule;
      if (!rule || typeof rule.index !== 'number') return;

      const feedVisit = cleanDouble(game.feed?.solo?.[0]);
      const feedCasa = cleanDouble(game.feed?.solo?.[1]);
      const calcVisit = cleanDouble(game.calc?.solo?.[0]);
      const calcCasa = cleanDouble(game.calc?.solo?.[1]);
      const hasSoloMismatch = (feedVisit !== null && feedVisit !== calcVisit) ||
                              (feedCasa !== null && feedCasa !== calcCasa);
      if (!hasSoloMismatch) return;

      if (rule.side === 'Casa') highlighted.casa.add(rule.index);
      if (rule.side === 'Visitante') highlighted.visitante.add(rule.index);
    });
    return highlighted;
  }, [dashboardGames]);

  // --- Manejadores CRUD SOLO ---
  const handleSoloChange = (index, field, value, isCasa) => {
    const numVal = parseFloat(value);
    const updater = isCasa ? setCasaRanges : setVisitRanges;
    updater(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: isNaN(numVal) ? value : numVal };
      return copy;
    });
  };

  const deleteSoloRow = (index, isCasa) => {
    const updater = isCasa ? setCasaRanges : setVisitRanges;
    updater(prev => prev.filter((_, i) => i !== index));
  };

  const addSoloRow = (row, isCasa) => {
    if (isCasa) {
      setCasaRanges(prev => [...prev, row].sort((a,b) => b.min - a.min));
    } else {
      setVisitRanges(prev => [...prev, row].sort((a,b) => b.min - a.min));
    }
  };

  // --- Manejadores CRUD SI/NO ---
  const handleSiNoChange = (actualIdx, field, value) => {
    setSiNoPrecios(prev => {
      const copy = [...prev];
      let val = value;
      if (field === 'total' || field === 'precioSi' || field === 'precioNo') {
        val = parseFloat(value);
        if (isNaN(val)) val = value;
      }
      copy[actualIdx] = { ...copy[actualIdx], [field]: val };
      return copy;
    });
  };

  const deleteSiNoRow = (actualIdx) => {
    setSiNoPrecios(prev => prev.filter((_, i) => i !== actualIdx));
  };

  const addSiNoRow = (row) => {
    setSiNoPrecios(prev => [...prev, row]);
  };

  // --- Manejadores CRUD PA ---
  const handlePaChange = (actualIdx, field, value) => {
    setPaPrecios(prev => {
      const copy = [...prev];
      let val = value;
      if (field === 'precioSi' || field === 'precioNo') {
        val = parseInt(value, 10);
        if (isNaN(val)) val = value;
      }
      copy[actualIdx] = { ...copy[actualIdx], [field]: val };
      return copy;
    });
  };

  const deletePaRow = (actualIdx) => {
    setPaPrecios(prev => prev.filter((_, i) => i !== actualIdx));
  };

  const addPaRow = (row) => {
    setPaPrecios(prev => [...prev, row]);
  };

  // --- Manejadores CRUD TERCIO ---
  const handleTercioChange = (actualIdx, field, value) => {
    setTercioPrecios(prev => {
      const copy = [...prev];
      let val = value;
      if (field === 'total' || field === 'tercio') {
        val = parseFloat(value);
        if (isNaN(val)) val = value;
      }
      copy[actualIdx] = { ...copy[actualIdx], [field]: val };
      return copy;
    });
  };

  const deleteTercioRow = (actualIdx) => {
    setTercioPrecios(prev => prev.filter((_, i) => i !== actualIdx));
  };

  const addTercioRow = (row) => {
    setTercioPrecios(prev => [...prev, row]);
  };

  // --- Manejadores CRUD RUN LINE ---
  const handleMlbRunlineChange = (actualIdx, updatedRule) => {
    setMlbRunlineRules(prev => {
      const copy = [...prev];
      copy[actualIdx] = updatedRule;
      return copy;
    });
  };

  const deleteMlbRunlineRow = (actualIdx) => {
    setMlbRunlineRules(prev => prev.filter((_, i) => i !== actualIdx));
  };

  const addMlbRunlineRow = (newRule) => {
    setMlbRunlineRules(prev => [...prev, newRule]);
  };

  const importMlbRunlineRules = (importedList) => {
    setMlbRunlineRules(prev => {
      const filteredImported = importedList.filter(imp => {
        const hasDuplicateInPrev = prev.some(r => r.side === imp.side && r.ml_visitante === imp.ml_visitante && r.ml_casa === imp.ml_casa);
        return !hasDuplicateInPrev;
      });
      return [...prev, ...filteredImported];
    });
  };

  // --- Reglas ML Tercio ---
  const handleTercioMlRuleChange = (e) => {
    const { name, value } = e.target;
    const num = parseInt(value, 10);
    setTercioMlRules(prev => ({ ...prev, [name]: isNaN(num) ? value : num }));
    if (name === 'tercioMlMargin') {
      setMargins(prev => ({ ...prev, tercioMl: isNaN(num) ? 10 : num }));
    }
  };

  // --- Guardar y Restablecer ---
  const handleSaveAll = () => {
    const newConfig = {
      casaAdjustRanges: casaRanges,
      visitAdjustRanges: visitRanges,
      preciosSiNo: siNoPrecios,
      preciosPa: paPrecios,
      preciosTercio: tercioPrecios,
      mlbRunlineRules: mlbRunlineRules,
      tercioMlRules: {
        rule130: { limit: 130, favT: tercioMlRules.rule130_favT, dogT: tercioMlRules.rule130_dogT },
        rule135: { limit: 135, favT: tercioMlRules.rule135_favT, dogT: tercioMlRules.rule135_dogT },
        rule145: { limit: 145, favT: tercioMlRules.rule145_favT, dogT: tercioMlRules.rule145_dogT },
        rule150: { limit: 150, favT: tercioMlRules.rule150_favT, dogT: tercioMlRules.rule150_dogT },
        dogSpread: tercioMlRules.dogSpread,
        tercioMlMargin: margins.tercioMl
      },
      margins: {
        solo: margins.solo,
        sino: margins.sino,
        pa: margins.pa,
        tercioOu: margins.tercioOu,
        tercioMl: margins.tercioMl
      }
    };
    onSaveConfig(newConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm("¿Seguro que deseas restablecer todas las tablas a los valores originales de Android?")) {
      const defaultConfig = {
        casaAdjustRanges: defaultCasaAdjustRanges,
        visitAdjustRanges: defaultVisitAdjustRanges,
        preciosSiNo: defaultSiNoPrecios,
        preciosPa: defaultPaPrecios,
        preciosTercio: defaultTercioPrecios,
        tercioMlRules: defaultTercioMlRules,
        mlbRunlineRules: defaultMlbRunlineRules,
        margins: defaultMargins
      };
      onSaveConfig(defaultConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tabla</h2>
          <p className="page-subtitle">Personaliza las tablas de SOLO, SI/NO, PA, TERCIO y RUN LINE MLB para los cálculos.</p>
        </div>
        <div>
          {saveSuccess && <span style={{ color: 'var(--color-ok)', fontWeight: 'bold', marginRight: '1rem' }}>✓ ¡Cambios guardados con éxito!</span>}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
        {/* Pestañas de Ajustes */}
        <div className="settings-tabs">
          <button className={`settings-tab-btn ${activeTab === 'solo' ? 'active' : ''}`} onClick={() => setActiveTab('solo')}>SOLO</button>
          <button className={`settings-tab-btn ${activeTab === 'sino' ? 'active' : ''}`} onClick={() => setActiveTab('sino')}>SI / NO</button>
          <button className={`settings-tab-btn ${activeTab === 'pa' ? 'active' : ''}`} onClick={() => setActiveTab('pa')}>PA</button>
          <button className={`settings-tab-btn ${activeTab === 'tercio' ? 'active' : ''}`} onClick={() => setActiveTab('tercio')}>TERCIO O/U</button>
          <button className={`settings-tab-btn ${activeTab === 'tercioml' ? 'active' : ''}`} onClick={() => setActiveTab('tercioml')}>TERCIO ML (Reglas)</button>
          <button className={`settings-tab-btn ${activeTab === 'runline' ? 'active' : ''}`} onClick={() => setActiveTab('runline')}>RUN LINE MLB</button>
        </div>

        {/* Tab 1: SOLO */}
        {activeTab === 'solo' && (
          <SoloSettingsTab 
            casaRanges={casaRanges} 
            visitRanges={visitRanges} 
            onRowChange={handleSoloChange} 
            onDeleteRow={deleteSoloRow} 
            onAddRow={addSoloRow} 
            highlightedRules={soloHighlightedRules}
            margin={margins.solo}
            onMarginChange={(val) => setMargins(prev => ({ ...prev, solo: val }))}
          />
        )}

        {/* Tab 2: SI / NO */}
        {activeTab === 'sino' && (
          <SiNoSettingsTab 
            precios={siNoPrecios} 
            onRowChange={handleSiNoChange} 
            onDeleteRow={deleteSiNoRow} 
            onAddRow={addSiNoRow} 
            margin={margins.sino}
            onMarginChange={(val) => setMargins(prev => ({ ...prev, sino: val }))}
          />
        )}

        {/* Tab 3: PA */}
        {activeTab === 'pa' && (
          <PaSettingsTab 
            precios={paPrecios} 
            onRowChange={handlePaChange} 
            onDeleteRow={deletePaRow} 
            onAddRow={addPaRow} 
            margin={margins.pa}
            onMarginChange={(val) => setMargins(prev => ({ ...prev, pa: val }))}
          />
        )}

        {/* Tab 4: TERCIO O/U */}
        {activeTab === 'tercio' && (
          <TercioSettingsTab 
            precios={tercioPrecios} 
            onRowChange={handleTercioChange} 
            onDeleteRow={deleteTercioRow} 
            onAddRow={addTercioRow} 
            margin={margins.tercioOu}
            onMarginChange={(val) => setMargins(prev => ({ ...prev, tercioOu: val }))}
          />
        )}

        {/* Tab 5: Reglas ML Tercio */}
        {activeTab === 'tercioml' && (
          <TercioMlSettingsTab 
            rules={tercioMlRules} 
            onChange={handleTercioMlRuleChange} 
          />
        )}

        {/* Tab 6: MLB RUN LINE */}
        {activeTab === 'runline' && (
          <MlbRunlineSettingsTab 
            rules={mlbRunlineRules} 
            onRowChange={handleMlbRunlineChange} 
            onDeleteRow={deleteMlbRunlineRow} 
            onAddRow={addMlbRunlineRow} 
            onImportRules={importMlbRunlineRules}
          />
        )}

        {/* Barra de Acciones Globales */}
        <div className="config-actions-bar">
          <button className="btn btn-secondary" onClick={handleResetDefaults}>
            Restablecer por Defecto
          </button>
          <button className="btn btn-primary" onClick={handleSaveAll}>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
