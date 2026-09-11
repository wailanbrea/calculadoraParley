import React, { useState, useEffect, useMemo } from 'react';

// Catálogo completo de equipos MLB con códigos y alias de búsqueda
export const MLB_TEAMS = [
  { code: 'ARI', name: 'Arizona Diamondbacks', short: 'Diamondbacks', aliases: ['ari', 'arizona', 'diamondbacks', 'd-backs', 'dbacks'] },
  { code: 'ATL', name: 'Atlanta Braves', short: 'Braves', aliases: ['atl', 'atlantabraves', 'atlanta', 'braves'] },
  { code: 'BAL', name: 'Baltimore Orioles', short: 'Orioles', aliases: ['bal', 'baltimore', 'orioles', 'os'] },
  { code: 'BOS', name: 'Boston Red Sox', short: 'Red Sox', aliases: ['bos', 'boston', 'red sox', 'redsox'] },
  { code: 'CHC', name: 'Chicago Cubs', short: 'Cubs', aliases: ['chc', 'cubs', 'chicago cubs'] },
  { code: 'CWS', name: 'Chicago White Sox', short: 'White Sox', aliases: ['cws', 'chw', 'white sox', 'whitesox', 'chicago white sox'] },
  { code: 'CIN', name: 'Cincinnati Reds', short: 'Reds', aliases: ['cin', 'cincinnati', 'reds'] },
  { code: 'CLE', name: 'Cleveland Guardians', short: 'Guardians', aliases: ['cle', 'cleveland', 'guardians', 'indians'] },
  { code: 'COL', name: 'Colorado Rockies', short: 'Rockies', aliases: ['col', 'colorado', 'rockies'] },
  { code: 'DET', name: 'Detroit Tigers', short: 'Tigers', aliases: ['det', 'detroit', 'tigers'] },
  { code: 'HOU', name: 'Houston Astros', short: 'Astros', aliases: ['hou', 'houston', 'astros'] },
  { code: 'KC',  name: 'Kansas City Royals', short: 'Royals', aliases: ['kc', 'kcr', 'kansas city', 'kansas', 'royals'] },
  { code: 'LAA', name: 'Los Angeles Angels', short: 'Angels', aliases: ['laa', 'ana', 'angels', 'los angeles angels'] },
  { code: 'LAD', name: 'Los Angeles Dodgers', short: 'Dodgers', aliases: ['lad', 'la', 'dodgers', 'los angeles dodgers'] },
  { code: 'MIA', name: 'Miami Marlins', short: 'Marlins', aliases: ['mia', 'miami', 'marlins'] },
  { code: 'MIL', name: 'Milwaukee Brewers', short: 'Brewers', aliases: ['mil', 'milwaukee', 'brewers'] },
  { code: 'MIN', name: 'Minnesota Twins', short: 'Twins', aliases: ['min', 'minnesota', 'twins'] },
  { code: 'NYM', name: 'New York Mets', short: 'Mets', aliases: ['nym', 'mets', 'new york mets', 'ny mets'] },
  { code: 'NYY', name: 'New York Yankees', short: 'Yankees', aliases: ['nyy', 'yankees', 'new york yankees', 'ny yankees'] },
  { code: 'OAK', name: 'Oakland Athletics', short: 'Athletics', aliases: ['oak', 'ath', 'athletics', 'oakland', 'as'] },
  { code: 'PHI', name: 'Philadelphia Phillies', short: 'Phillies', aliases: ['phi', 'philadelphia', 'phillies'] },
  { code: 'PIT', name: 'Pittsburgh Pirates', short: 'Pirates', aliases: ['pit', 'pittsburgh', 'pirates'] },
  { code: 'SD',  name: 'San Diego Padres', short: 'Padres', aliases: ['sd', 'sdp', 'san diego', 'padres'] },
  { code: 'SF',  name: 'San Francisco Giants', short: 'Giants', aliases: ['sf', 'sfg', 'san francisco', 'giants'] },
  { code: 'SEA', name: 'Seattle Mariners', short: 'Mariners', aliases: ['sea', 'seattle', 'mariners'] },
  { code: 'STL', name: 'St. Louis Cardinals', short: 'Cardinals', aliases: ['stl', 'st louis', 'cardinals', 'cards'] },
  { code: 'TB',  name: 'Tampa Bay Rays', short: 'Rays', aliases: ['tb', 'tbr', 'tampa', 'tampa bay', 'rays'] },
  { code: 'TEX', name: 'Texas Rangers', short: 'Rangers', aliases: ['tex', 'texas', 'rangers'] },
  { code: 'TOR', name: 'Toronto Blue Jays', short: 'Blue Jays', aliases: ['tor', 'toronto', 'blue jays', 'bluejays', 'jays'] },
  { code: 'WSH', name: 'Washington Nationals', short: 'Nationals', aliases: ['wsh', 'was', 'washington', 'nationals', 'nats'] }
];

