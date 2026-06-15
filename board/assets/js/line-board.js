/**
 * Sportsbook Monitor Deportivo - line-board.js
 * Desarrollador Senior: Antigravity AI
 */

// ==========================================
// 1. DATOS DE EJEMPLO REALISTAS
// ==========================================

const mlbData = [
  {
    hora: "6:40PM",
    codigos: ["4028", "4015"],
    equipos: ["Miami (R Gusto 4.0)", "Philadelphia (Z Wheeler 6.5)"],
    ml: ["+165", "-190"],
    rl: ["+1½ -120", "-1½ +100"],
    total: "8 -110",
    srl: ["-210", "-2½ +160"],
    ra: ["-1½ +270", "-360"],
    solo: ["3½", "4½"],
    soloCalc: ["4", "4½"], // Mismatch intencional para demo
    hce: "24½ u135",
    pa: ["-120", "-120"],
    paCalc: ["-120", "-120"],
    mitadMl: ["+170", "-205"],
    mitadRl: ["+½ +120", "-½ -140"],
    mitadTotal: "4 o120",
    isGrey: true
  },
  {
    hora: "6:45PM",
    codigos: ["4006", "4019"],
    equipos: ["Kansas (M Spence 3.0)", "Washington (A Alvarez 4.0)"],
    ml: ["+110", "-130"],
    rl: ["+1½ -175", "-1½ +155"],
    total: "9½ u115",
    srl: ["-300", "-2½ +220"],
    ra: ["-1½ +170", "-230"],
    solo: ["4½", "5"],
    soloCalc: ["4½", "5"],
    hce: "27½ u140",
    pa: ["-145", "+105"],
    paCalc: ["-130", "+105"], // Mismatch intencional para demo
    mitadMl: ["+130", "-150"],
    mitadRl: ["+½ -110", "-½ -110"],
    mitadTotal: "5 o125",
    isGrey: false
  },
  {
    hora: "7:10PM",
    codigos: ["4018", "4024"],
    equipos: ["Mets (T Myers )", "Cincinnati (C Burns 7.5)"],
    ml: ["+115", "-135"],
    rl: ["+1½ -175", "-1½ +155"],
    total: "8½ o120",
    srl: ["-310", "-2½ +235"],
    ra: ["-1½ +180", "-250"],
    solo: ["4", "4½"],
    soloCalc: ["4", "4½"],
    hce: "26½ u135",
    pa: ["-140", "+100"],
    paCalc: ["-140", "+100"],
    mitadMl: ["+140", "-160"],
    mitadRl: ["+½ -110", "-½ -110"],
    mitadTotal: "4½ u120",
    isGrey: true
  },
  {
    hora: "7:45PM",
    codigos: ["4026", "4016"],
    equipos: ["SanDiego (U UNDECIDED )", "STL Cardinals (D May 5.0)"],
    ml: ["+140", "-160"],
    rl: ["+1½ -145", "-1½ +125"],
    total: "8½ -110",
    srl: ["-275", "-2½ +205"],
    ra: ["-1½ +205", "-275"],
    solo: ["3½", "4½"],
    soloCalc: ["3½", "4½"],
    hce: "26½ u140",
    pa: ["-135", "-105"],
    paCalc: ["-135", "-105"],
    mitadMl: ["+145", "-165"],
    mitadRl: ["+½ -105", "-½ -115"],
    mitadTotal: "4½ o125",
    isGrey: false
  },
  {
    hora: "8:05PM",
    codigos: ["4007", "4004"],
    equipos: ["Minnesota (U UNDECIDED )", "Texas (M Gore 5.5)"],
    ml: ["+130", "-150"],
    rl: ["+1½ -155", "-1½ +135"],
    total: "8½ -110",
    srl: ["-255", "-2½ +185"],
    ra: ["-1½ +220", "-300"],
    solo: ["4", "4½"],
    soloCalc: ["4", "4½"],
    hce: "25½ u140",
    pa: ["-140", "+100"],
    paCalc: ["-140", "+100"],
    mitadMl: ["+135", "-155"],
    mitadRl: ["+½ -110", "-½ -110"],
    mitadTotal: "4½ u110",
    isGrey: true
  },
  {
    hora: "8:05PM",
    codigos: ["4027", "4023"],
    equipos: ["Colorado (M Lorenzen 4.0)", "Cubs (S Imanaga 6.0)"],
    ml: ["+175", "-210"],
    rl: ["+1½ -115", "-1½ -105"],
    total: "9½ -110",
    srl: ["-200", "-2½ +150"],
    ra: ["-1½ +270", "-360"],
    solo: ["4", "5½"],
    soloCalc: ["4", "5½"],
    hce: "28½ u140",
    pa: ["-120", "-120"],
    paCalc: ["-120", "-120"],
    mitadMl: ["+170", "-200"],
    mitadRl: ["+½ +120", "-½ -140"],
    mitadTotal: "5 o120",
    isGrey: false
  },
  {
    hora: "8:10PM",
    codigos: ["4012", "4020"],
    equipos: ["Detroit (T Melton 4.0)", "Houston (K Teng 5.0)"],
    ml: ["-105", "-115"],
    rl: ["+1½ -195", "-1½ +165"],
    total: "9 u115",
    srl: ["-330", "-2½ +240"],
    ra: ["-1½ +165", "-215"],
    solo: ["4", "4½"],
    soloCalc: ["4", "4½"],
    hce: "26½ u140",
    pa: ["-150", "+110"],
    paCalc: ["-150", "+110"],
    mitadMl: ["+100", "-120"],
    mitadRl: ["+½ -140", "-½ +120"],
    mitadTotal: "5 u115",
    isGrey: true
  },
  {
    hora: "9:40PM",
    codigos: ["4011", "4030"],
    equipos: ["Angels (W Urena 4.0)", "Arizona (R Nelson 4.5)"],
    ml: ["+105", "-125"],
    rl: ["+1½ -185", "-1½ +165"],
    total: "9 -110",
    srl: ["-330", "-2½ +240"],
    ra: ["-1½ +170", "-230"],
    solo: ["4", "4½"],
    soloCalc: ["4", "4½"],
    hce: "27½ u140",
    pa: ["-150", "+110"],
    paCalc: ["-150", "+110"],
    mitadMl: ["+100", "-120"],
    mitadRl: ["+½ -140", "-½ +120"],
    mitadTotal: "5 u120",
    isGrey: false
  },
  {
    hora: "9:40PM",
    codigos: ["4017", "4014"],
    equipos: ["Pittsburgh (J Jones 4.5)", "Athletics (J Ginn 4.5)"],
    ml: ["+100", "-120"],
    rl: ["+1½ -175", "-1½ +155"],
    total: "10½ -110",
    srl: ["-310", "-2½ +235"],
    ra: ["-1½ +155", "-195"],
    solo: ["5", "5½"],
    soloCalc: ["5", "5½"],
    hce: "30½ u140",
    pa: ["-155", "+115"],
    paCalc: ["-155", "+115"],
    mitadMl: ["-105", "-115"],
    mitadRl: ["+½ -140", "-½ +120"],
    mitadTotal: "5½ o120",
    isGrey: true
  },
  {
    hora: "10:10PM",
    codigos: ["4029", "4021"],
    equipos: ["Tampa (N Martinez 3.5)", "Dodgers (E Lauer 3.5)"],
    ml: ["+155", "-175"],
    rl: ["+1½ -130", "-1½ +110"],
    total: "9½ u120",
    srl: ["-230", "-2½ +170"],
    ra: ["-1½ +220", "-300"],
    solo: ["4", "5"],
    soloCalc: ["4", "5"],
    hce: "27½ u140",
    pa: ["-135", "-105"],
    paCalc: ["-135", "-105"],
    mitadMl: ["+140", "-160"],
    mitadRl: ["+½ +100", "-½ -120"],
    mitadTotal: "5 o120",
    isGrey: false
  }
];

