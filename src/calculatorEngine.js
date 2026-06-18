// Motor de cálculo de la línea y adaptadores JSON

// -------- Helper Parsers y Normalizadores --------

export function parseMl(raw) {
  if (!raw) return null;
  const s = raw.toString().replace(/\s+/g, "").replace(/−|–|—/g, "-").replace(/＋/g, "+");
  const m = s.match(/([+-])(\d{3})(?!\d)/);
  if (!m) {
    // Si no tiene signo pero es un número de 3 dígitos, asumimos negativo por defecto o intentamos castearlo
    const cleanNum = s.match(/-?\d+/);
    return cleanNum ? parseInt(cleanNum[0], 10) : null;
  }
  const sign = m[1] === "-" ? -1 : 1;
  return sign * parseInt(m[2], 10);
}

export function normalizeJuice(raw) {
  if (!raw) return "";
  let s = raw.toString().trim().replace(/\s+/g, "").replace(/−|–|—/g, "-").replace(/＋/g, "+");
  if (!s) return "";
  const match = s.match(/^([+-]?)(\d{2,3})$/);
  if (!match) return s;
  const sign = match[1] || "-"; // Por defecto, negativo si no tiene signo
  return `${sign}${match[2]}`;
}

export function cleanDouble(raw) {
  if (raw === undefined || raw === null) return null;
  const s = raw.toString()
    .replace(/\s+/g, "")
    .replace(/½/g, ".5")
    .replace(/,/g, ".");
  const match = s.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[0]) : null;
}

export function canonHalf(x) {
  return Math.round(x * 2.0) / 2.0;
}

export function prettyHalf(val) {
  if (val === null || val === undefined) return "--";
  if (val % 1 === 0) return val.toString();
  return `${Math.floor(val)}½`;
}

// -------- Motor de Cálculos Individuales --------

// 1. SOLO
export function calcularSolo(totalStr, mlCasaStr, mlVisitStr, config) {
  const mlCasa = parseMl(mlCasaStr);
  const mlVisit = parseMl(mlVisitStr);
  const total = cleanDouble(totalStr);

  if (total === null || mlCasa === null || mlVisit === null) {
    return { casa: "--", visitante: "--", debug: "Datos incompletos" };
  }

  const esEmpate = mlCasa === mlVisit;
  let adjustment = 0.0;
  let esCasaFav = false;
  let usedRule = null;

  if (!esEmpate) {
    if (mlCasa < mlVisit) {
      // Casa es favorito (número más negativo / menor en odds americanas)
      esCasaFav = true;
      const ruleIndex = (config.casaAdjustRanges || []).findIndex(
        r => mlCasa >= Math.min(r.min, r.max) && mlCasa <= Math.max(r.min, r.max)
      );
      const range = ruleIndex >= 0 ? config.casaAdjustRanges[ruleIndex] : null;
      adjustment = range ? range.adjust : 0.0;
      usedRule = range ? { side: "Casa", index: ruleIndex, ml: mlCasa, min: range.min, max: range.max, adjust: range.adjust } : null;
    } else {
      // Visitante es favorito
      const ruleIndex = (config.visitAdjustRanges || []).findIndex(
        r => mlVisit >= Math.min(r.min, r.max) && mlVisit <= Math.max(r.min, r.max)
      );
      const range = ruleIndex >= 0 ? config.visitAdjustRanges[ruleIndex] : null;
      adjustment = range ? range.adjust : 0.0;
      usedRule = range ? { side: "Visitante", index: ruleIndex, ml: mlVisit, min: range.min, max: range.max, adjust: range.adjust } : null;
    }
  }

  const z = total - adjustment;
  const esEntero = z % 1.0 === 0.0;
  const esDecimal = z % 1.0 === 0.5;

  let soloCasa = 0.0;
  let soloVisit = 0.0;

  if (esEmpate) {
    if (total % 1.0 === 0.0) {
      const v = total / 2.0;
      soloCasa = v;
      soloVisit = v;
    } else {
      const v = (total - 0.5) / 2.0;
      soloCasa = v;
      soloVisit = v;
    }
  } else if (esEntero) {
    if (esCasaFav) {
      soloCasa = z / 2.0 + adjustment;
      soloVisit = z / 2.0;
    } else {
      soloCasa = z / 2.0;
      soloVisit = z / 2.0 + adjustment;
    }
  } else if (esDecimal) {
    if (esCasaFav) {
      soloCasa = (z - 0.5) / 2.0 + adjustment;
      soloVisit = (z - 0.5) / 2.0;
    } else {
      soloCasa = (z - 0.5) / 2.0;
      soloVisit = (z - 0.5) / 2.0 + adjustment;
    }
  } else {
    const v = total / 2.0;
    soloCasa = v;
    soloVisit = v;
  }

  const roundedCasa = Math.round(soloCasa * 2) / 2.0;
  const roundedVisit = Math.round(soloVisit * 2) / 2.0;

  return {
    casa: prettyHalf(roundedCasa),
    visitante: prettyHalf(roundedVisit),
    rule: usedRule,
    debug: `Ajuste: ${adjustment}, Favorito: ${esCasaFav ? "Casa" : "Visitante"}`
  };
}