export function normalizeTeam(raw) {
  if (!raw) return { code: '???', name: 'Desconocido', short: '???' };
  const clean = String(raw)
    .replace(/^[0-9]+\s*-\s*/, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .toLowerCase();

  for (const t of MLB_TEAMS) {
    if (clean === t.code.toLowerCase() || clean === t.name.toLowerCase() || clean === t.short.toLowerCase()) {
      return t;
    }
  }
  for (const t of MLB_TEAMS) {
    for (const a of t.aliases) {
      if (clean === a || clean.split(/\s+/).includes(a)) {
        return t;
      }
    }
  }
  for (const t of MLB_TEAMS) {
    if (clean.includes(t.short.toLowerCase())) {
      return t;
    }
  }
  const parts = clean.split(/\s+/);
  const code = parts[parts.length - 1].substring(0, 3).toUpperCase();
  return { code, name: raw, short: parts[parts.length - 1] };
}

function formatOdds(val) {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num > 0 ? `+${num}` : `${num}`;
}

export function parseRawBetonline(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const games = [];

  for (let i = 0; i < lines.length; i++) {
    const rotMatch = lines[i].match(/^([0-9]{3,4})\s*-\s*(.+)$/);
    if (rotMatch && i + 1 < lines.length) {
      const nextRot = lines[i + 1].match(/^([0-9]{3,4})\s*-\s*(.+)$/);
      if (nextRot) {
        const away = rotMatch[2].trim();
        const home = nextRot[2].trim();

        const chunk = lines.slice(i, i + 14).join(' ');
        const overMatch = chunk.match(/(?:Total\s*)?O(?:v)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\(([+-]?[0-9]+)\)|([+-]?[0-9]{3,4}))/i);
        const underMatch = chunk.match(/(?:Total\s*)?U(?:n)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\(([+-]?[0-9]+)\)|([+-]?[0-9]{3,4}))/i);

        if (overMatch) {
          const total = parseFloat(overMatch[1]);
          const overOdds = parseInt(overMatch[2] || overMatch[3], 10);
          const underOdds = underMatch ? parseInt(underMatch[2] || underMatch[3], 10) : null;
          games.push({ away, home, total, over_odds: overOdds, under_odds: underOdds, time: lines[Math.max(0, i - 1)] });
        }
      }
    }
  }

  if (games.length === 0) {
    const blockRegex = /(?:[0-9]{3,4}\s*-\s*)?([A-Za-z\s]+)\s+(?:vs\.?|@|-)\s+(?:[0-9]{3,4}\s*-\s*)?([A-Za-z\s]+)[\s\S]*?(?:Total\s*)?O(?:v)?\s*([0-9]+(?:\.[0-9]+)?)\s*\(([+-]?[0-9]+)\)[\s\S]*?U(?:n)?\s*([0-9]+(?:\.[0-9]+)?)\s*\(([+-]?[0-9]+)\)/gi;
    let m;
    while ((m = blockRegex.exec(text)) !== null) {
      games.push({
        away: m[1].trim(),
        home: m[2].trim(),
        total: parseFloat(m[3]),
        over_odds: parseInt(m[4], 10),
        under_odds: parseInt(m[6], 10)
      });
    }
  }

  return games;
}

export function parseRawBetcris(text) {
  const clean = (text || '').replace(/\u00a0/g, ' ');
  const games = [];

  const pattern = /([a-zA-Z0-9\s.]+)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+)\s*:\s*Total de Hits[\s\S]*?(?:Ov|Over)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})[\s\S]*?(?:Un|Under)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\s\S]{0,30}?([+-]?[0-9]{3,4})/gi;

  let m;
  while ((m = pattern.exec(clean)) !== null) {
    games.push({
      away: m[1].replace(/^[0-9\s\-]+/, '').trim(),
      home: m[2].replace(/^[0-9\s\-]+/, '').trim(),
      total: parseFloat(m[3]),
      over_odds: parseInt(m[4], 10),
      under_odds: parseInt(m[6], 10)
    });
  }

  if (games.length === 0) {
    let away = '', home = '';
    const tm = clean.match(/([a-zA-Z0-9\s.]+)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+)\s*:\s*Total/i)
      || clean.match(/([a-zA-Z0-9\s.]+)\s+(?:vs\.?|@|-)\s+([a-zA-Z0-9\s.]+)/i);
    if (tm) {
      away = tm[1].replace(/^[0-9\s\-]+/, '').trim();
      home = tm[2].replace(/^[0-9\s\-]+/, '').trim();
    }

    let overTotal = null, overOdds = null;
    const om = clean.match(/(?:Ov|Over)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\\s\S]{0,30}?([+-]?[0-9]{3,4})/i)
      || clean.match(/(?:Ov|Over)[\s\S]{0,20}?([+-]?[0-9]{3,4})/i);
    if (om) {
      if (om[2]) { overTotal = parseFloat(om[1]); overOdds = parseInt(om[2], 10); }
      else if (om[1]) { overOdds = parseInt(om[1], 10); }
    }

    let underTotal = null, underOdds = null;
    const um = clean.match(/(?:Un|Under)[\s\S]{0,40}?([0-9]{1,2}(?:\.[0-9]+)?)[\\s\S]{0,30}?([+-]?[0-9]{3,4})/i)
      || clean.match(/(?:Un|Under)[\s\S]{0,20}?([+-]?[0-9]{3,4})/i);
    if (um) {
      if (um[2]) { underTotal = parseFloat(um[1]); underOdds = parseInt(um[2], 10); }
      else if (um[1]) { underOdds = parseInt(um[1], 10); }
    }

    const total = overTotal ?? underTotal;
    if (total !== null) {
      games.push({ away, home, total, over_odds: overOdds, under_odds: underOdds });
    }
  }

  return games;
}