const basesAlcanzadasData = [
  // Columna 1
  { hora: "6:40PM", codigos: ["B41", "B42"], enfrentamiento: ["L Hicks (MIA)", "K Schwarber (PHI)"], jcMl: ["-145", "-165"], isGrey: true },
  { hora: "6:40PM", codigos: ["B47", "B48"], enfrentamiento: ["X. Edwards (MIA)", "B Marsh (PHI)"], jcMl: ["-145", "-160"], isGrey: true },
  { hora: "6:45PM", codigos: ["B3", "B4"], enfrentamiento: ["B Witt Jr (KAN)", "L Garcia (WAS)"], jcMl: ["-140", "-145"], isGrey: true },
  { hora: "6:45PM", codigos: ["B9", "B10"], enfrentamiento: ["S Marte (KAN)", "D Crews (WAS)"], jcMl: ["-130", "-140"], isGrey: true },
  { hora: "7:10PM", codigos: ["B35", "B36"], enfrentamiento: ["J Soto (NYM)", "S Stewart (CIN)"], jcMl: ["-150", "-130"], isGrey: true },
  { hora: "7:45PM", codigos: ["B21", "B22"], enfrentamiento: ["F Tatis JR.(SDG)", "JJ Wetherholt (STL)"], jcMl: ["-145", "-140"], isGrey: true },
  { hora: "7:45PM", codigos: ["B27", "B28"], enfrentamiento: ["G Sheets (SDG)", "J Walker(STL)"], jcMl: ["-130", "-160"], isGrey: true },
  { hora: "8:05PM", codigos: ["B13", "B14"], enfrentamiento: ["B Buxton (MIN)", "J Jung (TEX)"], jcMl: ["-155", "-150"], isGrey: true },
  { hora: "8:05PM", codigos: ["B19", "B20"], enfrentamiento: ["J Bell (MIN)", "J Burger (TEX)"], jcMl: ["-130", "-140"], isGrey: true },
  { hora: "8:10PM", codigos: ["B55", "B56"], enfrentamiento: ["K Carpenter (DET)", "C Walker (HOU)"], jcMl: ["-130", "-145"], isGrey: true },

  // Columna 2
  { hora: "6:40PM", codigos: ["B43", "B44"], enfrentamiento: ["O Lopez (MIA)", "T Turner (PHI)"], jcMl: ["-150", "-160"], isGrey: false },
  { hora: "6:40PM", codigos: ["B49", "B50"], enfrentamiento: ["H Hernandez (MIA)", "B Stott (PHI)"], jcMl: ["-130", "-160"], isGrey: false },
  { hora: "6:45PM", codigos: ["B5", "B6"], enfrentamiento: ["J Caglianone (KAN)", "C Mead (WAS)"], jcMl: ["-140", "-150"], isGrey: false },
  { hora: "7:10PM", codigos: ["B31", "B32"], enfrentamiento: ["C Benge (NYM)", "B Dunn (CIN)"], jcMl: ["-150", "-130"], isGrey: false },
  { hora: "7:10PM", codigos: ["B37", "B38"], enfrentamiento: ["J Young (NYM)", "S Steer (CIN)"], jcMl: ["-140", "-145"], isGrey: false },
  { hora: "7:45PM", codigos: ["B23", "B24"], enfrentamiento: ["J Merrill (SDG)", "I Herrera (STL)"], jcMl: ["-130", "-145"], isGrey: false },
  { hora: "7:45PM", codigos: ["B29", "B30"], enfrentamiento: ["X Bogaerts (SDG)", "L Nootbaar (STL)"], jcMl: ["-145", "-140"], isGrey: false },
  { hora: "8:05PM", codigos: ["B15", "B16"], enfrentamiento: ["K Clemens (MIN)", "W Langford (TEX)"], jcMl: ["-145", "-130"], isGrey: false },
  { hora: "8:10PM", codigos: ["B51", "B52"], enfrentamiento: ["K Mcgonigle (DET)", "J Pena (HOU)"], jcMl: ["-140", "-130"], isGrey: false },
  { hora: "8:10PM", codigos: ["B57", "B58"], enfrentamiento: ["R Greene (DET)", "I Paredes (HOU)"], jcMl: ["-145", "-130"], isGrey: false },

  // Columna 3
  { hora: "6:40PM", codigos: ["B45", "B46"], enfrentamiento: ["K Stowers (MIA)", "B Harper (PHI)"], jcMl: ["-130", "-170"], isGrey: true },
  { hora: "6:45PM", codigos: ["B1", "B2"], enfrentamiento: ["L Thomas (KAN)", "J Wood (WAS)"], jcMl: ["-140", "-170"], isGrey: true },
  { hora: "6:45PM", codigos: ["B7", "B8"], enfrentamiento: ["M Garcia (KAN)", "CJ Abrams (WAS)"], jcMl: ["-140", "-150"], isGrey: true },
  { hora: "7:10PM", codigos: ["B33", "B34"], enfrentamiento: ["B Bichette (NYM)", "J Bleday (CIN)"], jcMl: ["-130", "-140"], isGrey: true },
  { hora: "7:10PM", codigos: ["B39", "B40"], enfrentamiento: ["A.J. Ewing(NYM)", "E Suarez (CIN)"], jcMl: ["-140", "-130"], isGrey: true },
  { hora: "7:45PM", codigos: ["B25", "B26"], enfrentamiento: ["M Machado (SDG)", "A Burleson(STL)"], jcMl: ["-140", "-155"], isGrey: true },
  { hora: "8:05PM", codigos: ["B11", "B12"], enfrentamiento: ["A Martin(MIN)", "J Pederson (TEX)"], jcMl: ["-130", "-140"], isGrey: true },
  { hora: "8:05PM", codigos: ["B17", "B18"], enfrentamiento: ["R Lewis (MIN)", "B Nimmo (TEX)"], jcMl: ["-130", "-140"], isGrey: true },
  { hora: "8:10PM", codigos: ["B53", "B54"], enfrentamiento: ["G Torres (DET)", "Y Alvarez (HOU)"], jcMl: ["-130", "-165"], isGrey: true },
  { hora: "8:10PM", codigos: ["B59", "B60"], enfrentamiento: ["D Dingler (DET)", "J Altuve (HOU)"], jcMl: ["-145", "-130"], isGrey: true }
];

