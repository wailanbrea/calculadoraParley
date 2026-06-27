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

function renderCell(feedVal, calcVal, isMlType = false, refLine = null, status = null) {
  const isFeedEmpty = feedVal === undefined || feedVal === null || feedVal === "" || feedVal === "--";
  const isCalcEmpty = calcVal === undefined || calcVal === null || calcVal === "" || calcVal === "--";

  if (isFeedEmpty) {
    if (!isCalcEmpty) {
      return (
        <span className="cell-empty-calc-value" style={{ color: '#00d2ff', fontWeight: 'bold' }}>
          {calcVal} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.85 }}>(Vacío)</span>
        </span>
      );
    }
    return "--";
  }

  if (isCalcEmpty) return feedVal;

  let isMismatch = false;
  let isReview = false;

  if (status !== null) {
    isMismatch = status === 'ERROR';
    isReview = status === 'REVIEW';
  } else {
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

  if (isReview) {
    return (
      <span className="cell-valid-alternative">
        {feedVal}
        <span className="cell-valid-alternative-calc">
          (Calc: {calcVal}{refLine ? ` con ${refLine}` : ''})
        </span>
      </span>
    );
  }

  return feedVal;
}

function renderRunlineCell(feedVal, calcVal, refLine = null) {
  const isFeedEmpty = feedVal === undefined || feedVal === null || feedVal === "" || feedVal === "--";
  const isCalcEmpty = calcVal === undefined || calcVal === null || calcVal === "" || calcVal === "--";

  if (isFeedEmpty) {
    if (!isCalcEmpty) {
      return (
        <span className="cell-empty-calc-value" style={{ color: '#00d2ff', fontWeight: 'bold' }}>
          {calcVal}
        </span>
      );
    }
    return "--";
  }

  if (isCalcEmpty) return feedVal;

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

  const isFeedSiEmpty = feedSi === undefined || feedSi === null || feedSi === "" || feedSi === "--";
  const isFeedNoEmpty = feedNo === undefined || feedNo === null || feedNo === "" || feedNo === "--";

  if (isFeedSiEmpty || isFeedNoEmpty) {
    const calcSi = game.analysis?.sino?.calcSi ?? (game.calc.sinoOptions && game.calc.sinoOptions[0] ? game.calc.sinoOptions[0].precioSi : null);
    const calcNo = game.analysis?.sino?.calcNo ?? (game.calc.sinoOptions && game.calc.sinoOptions[0] ? game.calc.sinoOptions[0].precioNo : null);
    
    if (calcSi !== null && calcNo !== null) {
      const formatFmt = (n) => (n > 0 ? `+${n}` : `${n}`);
      return (
        <div style={{ color: '#00d2ff', fontWeight: 'bold' }}>
          {formatFmt(calcSi)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.85 }}>(Vacío)</span>
          <br />
          {formatFmt(calcNo)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.85 }}>(Vacío)</span>
        </div>
      );
    }
    return <>--<br />--</>;
  }

  const analysis = game.analysis?.sino;
  if (!analysis) {
    const options = game.calc.sinoOptions || [];
    if (options.length === 0) {
      return <>{feedSi}<br />{feedNo}</>;
    }
    const parseSi = (v) => parseInt(v.toString().replace(/[+-]/g, ""), 10) || 0;
    const parseNo = (v) => parseInt(v.toString().replace(/[+-]/g, ""), 10) || 0;
    const signSi = (v) => v.toString().startsWith("-") ? -1 : 1;
    const signNo = (v) => v.toString().startsWith("-") ? -1 : 1;

    const isMatch = (fSi, fNo, optSi, optNo) => {
      const fSiVal = parseSi(fSi) * signSi(fSi);
      const fNoVal = parseNo(fNo) * signNo(fNo);
      const oSiVal = parseInt(optSi, 10);
      const oNoVal = parseInt(optNo, 10);
      const matchSi = Math.abs(fSiVal - oSiVal) <= 5 || Math.abs(Math.abs(fSiVal) - Math.abs(oSiVal)) <= 5;
      const matchNo = Math.abs(fNoVal - oNoVal) <= 5 || Math.abs(Math.abs(fNoVal) - Math.abs(oNoVal)) <= 5;
      return matchSi && matchNo;
    };

    const validOption = options.find(opt => isMatch(feedSi, feedNo, opt.precioSi, opt.precioNo));
    const formatFmt = (n) => (n > 0 ? `+${n}` : `${n}`);

    if (validOption) {
      const primaryOpt = options[0];
      if (primaryOpt && (primaryOpt.precioSi !== validOption.precioSi || primaryOpt.precioNo !== validOption.precioNo)) {
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
      return <>{feedSi}<br />{feedNo}</>;
    }

    const primaryOpt = options[0];
    const calcSi = formatFmt(primaryOpt.precioSi);
    const calcNo = formatFmt(primaryOpt.precioNo);
    const sinoTotalRef = game.calc.sinoTotalUsado
      ? `Total ${prettyHalf(game.calc.sinoTotalUsado)} ${game.calc.sinoTipoUsado || ""}`.trim()
      : "";
    const sinoMlRef = game.calc.sinoLineaUsada ? `Línea ${game.calc.sinoLineaUsada}` : "";
    const refParts = [sinoTotalRef, sinoMlRef].filter(Boolean).join(" / ");
    const ref = refParts ? ` con ${refParts}` : "";

    return (
      <div className="cell-discrepancy">
        {feedSi}
        <br />
        {feedNo}
        <span className="cell-discrepancy-calc">(Calc: SI ${calcSi} / NO ${calcNo}${ref})</span>
      </div>
    );
  }

  const formatFmt = (n) => (n > 0 ? `+${n}` : `${n}`);

  if (analysis.status === 'OK') {
    return <>{feedSi}<br />{feedNo}</>;
  }

  const calcSi = analysis.calcSi !== null ? formatFmt(analysis.calcSi) : "--";
  const calcNo = analysis.calcNo !== null ? formatFmt(analysis.calcNo) : "--";

  const sinoTotalRef = game.calc.sinoTotalUsado
    ? `Total ${prettyHalf(game.calc.sinoTotalUsado)} ${game.calc.sinoTipoUsado || ""}`.trim()
    : "";
  const sinoMlRef = game.calc.sinoLineaUsada ? `Línea ${game.calc.sinoLineaUsada}` : "";
  const refParts = [sinoTotalRef, sinoMlRef].filter(Boolean).join(" / ");
  const ref = refParts ? ` con ${refParts}` : "";

  if (analysis.status === 'REVIEW') {
    return (
      <div className="cell-valid-alternative">
        {feedSi}
        <br />
        {feedNo}
        {analysis.msg ? (
          <span className="cell-valid-alternative-calc">({analysis.msg})</span>
        ) : (
          <span className="cell-valid-alternative-calc">(Calc: SI {calcSi} / NO {calcNo}{ref})</span>
        )}
      </div>
    );
  }

  return (
    <div className="cell-discrepancy">
      {feedSi}
      <br />
      {feedNo}
      <span className="cell-discrepancy-calc">(Calc: SI {calcSi} / NO {calcNo}{ref})</span>
    </div>
  );
}