// 2. SI/NO (Con búsqueda flexible si juice no coincide)
export function buscarSiNo(total, tipo, linea, config) {
  const t = canonHalf(cleanDouble(total));
  const tp = tipo ? tipo.toString().trim().toUpperCase() : "";
  const ln = normalizeJuice(linea);

  if (!t || !tp || !ln) return null;

  const precios = config.preciosSiNo || [];

  // Intento de búsqueda exacta
  const exacta = precios.find(
    p => Math.abs(p.total - t) < 0.001 && p.tipo.toUpperCase() === tp && normalizeJuice(p.linea) === ln
  );
  if (exacta) return { precioSi: exacta.precioSi, precioNo: exacta.precioNo };

  // Búsqueda flexible (juice más cercano en el mismo total y tipo)
  const targetNum = parseInt(ln.replace(/[+-]/g, ""), 10) || 0;
  const candidatos = precios.filter(
    p => Math.abs(p.total - t) < 0.001 && p.tipo.toUpperCase() === tp
  );

  if (candidatos.length === 0) return null;

  let best = candidatos[0];
  let minDiff = Infinity;

  candidatos.forEach(c => {
    const cNum = parseInt(normalizeJuice(c.linea).replace(/[+-]/g, ""), 10) || 0;
    const diff = Math.abs(cNum - targetNum);
    if (diff < minDiff) {
      minDiff = diff;
      best = c;
    }
  });

  return { precioSi: best.precioSi, precioNo: best.precioNo, flexible: true };
}

// 3. PA

// 2b. SI/NO Opciones
export function buscarSiNoOpciones(total, tipo, linea, config) {
  const t = canonHalf(cleanDouble(total));
  const tp = tipo ? tipo.toString().trim().toUpperCase() : "";
  const ln = normalizeJuice(linea);

  if (!t || !tp || !ln) return [];

  const precios = config.preciosSiNo || [];

  // Intento de búsqueda exacta
  const exactas = precios.filter(
    p => Math.abs(p.total - t) < 0.001 && p.tipo.toUpperCase() === tp && normalizeJuice(p.linea) === ln
  );
  if (exactas.length > 0) {
    return exactas.map(p => ({ precioSi: p.precioSi, precioNo: p.precioNo }));
  }

  // Búsqueda flexible
  const targetNum = parseInt(ln.replace(/[+-]/g, ""), 10) || 0;
  const candidatos = precios.filter(
    p => Math.abs(p.total - t) < 0.001 && p.tipo.toUpperCase() === tp
  );

  if (candidatos.length === 0) return [];

  let minDiff = Infinity;
  candidatos.forEach(c => {
    const cNum = parseInt(normalizeJuice(c.linea).replace(/[+-]/g, ""), 10) || 0;
    const diff = Math.abs(cNum - targetNum);
    if (diff < minDiff) {
      minDiff = diff;
    }
  });

  const filtrados = candidatos.filter(c => {
    const cNum = parseInt(normalizeJuice(c.linea).replace(/[+-]/g, ""), 10) || 0;
    return Math.abs(cNum - targetNum) === minDiff;
  });

  return filtrados.map(p => ({ precioSi: p.precioSi, precioNo: p.precioNo }));
}

export function buscarPa(linea, side, config) {
  const ln = normalizeJuice(linea);
  const sd = side ? side.toString().trim().toLowerCase() : "";
  const sideNorm = sd === "casa" ? "Casa" : sd === "visitante" ? "Visitante" : null;

  if (!ln || !sideNorm) return null;

  const precios = config.preciosPa || [];
  const match = precios.find(
    p => normalizeJuice(p.linea) === ln && p.side === sideNorm
  );

  return match ? { precioSi: match.precioSi, precioNo: match.precioNo } : null;
}

// 4. TERCIO (O/U de tabla)
export function formatTercioOuOption(option) {
  if (!option) return null;
  return `${prettyHalf(option.tercio)} ${option.tipoT} ${option.lineaT}`;
}

export function buscarTercioOuOpciones(total, tipoH, lineaH, config) {
  const tCanon = canonHalf(cleanDouble(total));
  const tipoOk = tipoH ? tipoH.toString().trim().toUpperCase() : "";
  const lineaOk = normalizeJuice(lineaH);

  if (!tCanon || !tipoOk || !lineaOk) return [];

  const precios = config.preciosTercio || [];
  return precios.filter(
    p => Math.abs(p.total - tCanon) < 0.001 && p.tipoH.toUpperCase() === tipoOk && normalizeJuice(p.lineaH) === lineaOk
  );
}