const mlbPeriodosData = [
  // Fila 1 (Miami / Philly)
  {
    hora: "6:40PM",
    codigos: ["4028", "4015"],
    equipos: ["Miami (R Gusto 4.0)", "Philadelphia (Z Wheeler 6.5)"],
    ml: ["+140", "-170"],
    mlCalc: ["+140", "-170"],
    rlTotal: "2½ u130",
    rlTotalCalc: "2½ u130",
    sino: ["-105", "-125"],
    sinoCalc: ["-105", "-125"],
    isGrey: true
  },
  // Fila 2 (Kansas / Wash)
  {
    hora: "6:45PM",
    codigos: ["4006", "4019"],
    equipos: ["Kansas (M Spence 3.0)", "Washington (A Alvarez 4.0)"],
    ml: ["+100", "-130"],
    mlCalc: ["+100", "-130"],
    rlTotal: "3 o130",
    rlTotalCalc: "3 o130",
    sino: ["-130", "+100"],
    sinoCalc: ["-120", "+100"], // Mismatch intencional para demo
    isGrey: false
  },
  // Fila 3 (Mets / Cincy)
  {
    hora: "7:10PM",
    codigos: ["4018", "4024"],
    equipos: ["Mets (T Myers )", "Cincinnati (C Burns 7.5)"],
    ml: ["+105", "-135"],
    mlCalc: ["+105", "-135"],
    rlTotal: "2½ u130",
    rlTotalCalc: "2½ u130",
    sino: ["-105", "-125"],
    sinoCalc: ["-105", "-125"],
    isGrey: true
  },
  // Fila 4 (SanDiego / STL)
  {
    hora: "7:45PM",
    codigos: ["4026", "4016"],
    equipos: ["SanDiego (U UNDECIDED )", "STL Cardinals (D May 5.0)"],
    ml: ["+115", "-145"],
    mlCalc: ["+125", "-145"], // Mismatch intencional para demo
    rlTotal: "2½ o135",
    rlTotalCalc: "2½ o135",
    sino: ["-120", "-120"],
    sinoCalc: ["-120", "-120"],
    isGrey: false
  },
  // Fila 5 (Min / Texas)
  {
    hora: "8:05PM",
    codigos: ["4007", "4004"],
    equipos: ["Minnesota (U UNDECIDED )", "Texas (M Gore 5.5)"],
    ml: ["+105", "-135"],
    mlCalc: ["+105", "-135"],
    rlTotal: "2½ u115",
    rlTotalCalc: "3 u115", // Mismatch intencional para demo
    sino: ["-110", "-120"],
    sinoCalc: ["-110", "-120"],
    isGrey: true
  },
  // Fila 6 (Colo / Cubs)
  {
    hora: "8:05PM",
    codigos: ["4027", "4023"],
    equipos: ["Colorado (M Lorenzen 4.0)", "Cubs (S Imanaga 6.0)"],
    ml: ["+140", "-170"],
    mlCalc: ["+140", "-170"],
    rlTotal: "3 o130",
    rlTotalCalc: "3 o130",
    sino: ["-130", "+100"],
    sinoCalc: ["-130", "+100"],
    isGrey: false
  },
  // Fila 7 (Det / Hou)
  {
    hora: "8:10PM",
    codigos: ["4012", "4020"],
    equipos: ["Detroit (T Melton 4.0)", "Houston (K Teng 5.0)"],
    ml: ["-115", "-115"],
    mlCalc: ["-115", "-115"],
    rlTotal: "2½ o140",
    rlTotalCalc: "2½ o140",
    sino: ["-120", "-120"],
    sinoCalc: ["-120", "-120"],
    isGrey: true
  },
  // Fila 8 (Angels / Ari)
  {
    hora: "9:40PM",
    codigos: ["4011", "4030"],
    equipos: ["Angels (W Urena 4.0)", "Arizona (R Nelson 4.5)"],
    ml: ["-115", "-115"],
    mlCalc: ["-115", "-115"],
    rlTotal: "3 u130",
    rlTotalCalc: "3 u130",
    sino: ["-120", "-120"],
    sinoCalc: ["-120", "-120"],
    isGrey: false
  },
  // Fila 9 (Pitt / Ath)
  {
    hora: "9:40PM",
    codigos: ["4017", "4014"],
    equipos: ["Pittsburgh (J Jones 4.5)", "Athletics (J Ginn 4.5)"],
    ml: ["-115", "-115"],
    mlCalc: ["-115", "-115"],
    rlTotal: "3½ o130",
    rlTotalCalc: "3½ o130",
    sino: ["-155", "+125"],
    sinoCalc: ["-155", "+125"],
    isGrey: true
  },
  // Fila 10 (Tampa / Dodgers)
  {
    hora: "10:10PM",
    codigos: ["4029", "4021"],
    equipos: ["Tampa (N Martinez 3.5)", "Dodgers (E Lauer 3.5)"],
    ml: ["+115", "-145"],
    mlCalc: ["+115", "-145"],
    rlTotal: "3 o130",
    rlTotalCalc: "3 o130",
    sino: ["-130", "+100"],
    sinoCalc: ["-130", "+100"],
    isGrey: false
  }
];