function renderTercioOuCell(game) {
  const isFeedEmpty = !game.feed.tercioOu || game.feed.tercioOu === "--";
  const isCalcEmpty = !game.calc.tercioOu || game.calc.tercioOu === "--";

  if (isFeedEmpty) {
    if (!isCalcEmpty) {
      return (
        <span className="cell-empty-calc-value" style={{ color: '#00d2ff', fontWeight: 'bold' }}>
          {game.calc.tercioOu} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.85 }}>(Vacío)</span>
        </span>
      );
    }
    return "--";
  }

  const analysis = game.analysis?.tercioOu;
  if (!analysis) {
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

  const ref = game.feed.total1H ? ` con Tot 1H ${game.feed.total1H}` : "";

  if (analysis.status === 'OK') {
    return game.feed.tercioOu;
  }

  if (analysis.status === 'REVIEW') {
    const options = game.calc.tercioOuOptions?.length
      ? game.calc.tercioOuOptions
      : (game.calc.tercioOu ? [game.calc.tercioOu] : []);
    const validOption = findMatchingTercioOuOption(game.feed.tercioOu, options);
    if (validOption && game.calc.tercioOu && validOption !== game.calc.tercioOu) {
      const otherOption = options.find(option => option !== validOption) || game.calc.tercioOu;
      return (
        <div className="cell-valid-alternative">
          {game.feed.tercioOu}
          <span className="cell-valid-alternative-calc">(Otra opción: {otherOption})</span>
        </div>
      );
    }
    return (
      <div className="cell-valid-alternative">
        {game.feed.tercioOu}
        <span className="cell-valid-alternative-calc">(Calc: {game.calc.tercioOu || '--'}{ref})</span>
      </div>
    );
  }

  return (
    <div className="cell-discrepancy">
      {game.feed.tercioOu}
      <span className="cell-discrepancy-calc">(Calc: {game.calc.tercioOu || '--'}{ref})</span>
    </div>
  );
}

