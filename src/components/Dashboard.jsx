import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  parseMlbJsonNuevo, 
  cleanDouble, 
  prettyHalf,
  parseSignedIntLoose,
  mlWithinRange,
  parseJuiceFromCombined,
  isTercioOuMatch as isTercioOuOptionMatch,
  findMatchingTercioOuOption,
  parseMl,
  buscarSiNoOpciones
} from '../calculatorEngine';
import ManualCalculator from './ManualCalculator';

// --- Helper functions for sportsbook line board rendering ---
function isTercioOuMatch(fOu, cOu) {
  if (!fOu || !cOu) return true;
  const fClean = fOu.toString().toLowerCase().replace(/½/g, ".5").replace(/\s+/g, "");
  const cClean = cOu.toString().toLowerCase().replace(/½/g, ".5").replace(/\s+/g, "");
  if (fClean === cClean) return true;
  
  const fM = fClean.match(/^(\d+(?:\.\d+)?)(o|u|pk)([+-]?\d+)$/);
  const cM = cClean.match(/^(\d+(?:\.\d+)?)(o|u|pk)([+-]?\d+)$/);
  if (!fM || !cM) return false;
  
  const fTot = parseFloat(fM[1]);
  const cTot = parseFloat(cM[1]);
  const fTipo = fM[2];
  const cTipo = cM[2];
  
  const fLineRaw = fM[3];
  const cLineRaw = cM[3];
  const fLine = parseInt(fLineRaw.startsWith("+") || fLineRaw.startsWith("-") ? fLineRaw : `-${fLineRaw}`, 10);
  const cLine = parseInt(cLineRaw.startsWith("+") || cLineRaw.startsWith("-") ? cLineRaw : `-${cLineRaw}`, 10);
  
  return Math.abs(fTot - cTot) < 0.001 && 
         fTipo === cTipo && 
         !isNaN(fLine) && !isNaN(cLine) && Math.abs(fLine - cLine) <= 5;
}

const getSoloRefLine = (game) => {
  const mlV = parseMl(game.feed.ml[0]);
  const mlC = parseMl(game.feed.ml[1]);
  if (mlV === null || mlC === null) return "";
  const favMl = mlC < mlV ? game.feed.ml[1] : game.feed.ml[0];
  return `ML ${favMl} Tot ${game.feed.total ? game.feed.total.split(" ")[0] : ""}`;
};

const getPaRefLine = (game) => {
  const mlV = parseMl(game.calc.paLineaUsada ? game.calc.paLineaUsada[0] : null);
  const mlC = parseMl(game.calc.paLineaUsada ? game.calc.paLineaUsada[1] : null);
  if (mlV === null && mlC === null) return "";
  const favMl = (mlC !== null && (mlV === null || mlC < mlV)) ? (game.calc.paLineaUsada[1]) : (game.calc.paLineaUsada[0]);
  return `ML 1H ${favMl}`;
};

function renderCell(feedVal, calcVal, isMlType = false, refLine = null) {
  if (feedVal === undefined || feedVal === null || feedVal === "") return "--";
  if (calcVal === undefined || calcVal === null || calcVal === "") return feedVal;

  let isMismatch = false;

  if (isMlType) {
    const fInt = parseInt(feedVal.toString().replace(/[+-]/g, ""), 10) || 0;
    const cInt = parseInt(calcVal.toString().replace(/[+-]/g, ""), 10) || 0;
    const fSign = feedVal.toString().startsWith("-") ? -1 : 1;
    const cSign = calcVal.toString().startsWith("-") ? -1 : 1;
    isMismatch = Math.abs((fInt * fSign) - (cInt * cSign)) > 5;
  } else {
    const fNorm = feedVal.toString().replace(/\s+/g, "").replace(/½/g, ".5");
    const cNorm = calcVal.toString().replace(/\s+/g, "").replace(/½/g, ".5");
    isMismatch = fNorm !== cNorm;
  }

  if (isMismatch) {
    return (
      <span className="cell-discrepancy">
        {feedVal}
        <span className="cell-discrepancy-calc">
          (Calc: {calcVal}{refLine ? ` con ${refLine}` : ''})
        </span>
      </span>
    );
  }
  return feedVal;
}