export default function HCEComparador({ config }) {
  const [data, setData] = useState({ betonline: [], betcris: [], manual: [] });
  const [loading, setLoading] = useState(false);
  const [lastSyncBOL, setLastSyncBOL] = useState(null);
  const [lastSyncCris, setLastSyncCris] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, diff, match
  const [copiedId, setCopiedId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState('paste'); // 'paste' | 'scripts'
  const [pasteHouse, setPasteHouse] = useState('betonline'); // 'betonline' | 'betcris'
  const [pastedText, setPastedText] = useState('');
  const [importing, setImporting] = useState(false);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleImportPastedText = async () => {
    if (!pastedText.trim()) {
      notify('Por favor pega el texto antes de procesar', 'error');
      return;
    }
    setImporting(true);
    try {
      if (pasteHouse === 'betonline') {
        const games = parseRawBetonline(pastedText);
        if (games.length === 0) {
          notify('No se detectaron líneas de BetOnline en el texto pegado', 'error');
          setImporting(false);
          return;
        }
        const res = await fetch('./api.php?action=save_hce_betonline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ games })
        });
        const json = await res.json();
        if (json.status === 'success') {
          notify(`✅ ${games.length} líneas de BetOnline importadas con éxito!`);
          setPastedText('');
          setShowImportModal(false);
          loadData();
        } else {
          notify('Error: ' + (json.message || 'Desconocido'), 'error');
        }
      } else {
        const games = parseRawBetcris(pastedText);
        if (games.length === 0) {
          notify('No se detectaron líneas de Betcris (Hits+Carreras+Errores) en el texto pegado', 'error');
          setImporting(false);
          return;
        }
        const res = await fetch('./api.php?action=save_hce_betcris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ games, append: true })
        });
        const json = await res.json();
        if (json.status === 'success') {
          notify(`✅ ${games.length} línea(s) de Betcris importadas con éxito!`);
          setPastedText('');
          setShowImportModal(false);
          loadData();
        } else {
          notify('Error: ' + (json.message || 'Desconocido'), 'error');
        }
      }
    } catch (e) {
      notify('Error al procesar: ' + e.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`./api.php?action=get_hce&_=${Date.now()}`);
      if (!res.ok) throw new Error('Error al conectar con el servidor');
      const json = await res.json();
      if (json.status === 'success') {
        setData({
          betonline: json.betonline || [],
          betcris: json.betcris || [],
          manual: json.manual || []
        });
        setLastSyncBOL(json.last_betonline_sync);
        setLastSyncCris(json.last_betcris_sync);
      }
    } catch (err) {
      console.error(err);
      if (!silent) notify('Error al cargar datos HCE: ' + err.message, 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 25000);
    return () => clearInterval(interval);
  }, []);

  // Emparejamiento inteligente de partidos entre BetOnline y Betcris
  const matchedGames = useMemo(() => {
    const map = new Map();

    const getMatchKey = (awayCode, homeCode) => `${awayCode}_vs_${homeCode}`;

    // 1. Procesar BetOnline
    (data.betonline || []).forEach(g => {
      const awayTeam = normalizeTeam(g.away);
      const homeTeam = normalizeTeam(g.home);
      const key = getMatchKey(awayTeam.code, homeTeam.code);

      map.set(key, {
        id: key,
        away: awayTeam,
        home: homeTeam,
        time: g.time || 'Hoy',
        betonline: {
          total: (g.total !== undefined && g.total !== null) ? Number(g.total) : ((g.line !== undefined && g.line !== null) ? Number(g.line) : null),
          overOdds: (g.over_odds !== undefined && g.over_odds !== null) ? Number(g.over_odds) : ((g.over !== undefined && g.over !== null) ? Number(g.over) : null),
          underOdds: (g.under_odds !== undefined && g.under_odds !== null) ? Number(g.under_odds) : ((g.under !== undefined && g.under !== null) ? Number(g.under) : null),
          rawOver: g.raw_over || (g.over ? `Ov ${g.line || g.total} (${g.over})` : null),
          rawUnder: g.raw_under || (g.under ? `Un ${g.line || g.total} (${g.under})` : null)
        },
        betcris: null,
        manual: null
      });
    });

    // 2. Procesar Betcris
    (data.betcris || []).forEach(g => {
      const awayTeam = normalizeTeam(g.away);
      const homeTeam = normalizeTeam(g.home);
      const key = getMatchKey(awayTeam.code, homeTeam.code);

      const crisData = {
        total: (g.total !== undefined && g.total !== null) ? Number(g.total) : ((g.line !== undefined && g.line !== null) ? Number(g.line) : null),
        overOdds: (g.over_odds !== undefined && g.over_odds !== null) ? Number(g.over_odds) : ((g.over !== undefined && g.over !== null) ? Number(g.over) : null),
        underOdds: (g.under_odds !== undefined && g.under_odds !== null) ? Number(g.under_odds) : ((g.under !== undefined && g.under !== null) ? Number(g.under) : null),
        rawOver: g.raw_over || (g.over ? `Ov ${g.line || g.total} (${g.over})` : null),
        rawUnder: g.raw_under || (g.under ? `Un ${g.line || g.total} (${g.under})` : null),
        title: g.title
      };

      if (map.has(key)) {
        const item = map.get(key);
        item.betcris = crisData;
      } else {
        map.set(key, {
          id: key,
          away: awayTeam,
          home: homeTeam,
          time: g.time || 'Hoy',
          betonline: null,
          betcris: crisData,
          manual: null
        });
      }
    });

    // 3. Calcular la Línea Recomendada para Juancito Sport (JS)
    const list = Array.from(map.values()).map(item => {
      const bol = item.betonline;
      const cris = item.betcris;

      let jsTotal = null;
      let jsOverOdds = null;
      let jsUnderOdds = null;
      let diffTotal = null;
      let status = 'pending'; // 'matched', 'divergent', 'single_bol', 'single_cris'

      if (bol?.total !== null && bol?.total !== undefined && cris?.total !== null && cris?.total !== undefined) {
        diffTotal = Number((cris.total - bol.total).toFixed(1));
        
        // Si coinciden en total
        if (diffTotal === 0) {
          jsTotal = bol.total;
          status = 'matched';
        } else {
          // Si difieren, sugerimos el promedio exacto
          jsTotal = Number(((bol.total + cris.total) / 2).toFixed(1));
          status = 'divergent';
        }

        // Promedio de cuotas Over / Under
        if (bol.overOdds !== null && cris.overOdds !== null) {
          jsOverOdds = Math.round((bol.overOdds + cris.overOdds) / 2);
        } else {
          jsOverOdds = bol.overOdds ?? cris.overOdds ?? -110;
        }

        if (bol.underOdds !== null && cris.underOdds !== null) {
          jsUnderOdds = Math.round((bol.underOdds + cris.underOdds) / 2);
        } else {
          jsUnderOdds = bol.underOdds ?? cris.underOdds ?? -110;
        }

      } else if (bol?.total !== null && bol?.total !== undefined) {
        jsTotal = bol.total;
        jsOverOdds = bol.overOdds;
        jsUnderOdds = bol.underOdds;
        status = 'single_bol';
      } else if (cris?.total !== null && cris?.total !== undefined) {
        jsTotal = cris.total;
        jsOverOdds = cris.overOdds;
        jsUnderOdds = cris.underOdds;
        status = 'single_cris';
      }

      return {
        ...item,
        diffTotal,
        status,
        js: {
          total: jsTotal,
          overOdds: jsOverOdds,
          underOdds: jsUnderOdds
        }
      };
    });

    // Ordenar: primero los que tienen ambas líneas, luego por hora/nombre
    return list.sort((a, b) => {
      if (a.status === 'divergent' && b.status !== 'divergent') return -1;
      if (b.status === 'divergent' && a.status !== 'divergent') return 1;
      if (a.betonline && a.betcris && (!b.betonline || !b.betcris)) return -1;
      if (b.betonline && b.betcris && (!a.betonline || !a.betcris)) return 1;
      return a.away.code.localeCompare(b.away.code);
    });
  }, [data]);

  // Filtrado por búsqueda y categoría
  const filteredGames = useMemo(() => {
    return matchedGames.filter(g => {
      const matchSearch = searchTerm === '' ||
        g.away.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.home.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.away.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.home.code.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (selectedFilter === 'diff') return g.status === 'divergent';
      if (selectedFilter === 'match') return g.status === 'matched';
      if (selectedFilter === 'incomplete') return g.status === 'single_bol' || g.status === 'single_cris';
      return true;
    });
  }, [matchedGames, searchTerm, selectedFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    let both = 0;
    let diff = 0;
    let matched = 0;
    let bolOnly = 0;
    let crisOnly = 0;

    matchedGames.forEach(g => {
      if (g.betonline && g.betcris) {
        both++;
        if (g.status === 'divergent') diff++;
        if (g.status === 'matched') matched++;
      } else if (g.betonline) {
        bolOnly++;
      } else if (g.betcris) {
        crisOnly++;
      }
    });

    return { total: matchedGames.length, both, diff, matched, bolOnly, crisOnly };
  }, [matchedGames]);

  // Copiar línea JS formateada al portapapeles
  const handleCopyJSLine = (game) => {
    const text = `${game.away.short} vs ${game.home.short} HCE: Total ${game.js.total} | Over ${formatOdds(game.js.overOdds)} | Under ${formatOdds(game.js.underOdds)}`;
    navigator.clipboard.writeText(text);
    setCopiedId(game.id);
    notify(`Línea de ${game.away.short} vs ${game.home.short} copiada`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Código del bookmarklet / userscript para BetOnline
  const getBetonlineBookmarklet = () => {
    const targetUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/api.php?action=save_hce_betonline';
    return `javascript:(async function(){
  try {
    const games = [];
    document.querySelectorAll('.league-container').forEach(league => {
      league.querySelectorAll('tbody').forEach(tb => {
        const text = tb.innerText || '';
        const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
        const awayLine = lines.find(l => /^[0-9]{3,4}\\s*-\\s*/.test(l));
        const homeLine = lines.filter(l => /^[0-9]{3,4}\\s*-\\s*/.test(l))[1];
        const overMatch = text.match(/(?:Total\\s*)?O(?:v)?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\(([+-]?[0-9]+)\\)/i);
        const underMatch = text.match(/(?:Total\\s*)?U(?:n)?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\(([+-]?[0-9]+)\\)/i);
        if (awayLine && homeLine && overMatch) {
          games.push({
            away: awayLine.replace(/^[0-9]{3,4}\\s*-\\s*/, '').trim(),
            home: homeLine.replace(/^[0-9]{3,4}\\s*-\\s*/, '').trim(),
            total: parseFloat(overMatch[1]),
            over_odds: parseInt(overMatch[2], 10),
            under_odds: underMatch ? parseInt(underMatch[2], 10) : null,
            raw_over: overMatch[0],
            raw_under: underMatch ? underMatch[0] : null
          });
        }
      });
    });
    if (games.length === 0) {
      alert('No se encontraron líneas HCE en la vista de BetOnline. Asegúrate de estar en /sportsbook/baseball/r+h+e');
      return;
    }
    const res = await fetch('${targetUrl}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ games })
    });
    const data = await res.json();
    alert('✅ ' + games.length + ' líneas de BetOnline HCE sincronizadas con éxito!');
  } catch (err) {
    alert('❌ Error al extraer/sincronizar BetOnline: ' + err.message);
  }
})();`;
  };

  // Código del bookmarklet / userscript para Betcris con escaneo automático
  const getBetcrisBookmarklet = () => {
    const targetUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/api.php?action=save_hce_betcris';
    return `javascript:(async function(){
  try {
    const targetUrl = '${targetUrl}';

    function parseHce(text, fallbackTitle = '') {
      if (!text) return null;
      const clean = text.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
      if (!/hits?\\s*[\\+,y]\\s*carreras?\\s*[\\+,y]\\s*errores?/i.test(clean) && !/total\\s*de\\s*(?:hits|hce|r\\+h\\+e)/i.test(clean)) return null;

      let away = '', home = '';
      const tm = clean.match(/([a-zA-Z0-9\\s.]+)\\s+(?:vs\\.?|@|-)\\s+([a-zA-Z0-9\\s.]+)\\s*:\\s*Total/i)
        || fallbackTitle.match(/([a-zA-Z0-9\\s.]+)\\s+(?:vs\\.?|@|-)\\s+([a-zA-Z0-9\\s.]+)/i)
        || clean.match(/([a-zA-Z0-9\\s.]+)\\s+(?:vs\\.?|@|-)\\s+([a-zA-Z0-9\\s.]+)/i);
      if (tm) {
        away = tm[1].replace(/^[0-9\\s\\-]+/, '').trim();
        home = tm[2].replace(/^[0-9\\s\\-]+/, '').trim();
      }

      let overTotal = null, overOdds = null;
      const om = clean.match(/(?:Ov|Over)[\\s\\S]{0,40}?([0-9]{1,2}(?:\\.[0-9]+)?)[\\s\\S]{0,30}?([+-]?[0-9]{3,4})/i)
        || clean.match(/(?:Ov|Over)[\\s\\S]{0,20}?([+-]?[0-9]{3,4})/i);
      if (om) {
        if (om[2]) { overTotal = parseFloat(om[1]); overOdds = parseInt(om[2], 10); }
        else if (om[1]) { overOdds = parseInt(om[1], 10); }
      }

      let underTotal = null, underOdds = null;
      const um = clean.match(/(?:Un|Under)[\\s\\S]{0,40}?([0-9]{1,2}(?:\\.[0-9]+)?)[\\s\\S]{0,30}?([+-]?[0-9]{3,4})/i)
        || clean.match(/(?:Un|Under)[\\s\\S]{0,20}?([+-]?[0-9]{3,4})/i);
      if (um) {
        if (um[2]) { underTotal = parseFloat(um[1]); underOdds = parseInt(um[2], 10); }
        else if (um[1]) { underOdds = parseInt(um[1], 10); }
      }

      const total = overTotal ?? underTotal;
      if (total !== null && (overOdds !== null || underOdds !== null)) {
        return {
          away: away || 'Visitante',
          home: home || 'Local',
          total,
          over_odds: overOdds,
          under_odds: underOdds,
          raw_over: 'Ov ' + total + ' (' + overOdds + ')',
          raw_under: 'Un ' + total + ' (' + underOdds + ')',
          title: away + ' vs ' + home + ': Total de Hits+Carreras+Errores'
        };
      }
      return null;
    }

    // 1. Si ya está visible el mercado en la vista actual
    const current = parseHce(document.body.innerText, document.title);
    if (current) {
      await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: [current], append: true })
      });
      alert('✅ Sincronizado partido actual: ' + current.away + ' vs ' + current.home + ' (Total: ' + current.total + ')');
      return;
    }

    // 2. Si estamos en la categoría, buscar todos los partidos y recorrerlos automáticamente
    const links = Array.from(document.querySelectorAll('a[href*=\"/game/\"]'));
    const seen = new Set();
    const gameUrls = [];
    links.forEach(a => {
      const m = (a.getAttribute('href') || a.href).match(/\\/game\\/([a-f0-9\\-]+)/i);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        gameUrls.push({ id: m[1], element: a, text: a.innerText.trim().replace(/\\s+/g, ' ') });
      }
    });

    if (gameUrls.length === 0) {
      alert('No se detectaron partidos ni mercados de HCE en la pantalla actual. Asegúrate de estar en la categoría de Béisbol / MLB.');
      return;
    }

    // Widget flotante de progreso durante el escaneo
    let banner = document.getElementById('cp-scanner-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'cp-scanner-banner';
      banner.style = 'position:fixed;top:20px;right:20px;z-index:9999999;background:#0f172a;color:#fff;border:2px solid #0284c7;border-radius:12px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,0.7);font-family:sans-serif;min-width:300px;';
      document.body.appendChild(banner);
    }
    banner.innerHTML = '<div style=\"font-weight:bold;color:#38bdf8;margin-bottom:6px;\">🔄 Escaneando automáticamente ' + gameUrls.length + ' partidos...</div><div id=\"cp-scan-status\" style=\"font-size:12px;color:#cbd5e1;\">Iniciando...</div>';

    const delay = ms => new Promise(r => setTimeout(r, ms));
    const results = [];

    for (let i = 0; i < gameUrls.length; i++) {
      const g = gameUrls[i];
      const statusEl = document.getElementById('cp-scan-status');
      if (statusEl) statusEl.innerText = 'Analizando [' + (i+1) + '/' + gameUrls.length + ']: ' + (g.text || 'Partido ' + (i+1));

      g.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      g.element.click();

      let captured = null;
      for (let w = 0; w < 10; w++) {
        await delay(350);
        captured = parseHce(document.body.innerText, document.title);
        if (captured) break;
      }

      if (captured) {
        results.push(captured);
        await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ games: [captured], append: true })
        });
        if (statusEl) statusEl.innerText = '✅ Capturado [' + (i+1) + '/' + gameUrls.length + ']: ' + captured.away + ' vs ' + captured.home + ' (' + captured.total + ')';
      }
      await delay(400);
    }

    banner.innerHTML = '<div style=\"font-weight:bold;color:#10b981;font-size:14px;margin-bottom:4px;\">🎉 ¡Escaneo completado!</div><div style=\"font-size:12px;color:#cbd5e1;\">✅ ' + results.length + ' partidos sincronizados automáticamente con CalculadoraParley.</div>';
    setTimeout(() => { if (banner) banner.remove(); }, 6000);

  } catch (err) {
    alert('❌ Error durante el escaneo de Betcris: ' + err.message);
  }
})();`;
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    notify(`Código de ${label} copiado al portapapeles`);
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿Seguro que deseas reiniciar y vaciar todas las líneas HCE guardadas?')) return;
    try {
      const res = await fetch('./api.php?action=clear_hce', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'success') {
        notify('Datos HCE reiniciados');
        loadData();
      }
    } catch (e) {
      notify('Error al limpiar datos: ' + e.message, 'error');
    }
  };

  return (
    <div style={{ color: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '10px',
          background: notification.type === 'error' ? '#ef4444' : '#10b981',
          color: '#fff', fontWeight: 600, fontSize: '0.9rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span>{notification.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        gap: '12px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '14px 18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            padding: '10px', borderRadius: '10px', fontSize: '1.4rem'
          }}>
            ⚾
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              Comparador HCE (Hits + Carreras + Errores)
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '14px' }}>
              <span>
                BetOnline: <strong style={{ color: lastSyncBOL ? '#34d399' : '#f87171' }}>
                  {lastSyncBOL ? new Date(lastSyncBOL).toLocaleTimeString() : 'Sin datos'}
                </strong>
              </span>
              <span>•</span>
              <span>
                Betcris: <strong style={{ color: lastSyncCris ? '#34d399' : '#f87171' }}>
                  {lastSyncCris ? new Date(lastSyncCris).toLocaleTimeString() : 'Sin datos'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadData()}
            disabled={loading}
            style={{
              background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0',
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span style={{ display: 'inline-block', transform: loading ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}>🔄</span>
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>

          <button
            onClick={() => { setImportTab('paste'); setShowImportModal(true); }}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#fff',
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}
          >
            <span>📥</span>
            Cargar Líneas (Pegar o Sincronizar)
          </button>

          <button
            onClick={handleClearAll}
            title="Vaciar datos guardados"
            style={{
              background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171',
              padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem'
            }}
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px'
      }}>
        <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Partidos Totales</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>{stats.total}</div>
        </div>

        <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ambas Casas</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>{stats.both}</div>
        </div>

        <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ fontSize: '0.74rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Líneas Idénticas</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>{stats.matched}</div>
        </div>

        <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div style={{ fontSize: '0.74rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Discrepancias</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stats.diff > 0 ? '#f59e0b' : '#94a3b8', marginTop: '4px' }}>
            {stats.diff}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `Todos (${matchedGames.length})` },
            { id: 'diff', label: `⚠️ Discrepancias (${stats.diff})` },
            { id: 'match', label: `✅ Coincidentes (${stats.matched})` },
            { id: 'incomplete', label: `⏳ Incompletos (${stats.bolOnly + stats.crisOnly})` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              style={{
                padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                background: selectedFilter === f.id ? '#0284c7' : '#1e293b',
                color: selectedFilter === f.id ? '#fff' : '#94a3b8',
                border: '1px solid ' + (selectedFilter === f.id ? '#38bdf8' : 'rgba(255,255,255,0.06)')
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Buscar por equipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '7px 12px 7px 32px', borderRadius: '6px',
              background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
              color: '#f8fafc', fontSize: '0.82rem', boxSizing: 'border-box'
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '7px', fontSize: '0.85rem', color: '#64748b' }}>🔍</span>
        </div>
      </div>

      {/* Main Comparison Table */}
      <div style={{
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
        overflowX: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px', minWidth: '200px' }}>Partido</th>
              <th style={{ padding: '12px 16px', minWidth: '160px', background: 'rgba(59, 130, 246, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
                  <span>BetOnline</span>
                </div>
              </th>
              <th style={{ padding: '12px 16px', minWidth: '160px', background: 'rgba(16, 185, 129, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                  <span>Betcris</span>
                </div>
              </th>
              <th style={{ padding: '12px 16px', minWidth: '130px', textAlign: 'center' }}>Variación</th>
              <th style={{ padding: '12px 16px', minWidth: '220px', background: 'rgba(245, 158, 11, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>Línea Recomendada JS</span>
                </div>
              </th>
              <th style={{ padding: '12px 14px', width: '90px', textAlign: 'center' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredGames.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  {stats.total === 0 ? (
                    <div>
                      <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                        No hay líneas de HCE cargadas todavía
                      </p>
                      <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '18px', maxWidth: '520px', margin: '0 auto 18px' }}>
                        Puedes cargar las líneas pegando el texto copiado de BetOnline / Betcris (Ctrl+A, Ctrl+C), o ejecutando los extractores automáticos en sus pestañas.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => { setImportTab('paste'); setShowImportModal(true); }}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff',
                            border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          📋 Pegar Texto Copiado (Fácil y Rápido)
                        </button>
                        <button
                          onClick={() => { setImportTab('scripts'); setShowImportModal(true); }}
                          style={{
                            background: '#1e293b', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)',
                            padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          ⚡ Ver Extractores de Sincronización
                        </button>
                      </div>
                    </div>
                  ) : (
                    'No se encontraron partidos con el filtro actual.'
                  )}
                </td>
              </tr>
            ) : (
              filteredGames.map((game, idx) => {
                const bol = game.betonline;
                const cris = game.betcris;
                const isDiff = game.status === 'divergent';

                return (
                  <tr
                    key={game.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    {/* Partido */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                          <span style={{ color: '#38bdf8' }}>{game.away.short}</span>
                          <span style={{ color: '#64748b', margin: '0 6px' }}>vs</span>
                          <span style={{ color: '#38bdf8' }}>{game.home.short}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {game.away.name} @ {game.home.name}
                        </div>
                      </div>
                    </td>

                    {/* BetOnline */}
                    <td style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.03)' }}>
                      {bol?.total !== null && bol?.total !== undefined ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#93c5fd' }}>
                              {bol.total}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total</span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '8px' }}>
                            <span>O: <strong style={{ color: '#e2e8f0' }}>{formatOdds(bol.overOdds)}</strong></span>
                            <span>U: <strong style={{ color: '#e2e8f0' }}>{formatOdds(bol.underOdds)}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#475569', fontStyle: 'italic' }}>No disponible</span>
                      )}
                    </td>

                    {/* Betcris */}
                    <td style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.03)' }}>
                      {cris?.total !== null && cris?.total !== undefined ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#6ee7b7' }}>
                              {cris.total}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total</span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '8px' }}>
                            <span>O: <strong style={{ color: '#e2e8f0' }}>{formatOdds(cris.overOdds)}</strong></span>
                            <span>U: <strong style={{ color: '#e2e8f0' }}>{formatOdds(cris.underOdds)}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#475569', fontStyle: 'italic' }}>No disponible</span>
                      )}
                    </td>

                    {/* Variación */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {game.diffTotal !== null ? (
                        <div>
                          {isDiff ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700,
                              background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                              <span>⚠️</span>
                              <span>{game.diffTotal > 0 ? `+${game.diffTotal}` : game.diffTotal}</span>
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: '6px',
                              fontSize: '0.78rem', fontWeight: 600,
                              background: 'rgba(16, 185, 129, 0.12)', color: '#34d399'
                            }}>
                              ✓ Igual
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>1 sola casa</span>
                      )}
                    </td>

                    {/* Línea Recomendada Juancito Sport (JS) */}
                    <td style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.04)' }}>
                      {game.js.total !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b' }}>
                                {game.js.total}
                              </span>
                              <span style={{
                                fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px',
                                background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 600
                              }}>
                                JS
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px', display: 'flex', gap: '10px' }}>
                              <span>Over: <strong style={{ color: '#38bdf8' }}>{formatOdds(game.js.overOdds)}</strong></span>
                              <span>Under: <strong style={{ color: '#38bdf8' }}>{formatOdds(game.js.underOdds)}</strong></span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Calculando...</span>
                      )}
                    </td>

                    {/* Acción / Copiar */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleCopyJSLine(game)}
                        title="Copiar línea JS al portapapeles"
                        style={{
                          background: copiedId === game.id ? '#10b981' : '#1e293b',
                          border: '1px solid ' + (copiedId === game.id ? '#10b981' : 'rgba(255,255,255,0.12)'),
                          color: copiedId === game.id ? '#fff' : '#94a3b8',
                          padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem',
                          fontWeight: 600, transition: 'all 0.15s'
                        }}
                      >
                        {copiedId === game.id ? '✓ Copiado' : '📋 Copiar'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Importación: Pegar Texto o Usar Scripts */}
      {showImportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.8)', zIndex: 10000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px',
            maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>📥</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
                  Cargar Líneas HCE (Hits + Carreras + Errores)
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <button
                onClick={() => setImportTab('paste')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  background: importTab === 'paste' ? '#10b981' : '#1e293b',
                  color: importTab === 'paste' ? '#fff' : '#94a3b8',
                  border: '1px solid ' + (importTab === 'paste' ? '#34d399' : 'rgba(255,255,255,0.08)'),
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <span>📋</span>
                Pegar Texto Copiado (Directo)
              </button>
              <button
                onClick={() => setImportTab('scripts')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  background: importTab === 'scripts' ? '#0284c7' : '#1e293b',
                  color: importTab === 'scripts' ? '#fff' : '#94a3b8',
                  border: '1px solid ' + (importTab === 'scripts' ? '#38bdf8' : 'rgba(255,255,255,0.08)'),
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <span>⚡</span>
                Extractores Automáticos (Scripts)
              </button>
            </div>

            {/* Tab 1: Pegar Texto Copiado */}
            {importTab === 'paste' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Selecciona la casa de apuestas, copia el texto de su pantalla (o presiona <strong>Ctrl+A</strong> y <strong>Ctrl+C</strong>) y pégalo abajo:
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setPasteHouse('betonline')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 700,
                      background: pasteHouse === 'betonline' ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                      color: pasteHouse === 'betonline' ? '#60a5fa' : '#94a3b8',
                      border: '2px solid ' + (pasteHouse === 'betonline' ? '#3b82f6' : 'rgba(255,255,255,0.06)')
                    }}
                  >
                    🔵 1. BetOnline (R+H+E)
                  </button>

                  <button
                    onClick={() => setPasteHouse('betcris')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 700,
                      background: pasteHouse === 'betcris' ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
                      color: pasteHouse === 'betcris' ? '#34d399' : '#94a3b8',
                      border: '2px solid ' + (pasteHouse === 'betcris' ? '#10b981' : 'rgba(255,255,255,0.06)')
                    }}
                  >
                    🟢 2. Betcris (Hits+Carreras+Errores)
                  </button>
                </div>

                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  {pasteHouse === 'betonline' ? (
                    <div>
                      💡 <strong>Para BetOnline:</strong> En la pestaña de BetOnline (<a href="https://www.betonline.ag/sportsbook/baseball/r+h+e" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>abrir aquí ↗</a>), presiona <code>Ctrl+A</code> (seleccionar todo), luego <code>Ctrl+C</code> (copiar), y pégalo aquí. Detecta automáticamente los partidos, totales y momios.
                    </div>
                  ) : (
                    <div>
                      💡 <strong>Para Betcris:</strong> En la pestaña de Betcris donde ves el partido o la lista con <em>Total de Hits+Carreras+Errores</em>, copia el texto con el mouse y pégalo aquí. Extrae el partido, la línea Over/Under y los momios al instante.
                    </div>
                  )}
                </div>

                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={
                    pasteHouse === 'betonline'
                      ? 'Pega aquí el texto copiado de BetOnline...\nEjemplo:\n1951 - Pittsburgh Pirates\n1952 - Chicago Cubs\nTotal O 25.5 (-105)\nU 25.5 (-125)'
                      : 'Pega aquí el texto copiado de Betcris...\nEjemplo:\nPirates vs Cubs: Total de Hits+Carreras+Errores\nOv 25.5 -103\nUn 25.5 -127'
                  }
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    background: '#020617', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc', fontSize: '0.82rem', fontFamily: 'monospace',
                    boxSizing: 'border-box', resize: 'vertical'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => setPastedText('')}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Borrar texto
                  </button>

                  <button
                    onClick={handleImportPastedText}
                    disabled={importing || !pastedText.trim()}
                    style={{
                      background: pasteHouse === 'betonline'
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700,
                      opacity: (!pastedText.trim() || importing) ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    <span>⚡</span>
                    {importing ? 'Procesando...' : `Procesar e Importar ${pasteHouse === 'betonline' ? 'BetOnline' : 'Betcris'}`}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Extractores Automáticos (Scripts) */}
            {importTab === 'scripts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem', color: '#fde68a' }}>
                  ℹ️ <strong>Importante:</strong> Estos extractores se ejecutan <strong>dentro de las pestañas de BetOnline y Betcris</strong> (en la consola F12 o como marcadores), y envían los datos hacia este comparador automáticamente.
                </div>

                {/* Casa 1: BetOnline */}
                <div style={{ background: '#1e293b', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: '#93c5fd', fontSize: '0.9rem' }}>1. BetOnline (R+H+E)</strong>
                    <a
                      href="https://www.betonline.ag/sportsbook/baseball/r+h+e"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#38bdf8', fontSize: '0.78rem', textDecoration: 'none' }}
                    >
                      Abrir BetOnline ↗
                    </a>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '10px' }}>
                    Copia este extractor y pégalo en la consola (F12) de BetOnline para extraer todos los partidos a la vez:
                  </div>
                  <button
                    onClick={() => copyToClipboard(getBetonlineBookmarklet(), 'BetOnline Extractor')}
                    style={{
                      background: '#2563eb', border: 'none', color: '#fff', padding: '8px 14px',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
                    }}
                  >
                    📋 Copiar Extractor BetOnline
                  </button>
                </div>

                {/* Casa 2: Betcris */}
                <div style={{ background: '#1e293b', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: '#6ee7b7', fontSize: '0.9rem' }}>2. Betcris (Auto-Scanner Automático)</strong>
                    <span style={{ color: '#34d399', fontSize: '0.78rem' }}>Recorre partidos solo</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '10px' }}>
                    En Betcris (donde están listados los partidos de MLB), ejecuta este script. Recorre automáticamente cada partido y sincroniza las líneas de HCE:
                  </div>
                  <button
                    onClick={() => copyToClipboard(getBetcrisBookmarklet(), 'Betcris Extractor')}
                    style={{
                      background: '#059669', border: 'none', color: '#fff', padding: '8px 14px',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
                    }}
                  >
                    📋 Copiar Extractor Betcris
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  background: '#334155', border: 'none', color: '#f8fafc', padding: '8px 16px',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