export function buscarTercioOu(total, tipoH, lineaH, config) {
  const matches = buscarTercioOuOpciones(total, tipoH, lineaH, config);
  const match = matches[0];

  return match ? { 
    tercio: match.tercio, 
    tipoT: match.tipoT, 
    lineaT: match.lineaT,
    opciones: matches.map(formatTercioOuOption).filter(Boolean)
  } : null;
}

// 5. TERCIO (ML por regla desde ML 1H)
export function calcularTercioMl(mlVisitH, mlCasaH, config) {
  const v = parseMl(mlVisitH);
  const c = parseMl(mlCasaH);

  if (v === null || c === null) return null;

  let favHSide = "";
  if (v < 0 && c >= 0) favHSide = "Visitante";
  else if (c < 0 && v >= 0) favHSide = "Casa";
  else if (v < 0 && c < 0) {
    favHSide = Math.abs(v) >= Math.abs(c) ? "Visitante" : "Casa";
  } else {
    return null; // Si ambos son positivos, no hay favorito claro en base a negativos
  }

  const dogHSide = favHSide === "Visitante" ? "Casa" : "Visitante";
  const favAbs = Math.abs(favHSide === "Visitante" ? v : c);
  const dogAbs = Math.abs(favHSide === "Visitante" ? c : v);

  const rules = config.tercioMlRules || {
    rule130: { limit: 130, favT: -115, dogT: -115 },
    rule135: { limit: 135, favT: -120, dogT: -110 },
    rule145: { limit: 145, favT: -125, dogT: 105 },
    rule150: { limit: 150, favT: -130, dogT: 100 },
    dogSpread: 30
  };

  let favT, dogT, tercioFavSide;

  if (favAbs <= rules.rule130.limit) {
    favT = rules.rule130.favT;
    dogT = rules.rule130.dogT;
    tercioFavSide = favHSide;
  } else if (favAbs === rules.rule135.limit) {
    favT = rules.rule135.favT;
    dogT = rules.rule135.dogT;
    tercioFavSide = favHSide;
  } else if (favAbs <= rules.rule145.limit) {
    favT = rules.rule145.favT;
    dogT = rules.rule145.dogT;
    tercioFavSide = favHSide;
  } else if (favAbs <= rules.rule150.limit) {
    favT = rules.rule150.favT;
    dogT = rules.rule150.dogT;
    tercioFavSide = favHSide;
  } else {
    // Hembra del H se convierte en macho en tercio. Otro lado con regla de 30.
    favT = -dogAbs;
    const dogVal = dogAbs - rules.dogSpread;
    dogT = dogVal > 0 ? dogVal : dogVal; // Conserva el signo en el formato final
    // Forzado: favorito original de H se mantiene como favorito (macho) en el tercio
    tercioFavSide = favHSide;
  }

  const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);

  if (tercioFavSide === "Visitante") {
    return {
      visit: fmt(favT),
      casa: fmt(dogT),
      favSide: "Visitante"
    };
  } else {
    return {
      visit: fmt(dogT),
      casa: fmt(favT),
      favSide: "Casa"
    };
  }
}

// -------- Parser y Adaptador JSON principal (desde feed) --------

