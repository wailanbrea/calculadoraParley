import React, { useState } from 'react';
import { 
  calcularSolo, 
  buscarSiNo, 
  buscarPa, 
  buscarTercioOu, 
  calcularTercioMl,
  normalizeJuice,
  prettyHalf
} from '../calculatorEngine';

function ManualCalculator({ config }) {
  const [manualInputs, setManualInputs] = useState({
    total: '',
    lineaSiNoPa: '',
    tipo: 'O',
    side: 'Casa',
    mlCasa: '',
    mlVisit: '',
    mlCasa1H: '',
    mlVisit1H: '',
    tercioH: '',
    tercioTipo: 'O',
    tercioLinea: ''
  });

  const handleManualInputChange = (e) => {
    const { name, value } = e.target;
    setManualInputs(prev => ({ ...prev, [name]: value }));
  };

  const clearManualCalc = () => {
    setManualInputs({
      total: '',
      lineaSiNoPa: '',
      tipo: 'O',
      side: 'Casa',
      mlCasa: '',
      mlVisit: '',
      mlCasa1H: '',
      mlVisit1H: '',
      tercioH: '',
      tercioTipo: 'O',
      tercioLinea: ''
    });
  };

  // --- Cálculos síncronos en tiempo de renderizado (0ms lag) ---
  const { 
    total, 
    lineaSiNoPa, 
    tipo, 
    side, 
    mlCasa, 
    mlVisit, 
    mlCasa1H, 
    mlVisit1H,
    tercioH,
    tercioTipo,
    tercioLinea 
  } = manualInputs;

  const t = parseFloat(total);
  const lnNorm = normalizeJuice(lineaSiNoPa);

  // 1. SOLO
  let solo = null;
  if (!isNaN(t) && (mlCasa || mlVisit)) {
    solo = calcularSolo(total, mlCasa, mlVisit, config);
  }

  // 2. SI/NO
  let sino = null;
  if (!isNaN(t) && lnNorm && tipo) {
    sino = buscarSiNo(t, tipo, lnNorm, config);
  }

  // 3. PA
  let pa = null;
  if (lnNorm && side) {
    pa = buscarPa(lnNorm, side, config);
  }

  // 4. TERCIO O/U
  let tercioOu = null;
  const hVal = parseFloat(tercioH);
  const lHNorm = normalizeJuice(tercioLinea);
  if (!isNaN(hVal) && tercioTipo && lHNorm) {
    const match = buscarTercioOu(hVal, tercioTipo, lHNorm, config);
    if (match) {
      tercioOu = `${prettyHalf(match.tercio)} ${match.tipoT} ${match.lineaT}`;
    } else {
      tercioOu = "No soportado";
    }
  }

  // 5. TERCIO ML
  let tercioMl = null;
  const v1H = normalizeJuice(mlVisit1H) || normalizeJuice(mlVisit);
  const c1H = normalizeJuice(mlCasa1H) || normalizeJuice(mlCasa);
  if (v1H && c1H) {
    const res = calcularTercioMl(v1H, c1H, config);
    if (res) {
      tercioMl = `Visit: ${res.visit} | Casa: ${res.casa} (Fav: ${res.favSide})`;
    }
  }

  const hasResults = solo || sino || pa || tercioOu || tercioMl;

  return (
    <section className="glass-panel calculator-manual-container">
      <h3 className="page-title" style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🧮</span> Calculadora Manual
      </h3>

      <div className="calc-form-grid">
        <div className="form-group">
          <label className="form-label">Total del Juego</label>
          <input 
            type="text" 
            name="total" 
            placeholder="Ej: 8.5" 
            className="form-input" 
            value={manualInputs.total}
            onChange={handleManualInputChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Línea (SiNo / PA)</label>
          <input 
            type="text" 
            name="lineaSiNoPa" 
            placeholder="Ej: -115" 
            className="form-input" 
            value={manualInputs.lineaSiNoPa}
            onChange={handleManualInputChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tipo Juego Completo</label>
          <select 
            name="tipo" 
            className="form-input" 
            value={manualInputs.tipo}
            onChange={handleManualInputChange}
          >
            <option value="O">Over (O)</option>
            <option value="U">Under (U)</option>
            <option value="P">Push (P)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Lado PA (Favorito)</label>
          <div className="radio-group">
            <label className="radio-label">
              <input 
                type="radio" 
                name="side" 
                value="Casa" 
                checked={manualInputs.side === 'Casa'}
                onChange={handleManualInputChange}
              /> Casa
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                name="side" 
                value="Visitante" 
                checked={manualInputs.side === 'Visitante'}
                onChange={handleManualInputChange}
              /> Visitante
            </label>
          </div>
        </div>
      </div>

      <div className="calc-form-grid">
        <div className="form-group">
          <label className="form-label">ML Casa JC</label>
          <input 
            type="text" 
            name="mlCasa" 
            placeholder="Ej: -140" 
            className="form-input" 
            value={manualInputs.mlCasa}
            onChange={handleManualInputChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">ML Visitante JC</label>
          <input 
            type="text" 
            name="mlVisit" 
            placeholder="Ej: +120" 
            className="form-input" 
            value={manualInputs.mlVisit}
            onChange={handleManualInputChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">ML Casa 1H (Opcional)</label>
          <input 
            type="text" 
            name="mlCasa1H" 
            placeholder="Ej: -135" 
            className="form-input" 
            value={manualInputs.mlCasa1H}
            onChange={handleManualInputChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">ML Visitante 1H (Opcional)</label>
          <input 
            type="text" 
            name="mlVisit1H" 
            placeholder="Ej: +115" 
            className="form-input" 
            value={manualInputs.mlVisit1H}
            onChange={handleManualInputChange}
          />
        </div>
      </div>

      <div className="calc-form-grid" style={{ borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '1.25rem' }}>
        <div className="form-group">
          <label className="form-label">Total Mitad (H para Tercio)</label>
          <input 
            type="text" 
            name="tercioH" 
            placeholder="Ej: 4.5" 
            className="form-input" 
            value={manualInputs.tercioH}
            onChange={handleManualInputChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tipo Mitad (H)</label>
          <select 
            name="tercioTipo" 
            className="form-input" 
            value={manualInputs.tercioTipo}
            onChange={handleManualInputChange}
          >
            <option value="O">Over (O)</option>
            <option value="U">Under (U)</option>
            <option value="PK">Push / PK (PK)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Línea Mitad (H)</label>
          <input 
            type="text" 
            name="tercioLinea" 
            placeholder="Ej: -120" 
            className="form-input" 
            value={manualInputs.tercioLinea}
            onChange={handleManualInputChange}
          />
        </div>

        <div className="form-group" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={clearManualCalc} style={{ width: '100%' }}>
            Limpiar Campos
          </button>
        </div>
      </div>

      {/* Panel de Resultados */}
      {hasResults && (
        <div className="calc-results-panel">
          {solo && (
            <div className="result-card">
              <div className="result-card-title">SOLO (Carreras Individuales)</div>
              <div className="result-card-value">
                Casa: {solo.casa} | Visit: {solo.visitante}
              </div>
            </div>
          )}

          {sino && (
            <div className="result-card">
              <div className="result-card-title">SI / NO (1ª Entrada)</div>
              <div className="result-card-value">
                Sí: {sino.precioSi > 0 ? `+${sino.precioSi}` : sino.precioSi} | 
                No: {sino.precioNo > 0 ? `+${sino.precioNo}` : sino.precioNo}
                {sino.flexible && <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--color-review)' }}>(Juice flexible)</span>}
              </div>
            </div>
          )}

          {pa && (
            <div className="result-card">
              <div className="result-card-title">PA (Pitcher Analysis)</div>
              <div className="result-card-value">
                Sí: {pa.precioSi > 0 ? `+${pa.precioSi}` : pa.precioSi} | 
                No: {pa.precioNo > 0 ? `+${pa.precioNo}` : pa.precioNo}
              </div>
            </div>
          )}

          {tercioOu && (
            <div className="result-card">
              <div className="result-card-title">TERCIO (O/U)</div>
              <div className="result-card-value">{tercioOu}</div>
            </div>
          )}

          {tercioMl && (
            <div className="result-card">
              <div className="result-card-title">TERCIO (ML)</div>
              <div className="result-card-value" style={{ fontSize: '1.1rem' }}>{tercioMl}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default React.memo(ManualCalculator);