function renderRunlineCell(feedVal, calcVal, refLine = null) {
  if (feedVal === undefined || feedVal === null || feedVal === "" || feedVal === "--") return "--";
  if (calcVal === undefined || calcVal === null || calcVal === "" || calcVal === "--") return feedVal;

  const fJuice = parseJuiceFromCombined(feedVal);
  const cJuice = parseJuiceFromCombined(calcVal);
  
  let isMismatch = false;
  if (fJuice !== null && cJuice !== null) {
    isMismatch = Math.abs(fJuice - cJuice) > 5;
  } else {
    isMismatch = feedVal.toString().trim() !== calcVal.toString().trim();
  }

  if (isMismatch) {
    return (
      <span className="cell-discrepancy">
        {feedVal}
        <span className="cell-discrepancy-calc">
          (Calc: {calcVal}{refLine ? ` con ${refLine}` : ''})
        </span>
      </span>
    );
  }
  return feedVal;
}


function renderSinoCellGroup(game) {
  const feedSi = game.feed.sino[0];
  const feedNo = game.feed.sino[1];

  if (feedSi === undefined || feedSi === null || feedSi === "" || feedSi === "--") {
    return <>--<br />--</>;
  }

  const options = game.calc.sinoOptions || [];
  if (options.length === 0) {
    return <>{feedSi}<br />{feedNo}</>;
  }

  // Verificar si hay match con alguna de las opciones
  const parseSi = (v) => parseInt(v.toString().replace(/[+-]/g, ""), 10) || 0;
  const parseNo = (v) => parseInt(v.toString().replace(/[+-]/g, ""), 10) || 0;
  const signSi = (v) => v.toString().startsWith("-") ? -1 : 1;
  const signNo = (v) => v.toString().startsWith("-") ? -1 : 1;

  const isMatch = (fSi, fNo, optSi, optNo) => {
    const fSiVal = parseSi(fSi) * signSi(fSi);
    const fNoVal = parseNo(fNo) * signNo(fNo);
    const oSiVal = parseInt(optSi, 10);
    const oNoVal = parseInt(optNo, 10);
    return Math.abs(fSiVal - oSiVal) <= 5 && Math.abs(fNoVal - oNoVal) <= 5;
  };

  const validOption = options.find(opt => isMatch(feedSi, feedNo, opt.precioSi, opt.precioNo));
  const formatFmt = (n) => (n > 0 ? `+${n}` : `${n}`);

  if (validOption) {
    const primaryOpt = options[0];
    if (primaryOpt && (primaryOpt.precioSi !== validOption.precioSi || primaryOpt.precioNo !== validOption.precioNo)) {
      // Coincide con la otra opción (naranja)
      const otherOptionStr = `SI ${formatFmt(primaryOpt.precioSi)} / NO ${formatFmt(primaryOpt.precioNo)}`;
      return (
        <div className="cell-valid-alternative">
          {feedSi}
          <br />
          {feedNo}
          <span className="cell-valid-alternative-calc">(Otra opción: ${otherOptionStr})</span>
        </div>
      );
    }
    // Coincide con la primaria
    return <>{feedSi}<br />{feedNo}</>;
  }

  // Mismatch
  const primaryOpt = options[0];
  const calcSi = formatFmt(primaryOpt.precioSi);
  const calcNo = formatFmt(primaryOpt.precioNo);
  const ref = game.feed.total ? ` con Tot ${game.feed.total}` : "";

  return (
    <div className="cell-discrepancy">
      {feedSi}
      <br />
      {feedNo}
      <span className="cell-discrepancy-calc">(Calc: SI ${calcSi} / NO ${calcNo}${ref})</span>
    </div>
  );
}

function renderTercioOuCell(game) {
  if (!game.feed.tercioOu) return game.feed.tercioOu;

  const options = game.calc.tercioOuOptions?.length
    ? game.calc.tercioOuOptions
    : (game.calc.tercioOu ? [game.calc.tercioOu] : []);
  const validOption = game.calc.tercioOuValidOption || findMatchingTercioOuOption(game.feed.tercioOu, options);

  if (validOption) {
    if (game.calc.tercioOu && validOption !== game.calc.tercioOu) {
      const otherOption = options.find(option => option !== validOption) || game.calc.tercioOu;
      return (
        <div className="cell-valid-alternative">
          {game.feed.tercioOu}
          <span className="cell-valid-alternative-calc">(Otra opción: {otherOption})</span>
        </div>
      );
    }
    return game.feed.tercioOu;
  }

  if (game.calc.tercioOu && !isTercioOuOptionMatch(game.feed.tercioOu, game.calc.tercioOu)) {
    const ref = game.feed.total1H ? ` con Tot 1H ${game.feed.total1H}` : "";
    return (
      <div className="cell-discrepancy">
        {game.feed.tercioOu}
        <span className="cell-discrepancy-calc">(Calc: {game.calc.tercioOu}{ref})</span>
      </div>
    );
  }

  return game.feed.tercioOu;
}