// --- Helpers for Juancito Sport HTML parsing ---
function parseOuFromText(text) {
  if (!text) return null;
  const cleaned = text.replace(/½/g, '.5').replace(/,/g, '.').replace(/\s+/g, '');
  const m = cleaned.match(/^(\d+(?:\.\d+)?)([ouOU])([+-]?\d+)$/);
  if (!m) return null;
  return {
    total: parseFloat(m[1]),
    tipo: m[2].toUpperCase(),
    linea: m[3].startsWith('+') || m[3].startsWith('-') ? m[3] : `-${m[3]}`
  };
}

function parseJuancitoSportHtml(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const tables = doc.querySelectorAll('table');
  const jc = [];
  const tercio = [];

  const getText = (el) => el ? el.textContent.trim() : '';
  
  const getLines = (td) => {
    if (!td) return [];
    const html = td.innerHTML || '';
    return html.split(/<br\s*\/?>/i).map(line => {
      const temp = document.createElement('div');
      temp.innerHTML = line;
      return temp.textContent.trim();
    }).filter(Boolean);
  };

  const esTablaMlbJC = (headerText) => {
    const text = (headerText || '').toUpperCase();
    return text.includes('MLB') && (text.includes('ENFRENTAMIENTOS') || text.includes('JUEGO COMPLETO'));
  };

  const esTablaBaseballMixto = (headerText) => {
    // Retornamos false para omitir tablas de "BASEBALL" genéricas que contienen College u otras ligas que no son MLB
    return false;
  };

  const esTablaMlbTercio = (headerText) => {
    const text = (headerText || '').toUpperCase();
    return (text.includes('MLB PERIODOS') || text.includes('1ER TERCIO'));
  };

  const extraerJuegoCompleto = (row) => {
    const tds = row.querySelectorAll('td');
    if (tds.length < 11) return null;

    const hora = getText(tds[0]);
    const horaUpper = hora.toUpperCase();
    if (
      horaUpper.includes('MILB') || 
      horaUpper.includes('AAA') || 
      horaUpper.includes('JAPAN') || 
      horaUpper.includes('JAPON') || 
      horaUpper.includes('KOREA') || 
      horaUpper.includes('COREA') || 
      horaUpper.includes('COLLEGE')
    ) {
      return null;
    }
    const codes = getLines(tds[1]);
    const teams = getLines(tds[2]);
    const ml = getLines(tds[3]);
    const rl = getLines(tds[4]);
    const total = getText(tds[5]);
    const srl = tds[6] ? getLines(tds[6]) : [];
    const ra = tds[7] ? getLines(tds[7]) : [];
    const solo = tds[8] ? getLines(tds[8]) : [];
    const hce = tds[9] ? getText(tds[9]) : '';
    const pa = tds[10] ? getLines(tds[10]) : [];

    // Mitad
    const mitadMl = tds[11] ? getLines(tds[11]) : [];
    const mitadRl = tds[12] ? getLines(tds[12]) : [];
    const mitadTotal = tds[13] ? getText(tds[13]) : '';

    return {
      tipo: "mlb",
      hora,
      codigos: { visit: codes[0] || "", casa: codes[1] || "" },
      equipos: { visit: teams[0] || "", casa: teams[1] || "" },
      jc: {
        ml: { visit: ml[0] || "", casa: ml[1] || "" },
        rl: rl,
        total,
        srl: srl,
        ra: ra,
        solo: { visit: solo[0] || "", casa: solo[1] || "" },
        hce,
        pa: { visit: pa[0] || "", casa: pa[1] || "" }
      },
      mitad: {
        ml: { visit: mitadMl[0] || "", casa: mitadMl[1] || "" },
        rl: mitadRl,
        total: mitadTotal
      }
    };
  };

  const extraerTercio = (row) => {
    const tds = row.querySelectorAll('td');
    if (tds.length < 6) return null;

    const hora = getText(tds[0]);
    const horaUpper = hora.toUpperCase();
    if (
      horaUpper.includes('MILB') || 
      horaUpper.includes('AAA') || 
      horaUpper.includes('JAPAN') || 
      horaUpper.includes('JAPON') || 
      horaUpper.includes('KOREA') || 
      horaUpper.includes('COREA') || 
      horaUpper.includes('COLLEGE')
    ) {
      return null;
    }
    const teams = getLines(tds[2]);
    const ml = getLines(tds[3]);
    const rlTotal = tds[4] ? getLines(tds[4]) : [];
    const siNo = tds[5] ? getLines(tds[5]) : [];

    return {
      tipo: "tercio",
      hora,
      equipos: { visit: teams[0] || "", casa: teams[1] || "" },
      ml: { visit: ml[0] || "", casa: ml[1] || "" },
      rl_total: rlTotal,
      si_no: { si: siNo[0] || "", no: siNo[1] || "" }
    };
  };

  const extraerTercioDeBaseball = extraerTercio;

  const dedupPrefer = (arr) => {
    const seen = new Set();
    const result = [];
    for (const game of arr) {
      const key = `${game.tipo}|${game.hora}|${(game.equipos.visit || '').split(' ')[0]}|${(game.equipos.casa || '').split(' ')[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(game);
      }
    }
    return result;
  };

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) return;
    const headerText = rows[0].textContent || '';

    if (esTablaMlbJC(headerText) || esTablaBaseballMixto(headerText)) {
      for (let i = 2; i < rows.length; i++) {
        const game = extraerJuegoCompleto(rows[i]);
        if (game) jc.push(game);
      }
    } else if (esTablaMlbTercio(headerText)) {
      for (let i = 2; i < rows.length; i++) {
        const game = extraerTercio(rows[i]);
        if (game) tercio.push(game);
      }
    }
  });

  return dedupPrefer(jc.concat(tercio));
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
  const [feedMessage, setFeedMessage] = useState(null);
  const fileInputRef = useRef(null);
  const lastFeedSignatureRef = useRef(null);

  // --- Cargar feed desde el servidor ---
  const loadFeedFromServer = (showSuccessAlert = false, options = {}) => {
    const consume = options.consume !== false;
    const silentIfEmpty = options.silentIfEmpty === true;

    fetch(`./api.php?action=get_feed&consume=${consume ? '1' : '0'}&_=${Date.now()}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error("No se pudo conectar al servidor");
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.games)) {
          if (data.games.length > 0) {
            const signature = `${data.captured_at || ''}|${data.count || data.games.length}`;
            if (!showSuccessAlert && signature === lastFeedSignatureRef.current) {
              return;
            }
            lastFeedSignatureRef.current = signature;

            const games = parseMlbJsonNuevo(JSON.stringify(data.games), config);
            setParsedGames(games);
            
            // Expandir automáticamente juegos que no estén en estado OK
            const newExpanded = {};
            games.forEach((game) => {
              if (game.overallState !== 'OK') {
                newExpanded[game.id] = true;
              }
            });
            setExpandedGames(newExpanded);
            
            const capturedAt = data.captured_at ? new Date(data.captured_at).toLocaleString() : null;
            setFeedMessage(capturedAt ? `Feed del servidor cargado (${capturedAt})` : "Feed del servidor cargado");
            setTimeout(() => setFeedMessage(null), 5000);
            if (showSuccessAlert) {
              alert(`Sincronización exitosa: ${data.games.length} juegos cargados.${capturedAt ? `\nCapturado: ${capturedAt}` : ''}`);
            }
          } else {
            if (showSuccessAlert) {
              alert("Sincronización exitosa: El servidor no tiene juegos en el feed.");
            } else if (!silentIfEmpty) {
              setFeedMessage("No hay feed nuevo pendiente");
              setTimeout(() => setFeedMessage(null), 5000);
            }
          }
        }
      })
      .catch(err => {
        console.error("Error al cargar feed del servidor:", err);
        if (showSuccessAlert) {
          alert("Error al sincronizar: " + err.message);
        }
      });
  };

  // Escucha feeds nuevos enviados por el bookmarklet; cada feed se consume una sola vez.
  useEffect(() => {
    const pollFeed = () => loadFeedFromServer(false, { consume: true, silentIfEmpty: true });
    pollFeed();
    const intervalId = setInterval(pollFeed, 3000);
    return () => clearInterval(intervalId);
  }, [config]);

  // --- Lógica del Importador JSON/HTML ---
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
      let games = [];
      const trimmed = content.trim();
      
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        games = parseMlbJsonNuevo(content, config);
      } else {
        // Intentar parsear como HTML de Juancito Sport
        try {
          const parsedHtmlGames = parseJuancitoSportHtml(content);
          if (parsedHtmlGames.length > 0) {
            games = parseMlbJsonNuevo(JSON.stringify(parsedHtmlGames), config);
            setFeedMessage("HTML parseado y cargado correctamente");
            setTimeout(() => setFeedMessage(null), 5000);
          } else {
            alert("No se encontraron tablas de juegos compatibles en el archivo HTML.");
            return;
          }
        } catch (err) {
          console.error(err);
          alert("Error al parsear el archivo HTML: " + err.message);
          return;
        }
      }
      
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

      {feedMessage && (
        <div style={{
          background: 'rgba(0, 210, 255, 0.15)',
          border: '1px solid rgba(0, 210, 255, 0.3)',
          color: '#00d2ff',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '500',
          animation: 'fadeIn 0.3s ease'
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          {feedMessage}
        </div>
      )}

      {/* Seccion 1: Cargador JSON/HTML */}
      <section className="glass-panel" style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div 
          className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          style={{ cursor: 'pointer' }}
        >
          <span className="upload-icon">📂</span>
          <p className="upload-text">Arrastra el feed de MLB (JSON o HTML de Juancito Sport) aquí o haz clic para subirlo</p>
          <p className="upload-subtext">Soporta archivos .json, .txt y .html con juegos completos y tercio.</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json,.txt,.html" 
            style={{ display: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); loadFeedFromServer(true); }}
            className="filter-btn active"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem 2rem', 
              fontWeight: '600', 
              borderRadius: '8px',
              border: '1px solid rgba(0, 210, 255, 0.4)',
              background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.2) 0%, rgba(0, 210, 255, 0.05) 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 210, 255, 0.4)';
              e.currentTarget.style.borderColor = '#00d2ff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.4)';
            }}
          >
            <span>🔄</span> Sincronizar Servidor
          </button>
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
                      <th colSpan={config?.enableRunlines ? 8 : 5} className="borde">JUEGO COMPLETO</th>
                      <th colSpan={config?.enableRunlines ? 3 : 2} className="borde">MITAD</th>
                    </tr>
                    <tr className="segunda">
                      <th className="liga">Liga</th>
                      <th className="borde team" colSpan={2}>CODIGO EQUIPOS</th>
                      <th className="borde">ML</th>
                      {config?.enableRunlines && <th>RL</th>}
                      <th>TOTAL</th>
                      {config?.enableRunlines && <th>SRL</th>}
                      {config?.enableRunlines && <th>RA</th>}
                      <th>SOLO</th>
                      <th>HCE</th>
                      <th>PA</th>
                      <th className="borde">ML</th>
                      {config?.enableRunlines && <th>RL</th>}
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
                          {config?.enableRunlines && (
                             <td className="alt-cell odds-cell">
                               {renderRunlineCell(game.feed.rl[0], game.calc.rl ? game.calc.rl[0] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                               <br />
                               {renderRunlineCell(game.feed.rl[1], game.calc.rl ? game.calc.rl[1] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                             </td>
                           )}
                           <td className="odds-cell">{game.feed.total}</td>
                           {config?.enableRunlines && (
                             <td className="alt-cell odds-cell">
                               {renderRunlineCell(game.feed.srl[0], game.calc.srl ? game.calc.srl[0] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                               <br />
                               {renderRunlineCell(game.feed.srl[1], game.calc.srl ? game.calc.srl[1] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                             </td>
                           )}
                           {config?.enableRunlines && (
                             <td className="odds-cell">
                               {renderRunlineCell(game.feed.ra[0], game.calc.ra ? game.calc.ra[0] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                               <br />
                               {renderRunlineCell(game.feed.ra[1], game.calc.ra ? game.calc.ra[1] : null, `ML ${game.feed.ml[0]}/${game.feed.ml[1]}`)}
                             </td>
                           )}
                           <td className="alt-cell odds-cell">
                              {renderCell(game.feed.solo[0], game.calc.solo[0], false, getSoloRefLine(game), game.analysis?.solo?.status)}
                              <br />
                              {renderCell(game.feed.solo[1], game.calc.solo[1], false, getSoloRefLine(game), game.analysis?.solo?.status)}
                            </td>
                            <td className="odds-cell">{game.feed.hce}</td>
                            <td className="alt-cell odds-cell">
                              {renderCell(game.feed.pa[0], game.analysis?.pa?.calcVisit, true, getPaRefLine(game), game.analysis?.pa?.status)}
                              <br />
                              {renderCell(game.feed.pa[1], game.analysis?.pa?.calcCasa, true, getPaRefLine(game), game.analysis?.pa?.status)}
                            </td>
                           <td className="odds-cell">{game.feed.ml1H[0]}<br />{game.feed.ml1H[1]}</td>
                           {config?.enableRunlines && (
                             <td className="alt-cell odds-cell">
                               {renderRunlineCell(game.feed.rl1H[0], game.calc.hrl ? game.calc.hrl[0] : null, `ML 1H ${game.feed.ml1H[0]}/${game.feed.ml1H[1]}`)}
                               <br />
                               {renderRunlineCell(game.feed.rl1H[1], game.calc.hrl ? game.calc.hrl[1] : null, `ML 1H ${game.feed.ml1H[0]}/${game.feed.ml1H[1]}`)}
                             </td>
                           )}
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