const baseballData = [
  {
    liga: "College<br>7:00PM",
    codigos: ["7005", "7006"],
    equipos: ["Georgia", "Oklahoma"],
    ml: ["-235", "+190"],
    rl: ["-2½ -115", "+2½ -105"],
    total: "12½ -110",
    isGrey: true
  },
  {
    liga: "Japan<br>11:55PM",
    codigos: ["7009", "7010"],
    equipos: ["Seibu Lions", "Hanshin Tigers"],
    ml: ["+115", "-135"],
    rl: ["+1½ -210", "-1½ +175"],
    total: "6 -110",
    isGrey: false
  },
  {
    liga: "Japan<br>11:55PM",
    codigos: ["7011", "7012"],
    equipos: ["Nippon Ham Fighters", "Hiroshima Carp"],
    ml: ["-185", "+155"],
    rl: ["-1½ +105", "+1½ -125"],
    total: "6½ u125",
    isGrey: true
  },
  {
    liga: "S Korea<br>11:55PM",
    codigos: ["7013", "7014"],
    equipos: ["Kiwoom Heroes", "Samsung Lions"],
    ml: ["+240", "-300"],
    rl: ["+1½ +135", "-1½ -160"],
    total: "10½ -110",
    isGrey: false
  },
  {
    liga: "S Korea<br>11:55PM",
    codigos: ["7015", "7016"],
    equipos: ["LG Twins", "KIA Tigers"],
    ml: ["-190", "+160"],
    rl: ["-1½ -125", "+1½ +105"],
    total: "9½ -110",
    isGrey: true
  }
];

const wnbaData = [
  {
    liga: "WNBA<br>8:00PM",
    codigos: ["2052", "2047"],
    equipos: ["Las Vegas Aces", "Dallas Wings"],
    ml: ["&nbsp;", "&nbsp;"],
    rl: ["-3 -115", "177½"],
    total: ["90½", "87"],
    hMl: ["&nbsp;", "&nbsp;"],
    hRl: ["-1½", "86½ o115"],
    hTotal: ["44", "42½"],
    q1Ml: ["&nbsp;", "&nbsp;"],
    q1Rl: ["-1", "43½ o115"],
    q1Total: ["22½", "21"],
    isGrey: true
  },
  {
    liga: "WNBA<br>8:00PM",
    codigos: ["2065", "2048"],
    equipos: ["Portland Fire", "Min Lynx"],
    ml: ["&nbsp;", "&nbsp;"],
    rl: ["168½", "-14½"],
    total: ["77", "91½"],
    hMl: ["+350", "-450"],
    hRl: ["86 o115", "-8 -105"],
    hTotal: ["39", "47"],
    q1Ml: ["&nbsp;", "&nbsp;"],
    q1Rl: ["43½ o115", "-4½ -105"],
    q1Total: ["19½", "24"],
    isGrey: false
  }
];