export function parseMlbJsonNuevo(jsonString, config) {
  let arr;
  try {
    arr = JSON.parse(jsonString);
    if (!Array.isArray(arr)) return [];
  } catch (e) {
    console.error("Error parsing JSON string", e);
    return [];
  }

  // Helper local para normalizar nombres y comparar
  function normTeam(raw) {
    if (!raw) return "";
    return raw.split("(")[0]
      .toLowerCase()
      .replace("2j-", "")
      .replace(/\s+/g, " ")
      .replace(/[^a-z ]/g, "")
      .replace(/\s/g, "")
      .trim();
  }

  function normHora(h) {
    if (!h) return "";
    return h.toLowerCase().replace(/\s+/g, "");
  }

  function tercioKey(visit, casa, hora) {
    return `${normTeam(visit)}|${normTeam(casa)}|${normHora(hora)}`;
  }

  function parseOuToken(tok) {
    if (!tok) return null;
    const cleaned = tok.toString().trim().replace(/½/g, ".5").replace(/,/g, ".").replace(/\s+/g, "");
    // Acepta: "4.5o-120", "4o-115", etc.
    const m = cleaned.match(/^(\d+(?:\.\d+)?)([ouOU])([+-]?\d+)$/);
    if (!m) return null;
    const total = parseFloat(m[1]);
    const tipo = m[2].toUpperCase();
    const lineaRaw = m[3];
    const linea = lineaRaw.startsWith("+") || lineaRaw.startsWith("-") ? lineaRaw : `-${lineaRaw}`;
    return { total, tipo, linea };
  }

  // 1) Construir mapa de datos 'tercio'
  const tercioMap = {};
  arr.forEach(o => {
    if (o.tipo !== "tercio") return;

    const hora = o.hora;
    const eq = o.equipos;
    if (!eq) return;
    const v = eq.visit;
    const c = eq.casa;

    const ml = o.ml;
    const mlV = ml && ml.visit ? ml.visit.trim() : null;
    const mlC = ml && ml.casa ? ml.casa.trim() : null;

    const rlTot = o.rl_total;
    const ouTok = Array.isArray(rlTot) ? rlTot[0] : rlTot;
    const ou = parseOuToken(ouTok);

    const siNoObj = o.si_no || {};
    const siNoSi = siNoObj.si || "";
    const siNoNo = siNoObj.no || "";

    const key = tercioKey(v, c, hora);
    tercioMap[key] = {
      mlVisit: mlV,
      mlCasa: mlC,
      total: ou ? ou.total : null,
      tipo: ou ? ou.tipo : null,
      linea: ou ? ou.linea : null,
      siNoSi,
      siNoNo
    };
  });

  // 2) Fusionar filas 'mlb' con datos 'tercio' y correr cálculos del motor
  const out = [];
  arr.forEach(obj => {
    if (obj.tipo !== "mlb") return;

    const hora = obj.hora || "";
    const eqObj = obj.equipos || {};
    const eqVisit = eqObj.visit || "";
    const eqCasa = eqObj.casa || "";

    const jc = obj.jc || {};
    const mlObj = jc.ml || {};
    const mlVisitJC = mlObj.visit || "";
    const mlCasaJC = mlObj.casa || "";
    const rlJC = jc.rl || [];
    const totalJC = jc.total || "";
    const soloObj = jc.solo || {};
    const soloVisit = soloObj.visit || "";
    const soloCasa = soloObj.casa || "";
    const paObj = jc.pa || {};
    const paVisitJC = paObj.visit || "";
    const paCasaJC = paObj.casa || "";

    const codigosObj = obj.codigos || {};
    const srlJC = jc.srl || [];
    const raJC = jc.ra || [];
    const hceJC = jc.hce || "";

    // 1ra mitad
    const mitadObj = obj.optObj ? obj.optObj("mitad") : (obj.mitad || {});
    const mitadMl = mitadObj.ml || {};
    const mlMitadVisit = mitadMl.visit || "";
    const mlMitadCasa = mitadMl.casa || "";
    const rlMitad = mitadObj.rl || [];
    const totalMitadRaw = mitadObj.total || "";

    // Parseo de H (mitad.total) para Tercio
    let hTotal = null, hTipo = null, hLinea = null;
    if (totalMitadRaw) {
      const normalizedMitad = totalMitadRaw.toString().toLowerCase()
        .replace(/½/g, ".5").replace(/,/g, ".").replace(/\s+/g, "");
      // Acepta: "4o115", "4u120", "5pk-110"
      const m = normalizedMitad.match(/^(\d+(?:\.\d+)?)(o|u|pk)([+-]?\d+)$/);
      if (m) {
        hTotal = canonHalf(parseFloat(m[1]));
        hTipo = m[2] === "o" ? "O" : m[2] === "u" ? "U" : "PK";
        const l0 = m[3];
        hLinea = l0.startsWith("+") || l0.startsWith("-") ? l0 : `-${l0}`;
      }
    }

    // Tokens ML para PA / TERCIO: prioridad MITAD > JC
    const cleanToken = (val) => {
      if (!val) return null;
      const m = val.toString().match(/([+-]\d{3})/);
      return m ? m[1] : null;
    };
    const paLineaCasaUse = cleanToken(mlMitadCasa) || cleanToken(mlCasaJC);
    const paLineaVisitUse = cleanToken(mlMitadVisit) || cleanToken(mlVisitJC);

    // Validación básica de ML JC
    const hasValidMl = (val) => /[+-]\d{3}/.test(val);
    if (!hasValidMl(mlVisitJC) || !hasValidMl(mlCasaJC) || !eqVisit || !eqCasa) {
      return; // Omitir si faltan datos esenciales
    }

    // Emparejar con 'tercio'
    const key = tercioKey(eqVisit, eqCasa, hora);
    const tercio = tercioMap[key] || {};

    // --- CÁLCULOS DEL MOTOR CON CONFIG PERSONALIZADA ---

    // 1) SOLO
    const soloCalc = calcularSolo(totalJC, mlCasaJC, mlVisitJC, config);

    // 2) SI/NO
    let sinoCalc = null;
    // Extraer parámetros SiNo desde total JC
    const sinoParams = (function() {
      if (!totalJC) return null;
      const s = totalJC.toString().toLowerCase().replace(/½/g, ".5").replace(/,/g, ".").replace(/\s+/g, "");
      let match = s.match(/^(\d+(?:\.\d+)?)([oup])([+-]?\d+)$/);
      if (match) {
        const tot = canonHalf(parseFloat(match[1]));
        const tipo = match[2].toUpperCase();
        const l0 = match[3];
        const line = l0.startsWith("+") || l0.startsWith("-") ? l0 : `-${l0}`;
        return { tot, tipo, line };
      }
      match = s.match(/^(\d+(?:\.\d+)?)([+-]\d+)$/);
      if (match) {
        const tot = canonHalf(parseFloat(match[1]));
        return { tot, tipo: "P", line: match[2] };
      }
      return null;
    })();

    let sinoOptions = [];
    if (sinoParams) {
      sinoOptions = buscarSiNoOpciones(sinoParams.tot, sinoParams.tipo, sinoParams.line, config);
      sinoCalc = sinoOptions[0] || null;
    }

    // 3) PA
    // Identificar favorito de la 1H para PA
    const halfCasaInt = parseMl(paLineaCasaUse);
    const halfVisitInt = parseMl(paLineaVisitUse);
    let favoritoMitad = null;
    if (halfCasaInt !== null && halfVisitInt !== null) {
      if (halfCasaInt < 0 && halfVisitInt >= 0) favoritoMitad = "Casa";
      else if (halfVisitInt < 0 && halfCasaInt >= 0) favoritoMitad = "Visitante";
      else if (halfCasaInt < 0 && halfVisitInt < 0) {
        favoritoMitad = Math.abs(halfCasaInt) >= Math.abs(halfVisitInt) ? "Casa" : "Visitante";
      }
    } else if (halfCasaInt !== null && halfCasaInt < 0) favoritoMitad = "Casa";
    else if (halfVisitInt !== null && halfVisitInt < 0) favoritoMitad = "Visitante";

    const lineaFavorito = favoritoMitad === "Casa" ? paLineaCasaUse : favoritoMitad === "Visitante" ? paLineaVisitUse : null;
    const paFav = (favoritoMitad && lineaFavorito) ? buscarPa(lineaFavorito, favoritoMitad, config) : null;

    // Lógica de desambiguación / swap de PA (prioriza hacer coincidir con el feed)
    const paJsonVisitRaw = parseMl(jc.pa ? jc.pa.visit : "");
    const paJsonCasaRaw = parseMl(jc.pa ? jc.pa.casa : "");
    const directPaCasaCalc = favoritoMitad === "Casa" ? paFav?.precioSi : paFav?.precioNo;
    const directPaVisitCalc = favoritoMitad === "Casa" ? paFav?.precioNo : favoritoMitad === "Visitante" ? paFav?.precioSi : null;
    const swappedPaVisitCalc = directPaCasaCalc;
    const swappedPaCasaCalc = directPaVisitCalc;

    const scorePa = (vC, cC) => {
      let score = 0;
      if (vC !== null && vC !== undefined && paJsonVisitRaw !== null) {
        score += vC === paJsonVisitRaw ? 3 : (Math.abs(vC - paJsonVisitRaw) <= 5 ? 1 : 0);
      }
      if (cC !== null && cC !== undefined && paJsonCasaRaw !== null) {
        score += cC === paJsonCasaRaw ? 3 : (Math.abs(cC - paJsonCasaRaw) <= 5 ? 1 : 0);
      }
      return score;
    };

    const directScore = scorePa(directPaVisitCalc, directPaCasaCalc);
    const swappedScore = scorePa(swappedPaVisitCalc, swappedPaCasaCalc);
    const useSwappedPa = swappedScore > directScore;

    const paVisitFinalCalc = useSwappedPa ? swappedPaVisitCalc : directPaVisitCalc;
    const paCasaFinalCalc = useSwappedPa ? swappedPaCasaCalc : directPaCasaCalc;

    // 4) TERCIO (ML y O/U)
    const tercioMlCalc = calcularTercioMl(paLineaVisitUse, paLineaCasaUse, config);
    const tercioOuCalc = (hTotal && hTipo && hLinea) ? buscarTercioOu(hTotal, hTipo, hLinea, config) : null;
    const feedTercioOuText = tercio.total ? `${prettyHalf(tercio.total)} ${tercio.tipo || ""} ${tercio.linea || ""}` : "";
    const tercioOuOptions = tercioOuCalc?.opciones || [];
    const tercioOuValidOption = feedTercioOuText ? findMatchingTercioOuOption(feedTercioOuText, tercioOuOptions) : null;

    // 5) MLB RUN LINES (RL, SRL, RA)
    const runlinesCalc = calcularMlbRunlines(mlVisitJC, mlCasaJC, rlJC, config);

    const feedSinoSi = obj.sino ? obj.sino.visit || "" : tercio.siNoSi || "";
    const feedSinoNo = obj.sino ? obj.sino.casa || "" : tercio.siNoNo || "";

    const game = {
      id: `${eqVisit}_${eqCasa}_${hora}`,
      hora,
      equipos: [eqVisit, eqCasa],
      // Datos originales del feed JSON
      feed: {
        codigos: [codigosObj.visit || "", codigosObj.casa || ""],
        ml: [mlVisitJC, mlCasaJC],
        rl: rlJC,
        total: totalJC,
        srl: srlJC,
        ra: raJC,
        hce: hceJC,
        solo: [soloVisit, soloCasa],
        pa: [paObj.visit || "", paObj.casa || ""],
        sino: [feedSinoSi, feedSinoNo],
        // Datos de la mitad
        ml1H: [mlMitadVisit, mlMitadCasa],
        rl1H: rlMitad,
        total1H: totalMitadRaw,
        // Tercio
        tercioMl: [tercio.mlVisit || "", tercio.mlCasa || ""],
        tercioOu: feedTercioOuText
      },
      // Cálculos del motor de acuerdo con config personalizada
      calc: {
        solo: [soloCalc.visitante, soloCalc.casa],
        soloRule: soloCalc.rule,
        sino: sinoCalc ? [sinoCalc.precioSi, sinoCalc.precioNo] : null,
        sinoOptions: sinoOptions,
        pa: paVisitFinalCalc !== null ? [paVisitFinalCalc, paCasaFinalCalc] : null,
        paLineaUsada: [paLineaVisitUse, paLineaCasaUse],
        paFavSide: favoritoMitad,
        tercioMl: tercioMlCalc ? [tercioMlCalc.visit, tercioMlCalc.casa] : null,
        tercioFavSide: tercioMlCalc ? tercioMlCalc.favSide : null,
        tercioOu: tercioOuCalc ? `${prettyHalf(tercioOuCalc.tercio)} ${tercioOuCalc.tipoT} ${tercioOuCalc.lineaT}` : null,
        tercioOuOptions,
        tercioOuValidOption,
        // H del feed interpretada
        hInterpretada: hTotal ? `${prettyHalf(hTotal)} ${hTipo} ${hLinea}` : null,
        // MLB Run Lines calculados
        rl: runlinesCalc ? [runlinesCalc.rl.visit, runlinesCalc.rl.casa] : null,
        srl: runlinesCalc ? [runlinesCalc.srl.visit, runlinesCalc.srl.casa] : null,
        ra: runlinesCalc ? [runlinesCalc.ra.visit, runlinesCalc.ra.casa] : null,
        hrl: runlinesCalc ? [runlinesCalc.hrl.visit, runlinesCalc.hrl.casa] : null
      }
    };
    game.overallState = getOverallState(game);
    out.push(game);
  });

  return out;
}