export default function Dashboard({ 
  config, 
  parsedGames, 
  setParsedGames, 
  expandedGames, 
  setExpandedGames 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // --- Lógica del Importador JSON ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const processJsonFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const games = parseMlbJsonNuevo(content, config);
      setParsedGames(games);
      
      // Expandir automáticamente juegos que no estén en estado OK
      const newExpanded = {};
      games.forEach((game) => {
        const state = game.overallState;
        if (state !== 'OK') {
          newExpanded[game.id] = true;
        }
      });
      setExpandedGames(newExpanded);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processJsonFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processJsonFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  // --- Recalcular juegos del feed si cambia la configuración ---
  useEffect(() => {
    if (parsedGames.length > 0) {
      const simulatedJson = parsedGames.map(pg => {
        const itemMlb = {
          tipo: "mlb",
          hora: pg.hora,
          equipos: { visit: pg.equipos[0], casa: pg.equipos[1] },
          jc: {
            ml: { visit: pg.feed.ml[0], casa: pg.feed.ml[1] },
            rl: pg.feed.rl,
            total: pg.feed.total,
            solo: { visit: pg.feed.solo[0], casa: pg.feed.solo[1] },
            pa: { visit: pg.feed.pa[0], casa: pg.feed.pa[1] }
          },
          sino: { visit: pg.feed.sino[0], casa: pg.feed.sino[1] },
          mitad: {
            ml: { visit: pg.feed.ml1H[0], casa: pg.feed.ml1H[1] },
            total: pg.feed.total1H
          }
        };

        return [
          itemMlb,
          {
            tipo: "tercio",
            hora: pg.hora,
            equipos: { visit: pg.equipos[0], casa: pg.equipos[1] },
            ml: { visit: pg.feed.tercioMl[0], casa: pg.feed.tercioMl[1] },
            rl_total: pg.feed.tercioOu ? [pg.feed.tercioOu.replace("½", ".5").replace(" ", "")] : []
          }
        ];
      }).flat();

      const updated = parseMlbJsonNuevo(JSON.stringify(simulatedJson), config);
      setParsedGames(updated);
    }
  }, [config]);

  const toggleExpand = (id) => {
    setExpandedGames(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Filtros y Búsqueda (Memoizado para evitar recálculos lentos al escribir) ---
  const filteredGames = useMemo(() => {
    return parsedGames.filter(game => {
      const matchesSearch = game.equipos.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      return game.overallState === statusFilter;
    });
  }, [parsedGames, searchQuery, statusFilter]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Panel Principal</h2>
          <p className="page-subtitle">Analiza los partidos del feed JSON y ejecuta la calculadora manual.</p>
        </div>
      </div>

      {/* Seccion 1: Cargador JSON */}
      <section className="glass-panel" style={{ marginBottom: '2.5rem' }}>
        <div 
          className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          <span className="upload-icon">📂</span>
          <p className="upload-text">Arrastra el feed JSON de MLB aquí o haz clic para subirlo</p>
          <p className="upload-subtext">Soporta formatos exportados con juegos completos y tercio.</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            style={{ display: 'none' }}
          />
        </div>
      </section>

      {/* Seccion 2: Resultados del Feed */}
      {parsedGames.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <div className="dashboard-actions">
            <div className="search-input-wrapper">
              <svg className="search-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
              <input 
                type="text" 
                placeholder="Buscar por equipo..." 
                className="search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-group">
              {['ALL', 'OK', 'REVISAR', 'ERROR'].map(status => (
                <button
                  key={status}
                  className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'ALL' ? 'Todos' : status}
                </button>
              ))}
            </div>
          </div>

          {filteredGames.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔍</span>
              <h3 className="empty-state-title">No se encontraron partidos</h3>
              <p>Intenta ajustar tu búsqueda o los filtros de estado.</p>
            </div>
          ) : (
            <>
              {/* 1. MLB (Full Width Table) */}
              <div className="original-lines-sheet">
                <table className="section-table">
                  <thead>
                    <tr className="primera">
                      <th colSpan={3} className="liga borde" style={{ color: '#ff2a2a' }}>MLB - {filteredGames.length} enfrentamientos</th>
                      <th colSpan={8} className="borde">JUEGO COMPLETO</th>
                      <th colSpan={3} className="borde">MITAD</th>
                    </tr>
                    <tr className="segunda">
                      <th className="liga">Liga</th>
                      <th className="borde team" colSpan={2}>CODIGO EQUIPOS</th>
                      <th className="borde">ML</th>
                      <th>RL</th>
                      <th>TOTAL</th>
                      <th>SRL</th>
                      <th>RA</th>
                      <th>SOLO</th>
                      <th>HCE</th>
                      <th>PA</th>
                      <th className="borde">ML</th>
                      <th>RL</th>
                      <th>TOTAL</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGames.map((game, idx) => {
                      const isGrey = idx % 2 === 0;
                      const rowClass = isGrey ? "row-grey" : "row-blue";
                      const isVisitFav = (game.feed.ml[0] || "").startsWith("-");
                      const isCasaFav = (game.feed.ml[1] || "").startsWith("-");

                      return (
                        <tr key={game.id} className={rowClass}>
                          <td className="liga">{game.hora}</td>
                          <td>{game.feed.codigos[0]}<br />{game.feed.codigos[1]}</td>
                          <td className="team">
                            {isVisitFav ? <span className="team-name-fav">{game.equipos[0]}</span> : <span className="team-name-normal">{game.equipos[0]}</span>}
                            <br />
                            {isCasaFav ? <span className="team-name-fav">{game.equipos[1]}</span> : <span className="team-name-normal">{game.equipos[1]}</span>}
                          </td>
                          <td className="odds-cell">{game.feed.ml[0]}<br />{game.feed.ml[1]}</td>
                          <td className="alt-cell odds-cell">
                            {renderRunlineCell(game.feed.rl[0], game.calc.rl ? game.calc.rl[0] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                            <br />
                            {renderRunlineCell(game.feed.rl[1], game.calc.rl ? game.calc.rl[1] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                          </td>
                          <td className="odds-cell">{game.feed.total}</td>
                          <td className="alt-cell odds-cell">
                            {renderRunlineCell(game.feed.srl[0], game.calc.srl ? game.calc.srl[0] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                            <br />
                            {renderRunlineCell(game.feed.srl[1], game.calc.srl ? game.calc.srl[1] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                          </td>
                          <td className="odds-cell">
                            {renderRunlineCell(game.feed.ra[0], game.calc.ra ? game.calc.ra[0] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                            <br />
                            {renderRunlineCell(game.feed.ra[1], game.calc.ra ? game.calc.ra[1] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                          </td>
                          <td className="alt-cell odds-cell">
                            {renderCell(game.feed.solo[0], game.calc.solo[0], false, getSoloRefLine(game))}
                            <br />
                            {renderCell(game.feed.solo[1], game.calc.solo[1], false, getSoloRefLine(game))}
                          </td>
                          <td className="odds-cell">{game.feed.hce}</td>
                          <td className="alt-cell odds-cell">
                            {renderCell(game.feed.pa[0], game.calc.pa ? game.calc.pa[0] : null, true, getPaRefLine(game))}
                            <br />
                            {renderCell(game.feed.pa[1], game.calc.pa ? game.calc.pa[1] : null, true, getPaRefLine(game))}
                          </td>
                          <td className="odds-cell">{game.feed.ml1H[0]}<br />{game.feed.ml1H[1]}</td>
                          <td className="alt-cell odds-cell">
                            {renderRunlineCell(game.feed.rl1H[0], game.calc.hrl ? game.calc.hrl[0] : null, `ML 1H ${game.feed.ml1H[0]}/${game.feed.ml1H[1]}`)}
                            <br />
                            {renderRunlineCell(game.feed.rl1H[1], game.calc.hrl ? game.calc.hrl[1] : null, `ML 1H ${game.feed.ml1H[0]}/${game.feed.ml1H[1]}`)}
                          </td>
                          <td className="odds-cell">{game.feed.total1H}</td>
                          <td><br /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Spacer */}
              <div style={{ height: '20px' }}></div>

              {/* 2. MLB Periodos (2 Column Layout) */}
              <div className="periodos-layout-row">
                <div className="periodos-layout-col original-lines-sheet" style={{ padding: 0 }}>
                  <table className="section-table">
                    <thead>
                      <tr className="primera">
                        <th colSpan={3} className="liga borde" style={{ color: '#ff2a2a', fontSize: '1.1rem' }}>MLB PERIODOS</th>
                        <th colSpan={2} className="borde">1ER TERCIO</th>
                        <th colSpan={1} className="borde">1ER INN</th>
                      </tr>
                      <tr className="segunda">
                        <th className="liga">Hora</th>
                        <th className="borde team" colSpan={2}>CODIGO EQUIPOS</th>
                        <th className="borde">ML</th>
                        <th>RL/TOTAL</th>
                        <th className="borde">SI / NO</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGames.filter((_, idx) => idx % 2 === 0).map((game) => {
                        const isVisitFav = (game.feed.ml[0] || "").startsWith("-");
                        const isCasaFav = (game.feed.ml[1] || "").startsWith("-");

                        const mlVCell = renderCell(game.feed.tercioMl[0], game.calc.tercioMl ? game.calc.tercioMl[0] : null, true, `ML 1H ${game.feed.ml1H[0]}`);
                        const mlCCell = renderCell(game.feed.tercioMl[1], game.calc.tercioMl ? game.calc.tercioMl[1] : null, true, `ML 1H ${game.feed.ml1H[1]}`);

                        const rlTotalCell = renderTercioOuCell(game);

                        

                        return (
                          <tr key={game.id} className="row-grey">
                            <td className="liga">{game.hora}</td>
                            <td>{game.feed.codigos[0]}<br />{game.feed.codigos[1]}</td>
                            <td className="team">
                              {isVisitFav ? <span className="team-name-fav">{game.equipos[0]}</span> : <span className="team-name-normal">{game.equipos[0]}</span>}
                              <br />
                              {isCasaFav ? <span className="team-name-fav">{game.equipos[1]}</span> : <span className="team-name-normal">{game.equipos[1]}</span>}
                            </td>
                            <td className="odds-cell">{mlVCell}<br />{mlCCell}</td>
                            <td className="alt-cell odds-cell">{rlTotalCell || "--"}<br />&nbsp;</td>
                            <td className="odds-cell">{renderSinoCellGroup(game)}</td>
                            <td><br /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="periodos-layout-col original-lines-sheet" style={{ padding: 0 }}>
                  <table className="section-table">
                    <thead>
                      <tr className="primera">
                        <th colSpan={3} className="liga borde" style={{ color: '#ff2a2a', fontSize: '1.1rem' }}>MLB PERIODOS</th>
                        <th colSpan={2} className="borde">1ER TERCIO</th>
                        <th colSpan={1} className="borde">1ER INN</th>
                      </tr>
                      <tr className="segunda">
                        <th className="liga">Hora</th>
                        <th className="borde team" colSpan={2}>CODIGO EQUIPOS</th>
                        <th className="borde">ML</th>
                        <th>RL/TOTAL</th>
                        <th className="borde">SI / NO</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGames.filter((_, idx) => idx % 2 !== 0).map((game) => {
                        const isVisitFav = (game.feed.ml[0] || "").startsWith("-");
                        const isCasaFav = (game.feed.ml[1] || "").startsWith("-");

                        const mlVCell = renderCell(game.feed.tercioMl[0], game.calc.tercioMl ? game.calc.tercioMl[0] : null, true, `ML 1H ${game.feed.ml1H[0]}`);
                        const mlCCell = renderCell(game.feed.tercioMl[1], game.calc.tercioMl ? game.calc.tercioMl[1] : null, true, `ML 1H ${game.feed.ml1H[1]}`);

                        const rlTotalCell = renderTercioOuCell(game);

                        

                        return (
                          <tr key={game.id} className="row-blue">
                            <td className="liga">{game.hora}</td>
                            <td>{game.feed.codigos[0]}<br />{game.feed.codigos[1]}</td>
                            <td className="team">
                              {isVisitFav ? <span className="team-name-fav">{game.equipos[0]}</span> : <span className="team-name-normal">{game.equipos[0]}</span>}
                              <br />
                              {isCasaFav ? <span className="team-name-fav">{game.equipos[1]}</span> : <span className="team-name-normal">{game.equipos[1]}</span>}
                            </td>
                            <td className="odds-cell">{mlVCell}<br />{mlCCell}</td>
                            <td className="alt-cell odds-cell">{rlTotalCell || "--"}<br />&nbsp;</td>
                            <td className="odds-cell">{renderSinoCellGroup(game)}</td>
                            <td><br /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Seccion 3: Calculadora Manual (Componente Optimizado) */}
      <ManualCalculator config={config} />
    </div>
  );
}