const soccerData = [
  {
    hora: "6:00PM",
    codigos: ["7037", "7038"],
    equipos: ["Uruguay", "Saudi Arabia"],
    ml: ["-213", "+675"],
    rl: ["-1 -120", "2½ u135"],
    empate: "+323",
    isGrey: true
  },
  {
    hora: "8:00PM",
    codigos: ["7041", "7042"],
    equipos: ["Avai", "Londrina"],
    ml: ["+217", "+150"],
    rl: ["2 o130", "&nbsp;"],
    empate: "+202",
    isGrey: true
  },
  {
    hora: "8:00PM",
    codigos: ["7039", "7040"],
    equipos: ["Ceara", "Criciuma"],
    ml: ["+343", "-102"],
    rl: ["2 o125", "&nbsp;"],
    empate: "+219",
    isGrey: false
  },
  {
    hora: "9:00PM",
    codigos: ["7043", "7044"],
    equipos: ["New Zealand", "Iran"],
    ml: ["+404", "-130"],
    rl: ["2 o125", "&nbsp;"],
    empate: "+257",
    isGrey: false
  }
];

const propuestasMlbData = [
  { hora: "6:40PM", codigos: ["4028", "4015"], equipos: ["Miami", "Philadelphia"], hits: ["-130", "15½ -130"], hce: ["-130", "2½ -135"], isGrey: true },
  { hora: "6:45PM", codigos: ["4006", "4019"], equipos: ["Kansas", "Washington"], hits: ["-130", "17½ -130"], hce: ["-130", "2½ -130"], isGrey: false },
  { hora: "7:10PM", codigos: ["4018", "4024"], equipos: ["Mets", "Cincinnati"], hits: ["-130", "14½ -130"], hce: ["-130", "2½ -135"], isGrey: true },
  { hora: "7:45PM", codigos: ["4026", "4016"], equipos: ["SanDiego", "STL Cardinals"], hits: ["-130", "16½ -135"], hce: ["-130", "2½ -130"], isGrey: false }
];

// ==========================================
// 2. DETECCIÓN AUTOMÁTICA DE FAVORITO (LÍNEA NEGATIVA)
// ==========================================
function getFavoriteMarkup(team1, team2, ml1, ml2) {
  const v1 = parseInt(ml1.replace(/[+-]/g, ""), 10) || 0;
  const v2 = parseInt(ml2.replace(/[+-]/g, ""), 10) || 0;
  
  const is1Neg = ml1.startsWith("-");
  const is2Neg = ml2.startsWith("-");

  let t1Fav = false;
  let t2Fav = false;

  if (is1Neg && !is2Neg) t1Fav = true;
  else if (is2Neg && !is1Neg) t2Fav = true;
  else if (is1Neg && is2Neg) {
    if (v1 >= v2) t1Fav = true;
    else t2Fav = true;
  }

  const team1Fmt = t1Fav ? `<span class="highlight-team">${team1}</span>` : `<span>${team1}</span>`;
  const team2Fmt = t2Fav ? `<span class="highlight-team">${team2}</span>` : `<span>${team2}</span>`;

  return `${team1Fmt}<br>${team2Fmt}`;
}

// ==========================================
// 3. COMPARADORES PARA DISCREPANCIAS
// ==========================================
function checkCell(feedVal, calcVal, isMlType = false) {
  if (feedVal === undefined || feedVal === null || feedVal === "") return "--";
  if (calcVal === undefined || calcVal === null || calcVal === "") return feedVal;

  let isMismatch = false;

  if (isMlType) {
    // Para Money Lines (PA, Tercio ML, SI/NO), permitimos hasta 5 unidades de diferencia en el juice
    const fInt = parseInt(feedVal.replace(/[+-]/g, ""), 10) || 0;
    const cInt = parseInt(calcVal.replace(/[+-]/g, ""), 10) || 0;
    const fSign = feedVal.startsWith("-") ? -1 : 1;
    const cSign = calcVal.startsWith("-") ? -1 : 1;
    isMismatch = Math.abs((fInt * fSign) - (cInt * cSign)) > 5;
  } else {
    // Para SOLO y O/U, comparación estricta quitando espacios y normalizando ½
    const fNorm = feedVal.toString().replace(/\s+/g, "").replace(/½/g, ".5");
    const cNorm = calcVal.toString().replace(/\s+/g, "").replace(/½/g, ".5");
    isMismatch = fNorm !== cNorm;
  }

  if (isMismatch) {
    return `<div class="cell-discrepancy">${feedVal}<span class="cell-discrepancy-calc">(Calc: ${calcVal})</span></div>`;
  }
  return feedVal;
}

// ==========================================
// 4. FUNCIONES DE RENDERIZADO GENERAL
// ==========================================