// -------- Helper Functions to Compute Discrepancy (Overall State) --------

export function parseSignedIntLoose(s) {
  if (!s) return null;
  const m = s.toString().replace(/\s+/g, "").match(/^([+-]?)(\d{2,3})$/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * parseInt(m[2], 10);
}

function parseSignedIntAbs(s) {
  const val = parseSignedIntLoose(s);
  return val !== null ? Math.abs(val) : null;
}

export function parseTercioOuText(value) {
  if (!value) return null;
  const clean = value.toString()
    .toLowerCase()
    .replace(/Â½|½/g, ".5")
    .replace(/\s+/g, "");
  const match = clean.match(/^(\d+(?:\.\d+)?)(o|u|pk)([+-]?\d+)$/);
  if (!match) return null;

  return {
    total: parseFloat(match[1]),
    tipo: match[2],
    linea: parseSignedIntLoose(normalizeJuice(match[3]))
  };
}

export function isTercioOuMatch(feedOu, calcOu, lineTolerance = 5) {
  if (!feedOu || !calcOu) return true;
  const feed = parseTercioOuText(feedOu);
  const calc = parseTercioOuText(calcOu);
  if (!feed || !calc || feed.linea === null || calc.linea === null) return false;

  return Math.abs(feed.total - calc.total) < 0.001 &&
         feed.tipo === calc.tipo &&
         Math.abs(feed.linea - calc.linea) <= lineTolerance;
}

export function findMatchingTercioOuOption(feedOu, options = [], lineTolerance = 5) {
  return options.find(option => isTercioOuMatch(feedOu, option, lineTolerance)) || null;
}

export function mlWithinRange(feedVal, calcVal) {
  const f = parseSignedIntLoose(feedVal);
  const c = parseSignedIntLoose(calcVal);
  if (f === null) return true;
  if (c === null) return false;
  return Math.abs(f - c) <= 5;
}

export function getOverallState(game) {
  // 1. SOLO
  const fSoloV = cleanDouble(game.feed.solo[0]);
  const fSoloC = cleanDouble(game.feed.solo[1]);
  const cSoloV = cleanDouble(game.calc.solo[0]);
  const cSoloC = cleanDouble(game.calc.solo[1]);
  const soloAnyMismatch = (fSoloV !== null && fSoloV !== cSoloV) || (fSoloC !== null && fSoloC !== cSoloC);

  // 2. SI/NO


  const fSi = parseSignedIntLoose(game.feed.sino[0]);


  const fNo = parseSignedIntLoose(game.feed.sino[1]);


  let sinoMismatch = false;


  if (fSi !== null && fNo !== null) {


    const options = game.calc.sinoOptions || [];


    if (options.length > 0) {


      const match = options.find(opt => {
      const matchSi = Math.abs(fSi - opt.precioSi) <= 5 || Math.abs(Math.abs(fSi) - Math.abs(opt.precioSi)) <= 5;
      const matchNo = Math.abs(fNo - opt.precioNo) <= 5 || Math.abs(Math.abs(fNo) - Math.abs(opt.precioNo)) <= 5;
      return matchSi && matchNo;
    });


      sinoMismatch = !match;


    } else {


      sinoMismatch = true;


    }


  } else if (fSi !== null || fNo !== null) {


    sinoMismatch = true;


  }

  // 3. PA
  const fPaV = parseSignedIntLoose(game.feed.pa[0]);
  const fPaC = parseSignedIntLoose(game.feed.pa[1]);
  const cPaV = game.calc.pa ? game.calc.pa[0] : null;
  const cPaC = game.calc.pa ? game.calc.pa[1] : null;
  const paVisitOk = fPaV === null || (cPaV !== null && Math.abs(fPaV - cPaV) <= 5);
  const paCasaOk = fPaC === null || (cPaC !== null && Math.abs(fPaC - cPaC) <= 5);
  const paAnyMismatch = (cPaV !== null || cPaC !== null) && (!paVisitOk || !paCasaOk);

  // 4. TERCIO
  const hasTercioMlJson = game.feed.tercioMl[0] !== "" && game.feed.tercioMl[1] !== "";
  const tercioMlOk = !hasTercioMlJson || (
    game.calc.tercioMl && (
      (mlWithinRange(game.feed.tercioMl[0], game.calc.tercioMl[0]) && mlWithinRange(game.feed.tercioMl[1], game.calc.tercioMl[1])) ||
      (mlWithinRange(game.feed.tercioMl[0], game.calc.tercioMl[1]) && mlWithinRange(game.feed.tercioMl[1], game.calc.tercioMl[0]))
    )
  );

  // Tercio O/U
  let tercioOuOk = true;
  const tercioOuOptionsForCheck = game.calc.tercioOuOptions?.length ? game.calc.tercioOuOptions : [];
  const tercioOuOptionMatch = game.feed.tercioOu ? findMatchingTercioOuOption(game.feed.tercioOu, tercioOuOptionsForCheck) : null;
  if (tercioOuOptionMatch) {
    tercioOuOk = true;
  } else if (game.feed.tercioOu && game.calc.tercioOu) {
    const fOu = game.feed.tercioOu.toLowerCase().replace(/½/g, ".5").replace(/\s+/g, "");
    const cOu = game.calc.tercioOu.toLowerCase().replace(/½/g, ".5").replace(/\s+/g, "");
    
    const fM = fOu.match(/^(\d+(?:\.\d+)?)(o|u|pk)([+-]?\d+)$/);
    const cM = cOu.match(/^(\d+(?:\.\d+)?)(o|u|pk)([+-]?\d+)$/);
    
    if (fM && cM) {
      const fTot = parseFloat(fM[1]);
      const cTot = parseFloat(cM[1]);
      const fTipo = fM[2];
      const cTipo = cM[2];
      const fLine = fM[3];
      const cLine = cM[3];
      
      tercioOuOk = Math.abs(fTot - cTot) < 0.001 && 
                   fTipo === cTipo && 
                   Math.abs(parseSignedIntAbs(fLine) - parseSignedIntAbs(cLine)) <= 5;
    } else {
      tercioOuOk = false;
    }
  } else if (game.feed.tercioOu && !game.calc.tercioOu) {
    tercioOuOk = false;
  }

  const tercioHasIssue = (game.feed.tercioMl[0] !== "" || game.feed.tercioOu !== "") && !(tercioMlOk && tercioOuOk);
  const noSoportado = !game.calc.tercioOu && game.feed.total1H;

  // 5. Run Lines
  const rl0Ok = game.feed.rl[0] === "" || (game.calc.rl && isRunlinePriceMatch(game.feed.rl[0], game.calc.rl[0]));
  const rl1Ok = game.feed.rl[1] === "" || (game.calc.rl && isRunlinePriceMatch(game.feed.rl[1], game.calc.rl[1]));
  
  const srl0Ok = game.feed.srl[0] === "" || (game.calc.srl && isRunlinePriceMatch(game.feed.srl[0], game.calc.srl[0]));
  const srl1Ok = game.feed.srl[1] === "" || (game.calc.srl && isRunlinePriceMatch(game.feed.srl[1], game.calc.srl[1]));

  const ra0Ok = game.feed.ra[0] === "" || (game.calc.ra && isRunlinePriceMatch(game.feed.ra[0], game.calc.ra[0]));
  const ra1Ok = game.feed.ra[1] === "" || (game.calc.ra && isRunlinePriceMatch(game.feed.ra[1], game.calc.ra[1]));
  
  const hrl0Ok = game.feed.rl1H[0] === "" || (game.calc.hrl && isRunlinePriceMatch(game.feed.rl1H[0], game.calc.hrl[0]));
  const hrl1Ok = game.feed.rl1H[1] === "" || (game.calc.hrl && isRunlinePriceMatch(game.feed.rl1H[1], game.calc.hrl[1]));

  const runlineMismatch = !rl0Ok || !rl1Ok || !srl0Ok || !srl1Ok || !ra0Ok || !ra1Ok || !hrl0Ok || !hrl1Ok;

  if (soloAnyMismatch || paAnyMismatch || sinoMismatch || runlineMismatch) return 'ERROR';
  if (tercioHasIssue || noSoportado) return 'REVIEW';
  return 'OK';
}


// -------- Helper functions for MLB Run Line calculations --------
export function parseJuiceFromCombined(str) {
  if (!str) return null;
  const cleaned = str.toString().trim().replace(/−|–|—/g, "-").replace(/＋/g, "+");
  const m = cleaned.match(/([+-]?\d{3})$/);
  if (m) {
    const val = parseInt(m[1].startsWith("+") || m[1].startsWith("-") ? m[1] : `-${m[1]}`, 10);
    return isNaN(val) ? null : val;
  }
  const single = cleaned.match(/^([+-]?\d{2,3})$/);
  if (single) {
    const val = parseInt(single[1], 10);
    return isNaN(val) ? null : val;
  }
  return null;
}

export function isRunlinePriceMatch(feedVal, calcVal) {
  const fJuice = parseJuiceFromCombined(feedVal);
  const cJuice = parseJuiceFromCombined(calcVal);
  if (fJuice === null || cJuice === null) return false;
  return Math.abs(fJuice - cJuice) <= 5;
}

export function calcularMlbRunlines(mlVisitStr, mlCasaStr, feedRl, config) {
  const mlVisit = parseMl(mlVisitStr);
  const mlCasa = parseMl(mlCasaStr);

  if (mlVisit === null || mlCasa === null) return null;

  // Determine favorite side
  let side = "";
  if (mlVisit < mlCasa) {
    side = "VISITANTE";
  } else if (mlCasa < mlVisit) {
    side = "CASA";
  } else {
    // Pick'em: check feed RL to see who is favorite (-1.5)
    const rlV = feedRl && feedRl[0] ? feedRl[0].toString() : "";
    const rlC = feedRl && feedRl[1] ? feedRl[1].toString() : "";
    if (rlV.includes("-1.5") || rlV.includes("-1½")) {
      side = "VISITANTE";
    } else if (rlC.includes("-1.5") || rlC.includes("-1½")) {
      side = "CASA";
    } else {
      side = "CASA"; // default
    }
  }

  const formatMl = (num) => (num >= 0 ? `+${num}` : `${num}`);
  const vStr = formatMl(mlVisit);
  const cStr = formatMl(mlCasa);

  const rules = config.mlbRunlineRules || [];
  const rule = rules.find(r => 
    r.side === side && r.ml_visitante === vStr && r.ml_casa === cStr
  );

  if (!rule) return null;

  return {
    rl: { visit: rule.rl_visitante, casa: rule.rl_casa },
    srl: { visit: rule.srl_visitante, casa: rule.srl_casa },
    ra: { visit: rule.rlalt_visitante, casa: rule.rlalt_casa },
    hrl: { visit: rule.hrl_visitante, casa: rule.hrl_casa }
  };
}