// Renderiza tablas de ancho completo (como MLB, Baseball, WNBA y Propuestas)
function renderMainBoard(containerId, sectionTitle, data, sportType) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = `
    <div class="original-lines-sheet">
      <table class="section-table">
        <tbody>
  `;

  if (sportType === "MLB") {
    html += `
      <tr class="primera">
        <th colspan="3" class="liga borde" style="color: var(--color-red);">${sectionTitle}</th>
        <th colspan="8" class="borde">JUEGO COMPLETO</th>
        <th colspan="3" class="borde">MITAD</th>
      </tr>
      <tr class="segunda">
        <th class="liga">Liga</th>
        <th class="borde team" colspan="2">CODIGO EQUIPOS</th>
        <th class="borde">ML</th>
        <th>RL</th>
        <th>TOTAL</th>
        <th>SRL</th>
        <th>RA</th>
        <th>SOLO</th>
        <th>HCE</th>
        <th>PA</th>
        <th class="borde">ML</th>
        <th>RL</th>
        <th>TOTAL</th>
        <th></th>
      </tr>
    `;

    data.forEach(item => {
      const rowClass = item.isGrey ? "row-grey" : "row-blue";
      const teamMarkup = getFavoriteMarkup(item.equipos[0], item.equipos[1], item.ml[0], item.ml[1]);
      
      const soloVisitCell = checkCell(item.solo[0], item.soloCalc[0]);
      const soloCasaCell = checkCell(item.solo[1], item.soloCalc[1]);
      
      const paVisitCell = checkCell(item.pa[0], item.paCalc[0], true);
      const paCasaCell = checkCell(item.pa[1], item.paCalc[1], true);

      html += `
        <tr class="${rowClass}">
          <td class="liga">${item.hora}</td>
          <td>${item.codigos[0]}<br>${item.codigos[1]}</td>
          <td class="team">${teamMarkup}</td>
          <td class="odds-cell">${item.ml[0]}<br>${item.ml[1]}</td>
          <td class="alt-cell odds-cell">${item.rl[0]}<br>${item.rl[1]}</td>
          <td class="odds-cell">${item.total}</td>
          <td class="alt-cell odds-cell">${item.srl[0]}<br>${item.srl[1]}</td>
          <td class="odds-cell">${item.ra[0]}<br>${item.ra[1]}</td>
          <td class="alt-cell odds-cell">${soloVisitCell}<br>${soloCasaCell}</td>
          <td class="odds-cell">${item.hce}</td>
          <td class="alt-cell odds-cell">${paVisitCell}<br>${paCasaCell}</td>
          <td class="odds-cell">${item.mitadMl[0]}<br>${item.mitadMl[1]}</td>
          <td class="alt-cell odds-cell">${item.mitadRl[0]}<br>${item.mitadRl[1]}</td>
          <td class="odds-cell">${item.mitadTotal}</td>
          <td><br></td>
        </tr>
      `;
    });
  } else if (sportType === "BASEBALL") {
    html += `
      <tr class="primera">
        <th colspan="3" class="liga borde" style="color: var(--color-red);">${sectionTitle}</th>
        <th colspan="8" class="borde">JUEGO COMPLETO</th>
        <th colspan="3" class="borde">MITAD</th>
        <th colspan="2" class="borde">1ER TERCIO</th>
        <th colspan="1" class="borde">1ER INN</th>
        <th></th>
      </tr>
      <tr class="segunda">
        <th class="liga">Liga</th>
        <th class="borde team" colspan="2">CODIGO EQUIPOS</th>
        <th class="borde">ML</th>
        <th>RL</th>
        <th>TOTAL</th>
        <th>SRL</th>
        <th>RA</th>
        <th>SOLO</th>
        <th>HCE</th>
        <th>PA</th>
        <th class="borde">ML</th>
        <th>RL</th>
        <th>TOTAL</th>
        <th class="borde">ML</th>
        <th>RL/TOTAL</th>
        <th class="borde">SI / NO</th>
        <th></th>
      </tr>
    `;

    data.forEach(item => {
      const rowClass = item.isGrey ? "row-grey" : "row-blue";
      const teamMarkup = getFavoriteMarkup(item.equipos[0], item.equipos[1], item.ml[0], item.ml[1]);

      html += `
        <tr class="${rowClass}">
          <td class="liga">${item.liga}</td>
          <td>${item.codigos[0]}<br>${item.codigos[1]}</td>
          <td class="team">${teamMarkup}</td>
          <td class="odds-cell">${item.ml[0]}<br>${item.ml[1]}</td>
          <td class="alt-cell odds-cell">${item.rl[0]}<br>${item.rl[1]}</td>
          <td class="odds-cell">${item.total}</td>
          <td class="alt-cell">&nbsp;<br>&nbsp;</td>
          <td>&nbsp;<br>&nbsp;</td>
          <td class="alt-cell">&nbsp;<br>&nbsp;</td>
          <td>&nbsp;</td>
          <td class="alt-cell">&nbsp;<br>&nbsp;</td>
          <td>&nbsp;<br>&nbsp;</td>
          <td class="alt-cell">&nbsp;<br>&nbsp;</td>
          <td>&nbsp;</td>
          <td class="alt-cell">&nbsp;<br>&nbsp;</td>
          <td>&nbsp;<br>&nbsp;</td>
          <td class="alt-cell">&nbsp;<br>&nbsp;</td>
          <td><br></td>
        </tr>
      `;
    });
  } else if (sportType === "WNBA") {
    html += `
      <tr class="primera">
        <th colspan="3" class="liga borde" style="color: var(--color-red);">${sectionTitle}</th>
        <th colspan="3" class="borde">JUEGO COMPLETO</th>
        <th colspan="3" class="borde">MITAD</th>
        <th colspan="3" class="borde">1ER CUARTO</th>
        <th colspan="2" class="borde">2DO CUARTO</th>
        <th></th>
      </tr>
      <tr class="segunda">
        <th class="liga">Liga</th>
        <th class="borde team" colspan="2">CODIGO EQUIPOS</th>
        <th class="borde">JC-ML</th>
        <th>JC-RL</th>
        <th>JC-SL</th>
        <th class="borde">H-ML</th>
        <th>H-RL</th>
        <th>H-SL</th>
        <th class="borde">Q1-ML</th>
        <th>Q1-RL</th>
        <th>Q1-SL</th>
        <th class="borde">Q2-RL</th>
        <th>Q2-SL</th>
        <th></th>
      </tr>
    `;

    data.forEach(item => {
      const rowClass = item.isGrey ? "row-grey" : "row-blue";
      const teamMarkup = getFavoriteMarkup(item.equipos[0], item.equipos[1], "+100", "-100"); // Simulado

      html += `
        <tr class="${rowClass}">
          <td class="liga">${item.liga}</td>
          <td>${item.codigos[0]}<br>${item.codigos[1]}</td>
          <td class="team">${teamMarkup}</td>
          <td class="odds-cell">${item.ml[0]}<br>${item.ml[1]}</td>
          <td class="alt-cell odds-cell">${item.rl[0]}<br>${item.rl[1]}</td>
          <td class="odds-cell">${item.total[0]}<br>${item.total[1]}</td>
          <td class="odds-cell">${item.hMl[0]}<br>${item.hMl[1]}</td>
          <td class="alt-cell odds-cell">${item.hRl[0]}<br>${item.hRl[1]}</td>
          <td class="odds-cell">${item.hTotal[0]}<br>${item.hTotal[1]}</td>
          <td class="odds-cell">${item.q1Ml[0]}<br>${item.q1Ml[1]}</td>
          <td class="alt-cell odds-cell">${item.q1Rl[0]}<br>${item.q1Rl[1]}</td>
          <td class="odds-cell">${item.q1Total[0]}<br>${item.q1Total[1]}</td>
          <td class="alt-cell">&nbsp;<br>&nbsp;</td>
          <td>&nbsp;<br>&nbsp;</td>
          <td><br></td>
        </tr>
      `;
    });
  } else if (sportType === "PROPUESTAS") {
    html += `
      <tr class="primera">
        <th colspan="3" class="liga borde" style="color: var(--color-red);">${sectionTitle}</th>
        <th colspan="1">193</th>
        <th colspan="1">194</th>
        <th colspan="1"></th>
        <th colspan="1"></th>
        <th colspan="1"></th>
        <th colspan="1"></th>
      </tr>
      <tr class="segunda">
        <th class="borde">HORA</th>
        <th class="borde team" colspan="2">CODIGO JUGADOR</th>
        <th>JC Total Hits</th>
        <th>1er Inning HCE</th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
        <th></th>
      </tr>
    `;

    data.forEach(item => {
      const rowClass = item.isGrey ? "row-grey" : "row-blue";
      
      html += `
        <tr class="${rowClass}">
          <td>${item.hora}</td>
          <td>${item.codigos[0]}<br>${item.codigos[1]}</td>
          <td class="team"><span class="highlight-team">${item.equipos[0]}</span><br>${item.equipos[1]}</td>
          <td class="odds-cell">${item.hits[0]}<br>${item.hits[1]}</td>
          <td class="alt-cell odds-cell">${item.hce[0]}<br>${item.hce[1]}</td>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      `;
    });
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

// Renderiza secciones divididas de 2 o 3 columnas (Bases Alcanzadas, MLB Periodos, Soccer)
function renderSplitSection(containerId, sectionTitle, data, columnsCount, sectionType) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = `<div class="section-title">${sectionTitle}</div>`;
  html += `<div class="split-container-${columnsCount}">`;

  // Dividir los datos en columnas de forma alternada o por cortes
  const columnsData = Array.from({ length: columnsCount }, () => []);
  
  if (columnsCount === 3) {
    // Bases Alcanzadas: corte tradicional (10 por columna)
    columnsData[0] = data.slice(0, 10);
    columnsData[1] = data.slice(10, 20);
    columnsData[2] = data.slice(20, 30);
  } else if (columnsCount === 2) {
    // MLB Periodos o Soccer: alternando índices para simular orden cronológico interleaved
    data.forEach((item, idx) => {
      columnsData[idx % 2].push(item);
    });
  }

  columnsData.forEach((colData, colIdx) => {
    let colHtml = `
      <div class="split-${columnsCount} original-lines-sheet" style="padding:0;">
        <table class="section-table">
          <tbody>
    `;

    if (sectionType === "BASES_ALCANZADAS") {
      colHtml += `
        <tr class="primera">
          <th colspan="3" class="liga borde" style="color: var(--color-red); font-size:1.1rem;">BASESALCANZADAS</th>
          <th colspan="2" class="borde"></th>
        </tr>
        <tr class="segunda">
          <th class="liga">Hora</th>
          <th class="borde team" colspan="2">Enfrentamientos</th>
          <th class="borde">JC-ML</th>
          <th class="borde"></th>
        </tr>
      `;

      colData.forEach(item => {
        const rowClass = item.isGrey ? "row-grey" : "row-blue";
        const playerMarkup = getFavoriteMarkup(item.enfrentamiento[0], item.enfrentamiento[1], item.jcMl[0], item.jcMl[1]);
        
        colHtml += `
          <tr class="${rowClass}">
            <td class="liga">${item.hora}</td>
            <td>${item.codigos[0]}<br>${item.codigos[1]}</td>
            <td class="team">${playerMarkup}</td>
            <td class="odds-cell">${item.jcMl[0]}<br>${item.jcMl[1]}</td>
            <td></td>
          </tr>
        `;
      });
    } else if (sectionType === "MLB_PERIODOS") {
      colHtml += `
        <tr class="primera">
          <th colspan="3" class="liga borde" style="color: var(--color-red); font-size:1.1rem;">MLB PERIODOS</th>
          <th colspan="2" class="borde">1ER TERCIO</th>
          <th colspan="1" class="borde">1ER INN</th>
        </tr>
        <tr class="segunda">
          <th class="liga">Hora</th>
          <th class="borde team" colspan="2">CODIGO EQUIPOS</th>
          <th class="borde">ML</th>
          <th>RL/TOTAL</th>
          <th class="borde">SI / NO</th>
          <th></th>
        </tr>
      `;

      colData.forEach(item => {
        const rowClass = item.isGrey ? "row-grey" : "row-blue";
        const teamMarkup = getFavoriteMarkup(item.equipos[0], item.equipos[1], item.ml[0], item.ml[1]);

        // Celdas de discrepancia
        const mlVCell = checkCell(item.ml[0], item.mlCalc[0], true);
        const mlCCell = checkCell(item.ml[1], item.mlCalc[1], true);

        // Tercio O/U
        const isOuMismatch = item.rlTotal !== item.rlTotalCalc;
        const rlTotalCell = isOuMismatch 
          ? `<div class="cell-discrepancy">${item.rlTotal}<span class="cell-discrepancy-calc">(Calc: ${item.rlTotalCalc})</span></div>`
          : item.rlTotal;

        // SiNo
        const sinoSiCell = checkCell(item.sino[0], item.sinoCalc[0], true);
        const sinoNoCell = checkCell(item.sino[1], item.sinoCalc[1], true);

        colHtml += `
          <tr class="${rowClass}">
            <td class="liga">${item.hora}</td>
            <td>${item.codigos[0]}<br>${item.codigos[1]}</td>
            <td class="team">${teamMarkup}</td>
            <td class="odds-cell">${mlVCell}<br>${mlCCell}</td>
            <td class="alt-cell odds-cell">${rlTotalCell}<br>&nbsp;</td>
            <td class="odds-cell">${sinoSiCell}<br>${sinoNoCell}</td>
            <td><br></td>
          </tr>
        `;
      });
    } else if (sectionType === "SOCCER") {
      colHtml += `
        <tr class="primera">
          <th colspan="3" class="liga borde" style="color: var(--color-red); font-size:1.1rem;">SOCCER</th>
          <th colspan="3" class="borde">JUEGO COMPLETO</th>
        </tr>
        <tr class="segunda">
          <th class="liga">Hora</th>
          <th class="borde team" colspan="2">CODIGO EQUIPOS</th>
          <th class="borde">JC-ML</th>
          <th>JC-RL</th>
          <th class="borde">EMPATE</th>
        </tr>
      `;

      colData.forEach(item => {
        const rowClass = item.isGrey ? "row-grey" : "row-blue";
        const teamMarkup = getFavoriteMarkup(item.equipos[0], item.equipos[1], item.ml[0], item.ml[1]);

        colHtml += `
          <tr class="${rowClass}">
            <td class="liga">${item.hora}</td>
            <td>${item.codigos[0]}<br>${item.codigos[1]}</td>
            <td class="team">${teamMarkup}</td>
            <td class="odds-cell">${item.ml[0]}<br>${item.ml[1]}</td>
            <td class="alt-cell odds-cell">${item.rl[0]}<br>${item.rl[1]}</td>
            <td class="odds-cell">${item.empate}</td>
          </tr>
        `;
      });
    }

    colHtml += `
          </tbody>
        </table>
      </div>
    `;
    html += colHtml;
  });

  html += `</div>`; // split-container
  container.innerHTML = html;
}

// ==========================================
// 5. INICIALIZACIÓN Y RELOJ
// ==========================================

function updateClock() {
  const clockEl = document.getElementById("board-clock");
  if (!clockEl) return;

  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const meridiem = hours >= 12 ? "PM" : "AM";
  
  hours = hours % 12;
  hours = hours ? hours : 12; // el número 0 se convierte en 12
  const hoursStr = String(hours).padStart(2, '0');

  clockEl.innerText = `${hoursStr}:${minutes}:${seconds} ${meridiem}`;
}

window.onload = function() {
  // Renderizar todas las secciones
  renderMainBoard("section-mlb", "MLB - 10 enfrentamientos", mlbData, "MLB");
  renderSplitSection("section-bases-alcanzadas", "BASESALCANZADAS - 30 enfrentamientos", basesAlcanzadasData, 3, "BASES_ALCANZADAS");
  renderSplitSection("section-mlb-periodos", "MLB PERIODOS - 10 enfrentamientos", mlbPeriodosData, 2, "MLB_PERIODOS");
  renderMainBoard("section-baseball", "BASEBALL - 10 enfrentamientos", baseballData, "BASEBALL");
  renderMainBoard("section-wnba", "WNBA - 3 enfrentamientos", wnbaData, "WNBA");
  renderSplitSection("section-soccer", "SOCCER - 4 enfrentamientos", soccerData, 2, "SOCCER");
  renderMainBoard("section-propuestas", "PROPUESTASMLB - 10 enfrentamientos", propuestasMlbData, "PROPUESTAS");

  // Iniciar reloj
  updateClock();
  setInterval(updateClock, 1000);
};

// ==========================================
// 6. PLANTILLA PARA INTEGRACIÓN CON API
// ==========================================
/**
 * Para conectar este monitor deportivo a un backend real (GET /api/sports-lines),
 * puedes utilizar el siguiente código:
 * 
 * async function loadSportsLines() {
 *   try {
 *     const response = await fetch('/api/sports-lines');
 *     if (!response.ok) throw new Error('Error de red');
 *     
 *     const data = await response.json();
 *     
 *     // Asumiendo que el backend retorna un objeto con llaves para cada deporte/sección:
 *     if (data.mlb) {
 *       renderMainBoard("section-mlb", `MLB - ${data.mlb.length} enfrentamientos`, data.mlb, "MLB");
 *     }
 *     if (data.basesAlcanzadas) {
 *       renderSplitSection("section-bases-alcanzadas", `BASESALCANZADAS - ${data.basesAlcanzadas.length} enfrentamientos`, data.basesAlcanzadas, 3, "BASES_ALCANZADAS");
 *     }
 *     if (data.mlbPeriodos) {
 *       renderSplitSection("section-mlb-periodos", `MLB PERIODOS - ${data.mlbPeriodos.length} enfrentamientos`, data.mlbPeriodos, 2, "MLB_PERIODOS");
 *     }
 *     // ... renderizar los demás deportes ...
 *     
 *   } catch (error) {
 *     console.error("No se pudieron cargar las líneas deportivas:", error);
 *   }
 * }
 * 
 * // Y llamarlo dentro del window.onload en lugar de usar los arrays locales.
 */
