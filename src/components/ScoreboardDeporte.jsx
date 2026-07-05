import React, { useState, useEffect, useRef } from 'react';

// Marcadores genéricos para NBA/básquet y soccer usando los endpoints públicos de ESPN
// (gratuitos y consultados directo desde el navegador, sin cargar el servidor).
// Alertas por juego seleccionado (campanita):
//  - basket: 1er cuarto completado, medio tiempo (H) y final
//  - soccer: solo final, o suspendido/pospuesto

function fechaHoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function hora12(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

const ESTILOS_ESTADO = {
  post: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.45)', accent: '#fca5a5' },
  in: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.45)', accent: '#6ee7b7' },
  pre: { bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.1)', accent: '#94a3b8' }
};

const ETIQUETAS_HITO = {
  q1: '1er cuarto completado',
  h: 'Medio tiempo (H) completado',
  final: 'FINAL',
  suspendido: 'Juego suspendido / pospuesto'
};

// Adapta un evento de TheSportsDB al formato de ESPN para reutilizar todo el render/alertas
function adaptarEventoTsdb(e) {
  const limpiar = (n) => (n || '').replace(/ Basketball$/i, '').trim();
  const estadoRaw = (e.strStatus || 'NS').toUpperCase().trim();

  let state = 'pre';
  let period = 0;
  let tipoNombre = 'STATUS_SCHEDULED';
  let shortDetail;

  if (/^(FT|AOT|AET|PEN|MATCH FINISHED|FINISHED)$/.test(estadoRaw)) {
    state = 'post';
    tipoNombre = 'STATUS_FINAL';
  } else if (/POSTP|CANC|SUSP|ABAN/.test(estadoRaw)) {
    state = 'post';
    tipoNombre = 'STATUS_POSTPONED';
    shortDetail = 'Pospuesto';
  } else if (estadoRaw !== 'NS' && estadoRaw !== '' && estadoRaw !== 'TBD') {
    state = 'in';
    shortDetail = e.strProgress || estadoRaw;
    if (estadoRaw === 'HT') {
      tipoNombre = 'STATUS_HALFTIME';
      period = 2;
    }
    const q = estadoRaw.match(/^Q(\d)/);
    if (q) period = parseInt(q[1], 10);
    if (/^(2H|OT)/.test(estadoRaw)) period = estadoRaw.startsWith('OT') ? 5 : 2;
  }

  // strTimestamp/strTime vienen en UTC
  let fechaIso;
  if (e.strTimestamp) {
    fechaIso = e.strTimestamp.endsWith('Z') ? e.strTimestamp : e.strTimestamp + 'Z';
  } else {
    fechaIso = `${e.dateEvent}T${e.strTime || '00:00:00'}Z`;
  }

  return {
    id: String(e.idEvent),
    date: fechaIso,
    name: `${limpiar(e.strHomeTeam)} vs ${limpiar(e.strAwayTeam)}`,
    status: {
      period,
      type: { state, name: tipoNombre, shortDetail, completed: state === 'post' && tipoNombre === 'STATUS_FINAL' }
    },
    competitions: [{
      competitors: [
        {
          id: String(e.idEvent) + '-h',
          homeAway: 'home',
          team: { displayName: limpiar(e.strHomeTeam), logo: e.strHomeTeamBadge || undefined },
          score: e.intHomeScore !== null && e.intHomeScore !== undefined ? String(e.intHomeScore) : undefined
        },
        {
          id: String(e.idEvent) + '-a',
          homeAway: 'away',
          team: { displayName: limpiar(e.strAwayTeam), logo: e.strAwayTeamBadge || undefined },
          score: e.intAwayScore !== null && e.intAwayScore !== undefined ? String(e.intAwayScore) : undefined
        }
      ]
    }]
  };
}

// Adapta un evento de Livescore.com al formato de ESPN.
// Esd viene ya en la zona horaria pedida (formato 20260705160000).
function adaptarEventoLivescore(e) {
  const eps = String(e.Eps || 'NS').trim();

  let state = 'pre';
  let period = 0;
  let tipoNombre = 'STATUS_SCHEDULED';
  let shortDetail;

  if (/^(FT|AET|AP|FT\s*PEN)/i.test(eps)) {
    state = 'post';
    tipoNombre = 'STATUS_FINAL';
  } else if (/Postp|Canc|Susp|Aband|Del/i.test(eps)) {
    state = 'post';
    tipoNombre = 'STATUS_POSTPONED';
    shortDetail = 'Pospuesto';
  } else if (eps !== 'NS' && eps !== 'TBC' && eps !== '') {
    state = 'in';
    shortDetail = eps;
    if (/^HT$/i.test(eps)) {
      tipoNombre = 'STATUS_HALFTIME';
      period = 2;
    }
    const q = eps.match(/^Q(\d)/i);
    if (q) period = parseInt(q[1], 10);
    if (/^OT/i.test(eps)) period = 5;
  }

  const s = String(e.Esd || '');
  const fechaLocal = s.length >= 12
    ? `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}T${s.substring(8, 10)}:${s.substring(10, 12)}:00`
    : new Date().toISOString();

  const equipo = (t) => {
    const info = (t && t[0]) || {};
    return {
      displayName: info.Nm || '?',
      logo: info.Img ? `https://lsm-static-prod.livescore.com/medium/${info.Img}` : undefined
    };
  };

  const construirLinescoresLs = (event, teamNum) => {
    const ls = [];
    const q1 = event['Tr' + teamNum + 'Q1'] !== undefined ? event['Tr' + teamNum + 'Q1'] : event['Tr' + teamNum + 'q1'];
    if (q1 !== undefined && q1 !== null) {
      for (let q = 1; q <= 4; q++) {
        const val = event['Tr' + teamNum + 'Q' + q] !== undefined ? event['Tr' + teamNum + 'Q' + q] : event['Tr' + teamNum + 'q' + q];
        if (val !== undefined && val !== null && val !== '') {
          ls.push({ value: parseInt(val, 10) });
        }
      }
      const ot = event['Tr' + teamNum + 'OT'] !== undefined ? event['Tr' + teamNum + 'OT'] : event['Tr' + teamNum + 'ot'];
      if (ot !== undefined && ot !== null && ot !== '') {
        ls.push({ value: parseInt(ot, 10) });
      }
    } else {
      const h1 = event['Tr' + teamNum + 'H1'] !== undefined ? event['Tr' + teamNum + 'H1'] : event['Tr' + teamNum + 'h1'];
      if (h1 !== undefined && h1 !== null && h1 !== '') {
        ls.push({ value: parseInt(h1, 10) });
      }
      const h2 = event['Tr' + teamNum + 'H2'] !== undefined ? event['Tr' + teamNum + 'H2'] : event['Tr' + teamNum + 'h2'];
      if (h2 !== undefined && h2 !== null && h2 !== '') {
        ls.push({ value: parseInt(h2, 10) });
      }
    }
    return ls;
  };

  return {
    id: 'ls' + String(e.Eid),
    date: fechaLocal,
    name: `${(e.T1 && e.T1[0] && e.T1[0].Nm) || '?'} vs ${(e.T2 && e.T2[0] && e.T2[0].Nm) || '?'}`,
    status: {
      period,
      type: { state, name: tipoNombre, shortDetail, completed: state === 'post' && tipoNombre === 'STATUS_FINAL' }
    },
    competitions: [{
      competitors: [
        { id: 'ls' + e.Eid + '-h', homeAway: 'home', team: equipo(e.T1), score: e.Tr1 !== undefined && e.Tr1 !== null ? String(e.Tr1) : undefined, linescores: construirLinescoresLs(e, 1) },
        { id: 'ls' + e.Eid + '-a', homeAway: 'away', team: equipo(e.T2), score: e.Tr2 !== undefined && e.Tr2 !== null ? String(e.Tr2) : undefined, linescores: construirLinescoresLs(e, 2) }
      ]
    }]
  };
}

export default function ScoreboardDeporte({ titulo, icono, ligas, ordenLocalPrimero = false, tipoAlertas = 'basket', agrupado = false, livescore = null }) {
  const [liga, setLiga] = useState(ligas[0].id);
  const [selectedDate, setSelectedDate] = useState(fechaHoyISO());
  const [eventos, setEventos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const claveSeguidos = `deporteSeguidos_${tipoAlertas}`;
  const claveHitos = `deporteHitos_${tipoAlertas}`;
  const claveOcultos = `deporteOcultos_${tipoAlertas}`;

  const cargarJSON = (clave) => {
    try { return JSON.parse(localStorage.getItem(clave) || '{}'); } catch (e) { return {}; }
  };

  const seguidosRef = useRef(null);
  const seenRef = useRef(null);
  const ocultosRef = useRef(null);
  if (seguidosRef.current === null) seguidosRef.current = cargarJSON(claveSeguidos);
  if (seenRef.current === null) seenRef.current = cargarJSON(claveHitos);
  if (ocultosRef.current === null) ocultosRef.current = cargarJSON(claveOcultos);
  const [seguidos, setSeguidos] = useState(seguidosRef.current);
  const [ocultos, setOcultos] = useState(ocultosRef.current);
  const [filtro, setFiltro] = useState('todos'); // todos | live | final
  const [mostrarOcultos, setMostrarOcultos] = useState(false);

  // Hitos guardados: se normalizan a { f: fecha, h: [hitos] } (antes eran arrays simples)
  const hitosDe = (id) => {
    const v = seenRef.current[id];
    if (v === undefined) return null;
    return Array.isArray(v) ? v : (v.h || []);
  };
  const setHitos = (id, arr, fecha) => {
    seenRef.current[id] = { f: fecha || fechaHoyISO(), h: arr };
  };

  const audioCtxRef = useRef(null);
  const tituloOriginalRef = useRef(document.title);
  const sinVerRef = useRef(0);
  const ligaRef = useRef(liga);
  useEffect(() => { ligaRef.current = liga; }, [liga]);

  const esHoy = selectedDate === fechaHoyISO();

  // ---------- Alertas ----------

  useEffect(() => {
    const alVolver = () => {
      if (!document.hidden) {
        sinVerRef.current = 0;
        document.title = tituloOriginalRef.current;
      }
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, []);

  const sonarCampana = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      [880, 1174.66, 1567.98].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch (e) { /* sin soporte de audio */ }
  };

  // esFavorito = prioridad alta: suena la campana y la notificación queda fija hasta cerrarla.
  // Los juegos normales notifican de forma discreta (sin sonido, la notificación se cierra sola).
  const dispararAlerta = (ev, hito, esFavorito = false) => {
    const comp = (ev.competitions && ev.competitions[0]) || {};
    const cs = comp.competitors || [];
    const marcador = cs.map(c => `${c.team ? c.team.displayName : '?'} ${c.score !== undefined ? c.score : 0}`).join(' - ');
    const prefijo = esFavorito ? '★ ' : '';
    const tituloMsg = hito === 'final'
      ? `${prefijo}🏁 FINAL: ${ev.name || marcador}`
      : `${prefijo}${icono} ${ev.name || marcador}`;
    const textoMsg = hito === 'final'
      ? `Resultado final: ${marcador}`
      : `${ETIQUETAS_HITO[hito] || hito} · ${marcador}`;

    const a = { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }), titulo: tituloMsg, texto: textoMsg, fav: esFavorito };
    setAlertas(prev => [a, ...prev].slice(0, 30));
    setToasts(prev => [...prev, a]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== a.id)), esFavorito ? 25000 : 12000);

    if (esFavorito) sonarCampana();

    if (document.hidden) {
      sinVerRef.current += 1;
      document.title = `(${sinVerRef.current}) 🔔 Alerta — CalcParley`;
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification(tituloMsg, {
          body: textoMsg,
          icon: './favicon.svg',
          requireInteraction: esFavorito,
          silent: !esFavorito,
          tag: 'calcparley-dep-' + a.id
        });
        n.onclick = () => {
          try { window.focus(); } catch (e) { /* sin foco */ }
          n.close();
        };
      } catch (e) { /* sin soporte */ }
    }
  };

  // Hitos alcanzados por un juego según el deporte
  const hitosActuales = (ev) => {
    const st = ev.status || {};
    const tipoNombre = (st.type && st.type.name) || '';
    const state = (st.type && st.type.state) || 'pre';
    const period = st.period || 0;
    const res = [];
    const suspendido = /SUSPEND|POSTPON|CANCEL|ABANDON|DELAY/.test(tipoNombre) && state !== 'in';

    if (suspendido) res.push('suspendido');

    if (tipoAlertas === 'basket') {
      if (state === 'post' || period >= 2 || (period === 1 && tipoNombre === 'STATUS_END_PERIOD')) res.push('q1');
      if (state === 'post' || period >= 3 || tipoNombre === 'STATUS_HALFTIME') res.push('h');
    }

    if (state === 'post' && !suspendido) res.push('final');
    return res;
  };

  const guardarSeguimiento = () => {
    localStorage.setItem(claveSeguidos, JSON.stringify(seguidosRef.current));
    localStorage.setItem(claveHitos, JSON.stringify(seenRef.current));
    localStorage.setItem(claveOcultos, JSON.stringify(ocultosRef.current));
  };

  // Todos los juegos notifican; los ★ favoritos con prioridad (sonido + notificación fija);
  // los 🚫 ocultos no notifican. Al primer avistamiento de un juego se registran sus hitos
  // en silencio para no bombardear con eventos viejos al abrir la página.
  const revisarAlertas = (evs) => {
    let cambio = false;
    evs.forEach(ev => {
      const id = String(ev.id);
      const ahora = hitosActuales(ev);
      const antes = hitosDe(id);

      if (antes === null) {
        setHitos(id, ahora, selectedDate);
        cambio = true;
        return;
      }

      const nuevos = ahora.filter(k => !antes.includes(k));
      if (nuevos.length === 0) return;

      setHitos(id, Array.from(new Set([...antes, ...ahora])), selectedDate);
      cambio = true;

      if (!ocultosRef.current[id]) {
        const esFav = !!seguidosRef.current[id];
        nuevos.forEach(k => dispararAlerta(ev, k, esFav));
      }

      // Al terminar (o suspenderse) el juego, limpiar su marca de favorito
      if ((nuevos.includes('final') || nuevos.includes('suspendido')) && seguidosRef.current[id]) {
        delete seguidosRef.current[id];
        setSeguidos({ ...seguidosRef.current });
      }
    });
    if (cambio) guardarSeguimiento();
  };

  const toggleSeguir = (ev, ligaId) => {
    const id = String(ev.id);
    if (seguidosRef.current[id]) {
      delete seguidosRef.current[id];
    } else {
      seguidosRef.current[id] = { liga: ligaId || ligaRef.current, fecha: selectedDate };
      if (hitosDe(id) === null) setHitos(id, hitosActuales(ev), selectedDate);
    }
    setSeguidos({ ...seguidosRef.current });
    guardarSeguimiento();
  };

  const toggleOcultar = (ev) => {
    const id = String(ev.id);
    if (ocultosRef.current[id]) {
      delete ocultosRef.current[id];
    } else {
      ocultosRef.current[id] = { fecha: selectedDate };
    }
    setOcultos({ ...ocultosRef.current });
    guardarSeguimiento();
  };

  const estadoCat = (ev) => (ev.status && ev.status.type && ev.status.type.state) || 'pre';

  // Favoritear/quitar todos los juegos activos de una lista (todo o nada)
  const toggleFavoritosLista = (evs, ligaId) => {
    const activos = evs.filter(e => estadoCat(e) !== 'post' && !ocultosRef.current[String(e.id)]);
    if (activos.length === 0) return;
    const todosFav = activos.every(e => seguidosRef.current[String(e.id)]);
    activos.forEach(e => {
      const id = String(e.id);
      if (todosFav) {
        delete seguidosRef.current[id];
      } else if (!seguidosRef.current[id]) {
        seguidosRef.current[id] = { liga: ligaId || ligaRef.current, fecha: selectedDate };
        if (hitosDe(id) === null) setHitos(id, hitosActuales(e), selectedDate);
      }
    });
    setSeguidos({ ...seguidosRef.current });
    guardarSeguimiento();
  };

  // Ocultar/mostrar todos los juegos de una lista (todo o nada)
  const toggleOcultosLista = (evs) => {
    const algunoVisible = evs.some(e => !ocultosRef.current[String(e.id)]);
    evs.forEach(e => {
      const id = String(e.id);
      if (algunoVisible) {
        ocultosRef.current[id] = { fecha: selectedDate };
      } else {
        delete ocultosRef.current[id];
      }
    });
    setOcultos({ ...ocultosRef.current });
    guardarSeguimiento();
  };

  const solicitarNotificaciones = () => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then(p => setNotifGranted(p === 'granted'));
  };

  // ---------- Carga de datos ----------

  const fetchScoreboard = (ligaId, fechaISO) => {
    // Fuente TheSportsDB: id con formato "tsdb:Deporte:FiltroLiga" (ej. tsdb:Basketball:FIBA)
    if (ligaId.startsWith('tsdb:')) {
      const partes = ligaId.split(':');
      const deporte = partes[1];
      const filtro = (partes[2] || '').toUpperCase();
      return fetch(`https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${fechaISO}&s=${deporte}`)
        .then(r => {
          if (!r.ok) throw new Error(`Error consultando TheSportsDB (HTTP ${r.status})`);
          return r.json();
        })
        .then(data => (data.events || [])
          .filter(e => !filtro || (e.strLeague || '').toUpperCase().indexOf(filtro) !== -1)
          .map(adaptarEventoTsdb)
          .sort((a, b) => new Date(a.date) - new Date(b.date)));
    }

    const fechaParam = fechaISO.replace(/-/g, '');
    return fetch(`https://site.api.espn.com/apis/site/v2/sports/${ligaId}/scoreboard?dates=${fechaParam}`)
      .then(r => {
        if (!r.ok) throw new Error(`Error consultando ESPN (HTTP ${r.status})`);
        return r.json();
      })
      .then(data => (data.events || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const cargar = (ligaActual, fechaActual) => {
    fetchScoreboard(ligaActual, fechaActual)
      .then(evs => {
        setEventos(evs);
        setCargado(true);
        setLastUpdate(new Date());
        setError(null);
        revisarAlertas(evs);
      })
      .catch(err => {
        setError(err.message);
        setCargado(true);
      });

    // Vigilar también otras ligas donde haya juegos seguidos (aunque no se estén viendo)
    const otras = [...new Set(Object.values(seguidosRef.current).map(s => s.liga))]
      .filter(l => l && l !== ligaActual);
    otras.forEach(l => {
      fetchScoreboard(l, fechaHoyISO()).then(revisarAlertas).catch(() => {});
    });
  };

  const [fuenteActiva, setFuenteActiva] = useState(null);

  // Cobertura total vía Livescore (a través del proxy del servidor)
  const fetchGruposLivescore = (fechaActual) => {
    const tz = -new Date().getTimezoneOffset() / 60;
    return fetch(`./api.php?action=proxy_livescore&sport=${livescore}&date=${fechaActual}&tz=${Math.round(tz)}`)
      .then(r => {
        if (!r.ok) throw new Error(`Proxy Livescore HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (!data || !Array.isArray(data.Stages)) throw new Error('Respuesta Livescore inválida');
        return data.Stages.map(st => ({
          liga: 'ls-' + (st.Sid || Math.random()),
          label: [st.Cnm, st.Snm].filter(Boolean).join(' — '),
          eventos: (st.Events || []).map(adaptarEventoLivescore).sort((a, b) => new Date(a.date) - new Date(b.date))
        })).filter(g => g.eventos.length > 0);
      });
  };

  // Vista agrupada estilo Flashscore: todas las ligas a la vez, agrupadas por liga
  const cargarAgrupado = (fechaActual) => {
    const usarEspn = () => Promise.all(ligas.map(l =>
      fetchScoreboard(l.id, fechaActual)
        .then(evs => ({ liga: l.id, label: l.label, eventos: evs }))
        .catch(() => ({ liga: l.id, label: l.label, eventos: [] }))
    )).then(res => {
      setFuenteActiva('espn');
      return res;
    });

    const promesa = livescore
      ? fetchGruposLivescore(fechaActual)
          .then(res => { setFuenteActiva('livescore'); return res; })
          .catch(() => usarEspn()) // respaldo automático si el proxy falla
      : usarEspn();

    promesa.then(res => {
      setGrupos(res);
      setCargado(true);
      setLastUpdate(new Date());
      setError(null);
      res.forEach(g => revisarAlertas(g.eventos));
    });
  };

  useEffect(() => {
    // Limpiar favoritos, ocultos e hitos de fechas viejas (2+ días)
    const limite = new Date();
    limite.setDate(limite.getDate() - 2);
    const esViejo = (f) => !f || new Date(f + 'T12:00:00') < limite;

    Object.keys(seguidosRef.current).forEach(id => {
      if (esViejo(seguidosRef.current[id] && seguidosRef.current[id].fecha)) delete seguidosRef.current[id];
    });
    Object.keys(ocultosRef.current).forEach(id => {
      if (esViejo(ocultosRef.current[id] && ocultosRef.current[id].fecha)) delete ocultosRef.current[id];
    });
    Object.keys(seenRef.current).forEach(id => {
      const v = seenRef.current[id];
      if (Array.isArray(v) || esViejo(v && v.f)) delete seenRef.current[id];
    });

    guardarSeguimiento();
    setSeguidos({ ...seguidosRef.current });
    setOcultos({ ...ocultosRef.current });
  }, []);

  useEffect(() => {
    setCargado(false);
    setEventos([]);
    setGrupos([]);
    const hacerCarga = agrupado
      ? () => cargarAgrupado(selectedDate)
      : () => cargar(liga, selectedDate);
    hacerCarga();
    // Solo el día actual se refresca automáticamente (cada 60s)
    if (selectedDate === fechaHoyISO()) {
      const t = setInterval(hacerCarga, 60000);
      return () => clearInterval(t);
    }
  }, [liga, selectedDate, agrupado]);

  const sumarDias = (n) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + n);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${mm}-${dd}`);
  };

  // ---------- Render ----------

  const renderTarjeta = (ev) => {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) return null;
    const state = (ev.status && ev.status.type && ev.status.type.state) || 'pre';
    const est = ESTILOS_ESTADO[state] || ESTILOS_ESTADO.pre;
    const id = String(ev.id);
    const seguido = !!seguidos[id];

    let estadoTexto;
    if (state === 'pre') {
      estadoTexto = `Inicia: ${hora12(ev.date)}`;
    } else if (state === 'in') {
      estadoTexto = (ev.status.type.shortDetail || 'En juego');
    } else {
      estadoTexto = (ev.status.type.completed === false ? (ev.status.type.shortDetail || 'Final') : 'Final') + ` · ${hora12(ev.date)}`;
    }

    let competidores = (comp.competitors || []).slice();
    competidores.sort((a, b) => {
      const orden = (c) => (c.homeAway === 'home' ? (ordenLocalPrimero ? 0 : 1) : (ordenLocalPrimero ? 1 : 0));
      return orden(a) - orden(b);
    });

    const tieneLinescores = competidores.some(c => Array.isArray(c.linescores) && c.linescores.length > 0);
    const numPeriodos = tieneLinescores
      ? Math.max(...competidores.map(c => (c.linescores || []).length))
      : 0;

    const tdS = { padding: '2px 6px', textAlign: 'center', fontSize: '0.72rem', color: '#cbd5e1' };
    const thS = { ...tdS, color: '#64748b', fontWeight: 'normal' };

    return (
      <div key={ev.id} style={{ background: est.bg, border: `1px solid ${est.border}`, borderRadius: '12px', padding: '14px 16px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
          {state !== 'post' ? (
            <button
              onClick={() => toggleSeguir(ev)}
              title={seguido
                ? 'Notificaciones activadas para este juego (clic para quitar)'
                : `Activar notificaciones de este juego (${tipoAlertas === 'basket' ? '1er cuarto, H y final' : 'final o suspendido'})`}
              style={{
                background: seguido ? 'rgba(0,210,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: seguido ? '1px solid #00d2ff' : '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '3px 9px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: seguido ? '#00d2ff' : '#64748b',
                fontWeight: 'bold'
              }}
            >
              {seguido ? '🔔 Avisando' : '🔕 Avisar'}
            </button>
          ) : <span />}
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 10px', borderRadius: '10px', color: est.accent, background: 'rgba(0,0,0,0.25)' }}>
            {estadoTexto}
          </span>
        </div>

        {competidores.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              {c.team && c.team.logo && (
                <img src={c.team.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              )}
              <span style={{ fontWeight: 'bold', fontSize: '0.88rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.team ? c.team.displayName : '?'}
              </span>
              {c.records && c.records[0] && (
                <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>{c.records[0].summary}</span>
              )}
            </div>
            <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#00d2ff', minWidth: '30px', textAlign: 'right' }}>
              {state === 'pre' ? '-' : (c.score !== undefined ? c.score : '-')}
            </span>
          </div>
        ))}

        {tieneLinescores && (
          <div style={{ overflowX: 'auto', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ ...thS, textAlign: 'left' }}></th>
                  {Array.from({ length: numPeriodos }, (_, i) => (
                    <th key={i} style={thS}>{i + 1}</th>
                  ))}
                  <th style={{ ...thS, color: '#00d2ff', fontWeight: 'bold' }}>T</th>
                </tr>
              </thead>
              <tbody>
                {competidores.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ ...tdS, textAlign: 'left', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {c.team ? (c.team.abbreviation || c.team.shortDisplayName) : '?'}
                    </td>
                    {Array.from({ length: numPeriodos }, (_, i) => (
                      <td key={i} style={tdS}>
                        {c.linescores && c.linescores[i] !== undefined && c.linescores[i].value !== undefined
                          ? c.linescores[i].value
                          : ''}
                      </td>
                    ))}
                    <td style={{ ...tdS, fontWeight: 'bold', color: '#00d2ff' }}>{c.score !== undefined ? c.score : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Fila compacta estilo Flashscore: estrella, estado/hora, equipos y marcador
  const renderFila = (ev, ligaId) => {
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) return null;
    const state = (ev.status && ev.status.type && ev.status.type.state) || 'pre';
    const est = ESTILOS_ESTADO[state] || ESTILOS_ESTADO.pre;
    const id = String(ev.id);
    const esFavorito = !!seguidos[id];
    const esOculto = !!ocultos[id];

    let estadoCorto;
    if (state === 'pre') {
      estadoCorto = hora12(ev.date);
    } else if (state === 'in') {
      estadoCorto = ev.status.type.shortDetail || 'En juego';
    } else {
      estadoCorto = ev.status.type.completed === false ? (ev.status.type.shortDetail || 'Final') : 'Final';
    }

    let competidores = (comp.competitors || []).slice();
    competidores.sort((a, b) => {
      const orden = (c) => (c.homeAway === 'home' ? (ordenLocalPrimero ? 0 : 1) : (ordenLocalPrimero ? 1 : 0));
      return orden(a) - orden(b);
    });

    return (
      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: esOculto ? 0.45 : 1 }}>
        {state !== 'post' ? (
          <button
            onClick={() => toggleSeguir(ev, ligaId)}
            title={esFavorito
              ? 'Favorito (prioridad alta: suena y la notificación queda fija). Clic para quitar.'
              : `Marcar favorito (prioridad alta) — alertas: ${tipoAlertas === 'basket' ? '1er cuarto, medio tiempo H y final' : 'final o suspendido'}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: esFavorito ? '#f59e0b' : '#475569', padding: '0 2px', lineHeight: 1 }}
          >
            {esFavorito ? '★' : '☆'}
          </button>
        ) : (
          <span style={{ width: '20px' }} />
        )}
        <button
          onClick={() => toggleOcultar(ev)}
          title={esOculto ? 'Oculto: no notifica. Clic para mostrar y volver a notificar.' : 'Ocultar este juego (no enviará notificaciones)'}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: esOculto ? '#f59e0b' : '#475569', padding: '0 2px', lineHeight: 1 }}
        >
          {esOculto ? '👁' : '🚫'}
        </button>
        <span style={{ width: '80px', flexShrink: 0, fontSize: '0.72rem', fontWeight: 'bold', color: est.accent }}>
          {estadoCorto}
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {competidores.map(c => {
            const periodos = (c.linescores || []).map(ls => ls.value !== undefined ? ls.value : '').filter(v => v !== '');
            return (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  {c.team && c.team.logo && (
                    <img src={c.team.logo} alt="" style={{ width: '17px', height: '17px', objectFit: 'contain' }} />
                  )}
                  <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: c.winner ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.team ? c.team.displayName : '?'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#00d2ff', minWidth: '22px', textAlign: 'right' }}>
                    {state === 'pre' ? '-' : (c.score !== undefined ? c.score : '-')}
                  </span>
                  {state !== 'pre' && periodos.length > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', letterSpacing: '0.5px' }}>
                      ({periodos.join(', ')})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Filtro Todos / En vivo / Finalizados + exclusión de ocultos
  const filtrarEventos = (evs) => evs.filter(ev => {
    if (!mostrarOcultos && ocultos[String(ev.id)]) return false;
    const st = estadoCat(ev);
    if (filtro === 'live' && st !== 'in') return false;
    if (filtro === 'final' && st !== 'post') return false;
    return true;
  });

  const gruposFiltrados = grupos
    .map(g => ({ ...g, visibles: filtrarEventos(g.eventos) }))
    .filter(g => g.visibles.length > 0);

  const todosLosEventos = grupos.flatMap(g => g.eventos);
  const numSeguidos = Object.keys(seguidos).length;
  const numOcultos = todosLosEventos.filter(e => ocultos[String(e.id)]).length;
  const activosVisibles = todosLosEventos.filter(e => estadoCat(e) !== 'post' && !ocultos[String(e.id)]);
  const todosSonFavoritos = activosVisibles.length > 0 && activosVisibles.every(e => seguidos[String(e.id)]);

  return (
    <div style={{ padding: '24px', background: '#060813', minHeight: '100vh', color: '#f8fafc' }}>
      <style>{`
        @media (max-width: 760px) {
          .sd-controles { flex-direction: column !important; align-items: stretch !important; }
          .sd-toasts { left: 10px !important; right: 10px !important; max-width: none !important; }
        }
        @keyframes sdAlertaEntrada {
          0% { transform: translateX(120%); opacity: 0; }
          60% { transform: translateX(-8px); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes sdPulsoNotif {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
          50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
        }
      `}</style>

      {/* Toasts flotantes de alertas */}
      <div className="sd-toasts" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{
              background: 'linear-gradient(135deg, #0b1a2b 0%, #0b0f19 100%)',
              border: '2px solid #00d2ff',
              borderRadius: '10px',
              padding: '16px 20px',
              color: '#f8fafc',
              fontSize: '0.95rem',
              boxShadow: '0 0 25px rgba(0, 210, 255, 0.45), 0 12px 32px rgba(0,0,0,0.7)',
              animation: 'sdAlertaEntrada 0.4s ease-out',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🔔</span>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#00d2ff', marginBottom: '4px' }}>{t.time} · Alerta</div>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{t.titulo}</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{t.texto}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Cabecera */}
        <div style={{ marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#00d2ff', textShadow: '0 0 10px rgba(0, 210, 255, 0.2)' }}>
              {icono} {titulo}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Todos los juegos notifican{tipoAlertas === 'basket' ? ' (1er cuarto, H y final)' : ' (final o suspendido)'} ·
              ★ favoritos con prioridad (suenan y quedan fijas) · 🚫 ocultos no notifican
              {numSeguidos > 0 && ` · ★ ${numSeguidos} favorito(s)`}
              {lastUpdate && ` · Actualizado: ${lastUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`}
              {livescore && fuenteActiva === 'espn' && ' · ⚠️ Cobertura parcial: la fuente completa no está disponible ahora'}
            </p>
          </div>
          {!notifGranted && (
            <button
              onClick={solicitarNotificaciones}
              style={{ padding: '8px 14px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', borderRadius: '6px', color: '#f59e0b', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem', animation: 'sdPulsoNotif 2s infinite' }}
            >
              🔔 Activar notificaciones (para verlas aunque estés en otra pestaña)
            </button>
          )}
        </div>

        {/* Alertas recientes */}
        {alertas.length > 0 && (
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#00d2ff', marginBottom: '6px' }}>🔔 Alertas recientes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '90px', overflowY: 'auto' }}>
              {alertas.map(a => (
                <div key={a.id} style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                  <span style={{ color: '#64748b', marginRight: '8px' }}>{a.time}</span>
                  <span style={{ fontWeight: 'bold' }}>{a.titulo}</span>
                  <span style={{ color: '#94a3b8' }}> — {a.texto}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controles: liga y fecha */}
        <div className="sd-controles" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          {!agrupado && (
            <select
              value={liga}
              onChange={(e) => setLiga(e.target.value)}
              style={{ padding: '8px 12px', background: '#0b0f19', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem', fontWeight: 'bold' }}
            >
              {ligas.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          )}

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => sumarDias(-1)}
              style={{ padding: '7px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ◀
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              style={{ padding: '7px 8px', background: '#060813', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#f8fafc', fontSize: '0.8rem', colorScheme: 'dark' }}
            />
            <button
              onClick={() => sumarDias(1)}
              style={{ padding: '7px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ▶
            </button>
            {!esHoy && (
              <button
                onClick={() => setSelectedDate(fechaHoyISO())}
                style={{ padding: '7px 12px', background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.4)', borderRadius: '6px', color: '#00d2ff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                📅 Hoy
              </button>
            )}
          </div>

          {/* Filtros de estado */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'live', label: '🟢 En vivo' },
              { id: 'final', label: '🔴 Finalizados' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                style={{
                  padding: '7px 12px',
                  background: filtro === f.id ? 'rgba(0,210,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: filtro === f.id ? '1px solid #00d2ff' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: filtro === f.id ? '#00d2ff' : '#94a3b8',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Acciones masivas */}
          {agrupado && todosLosEventos.length > 0 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => toggleFavoritosLista(todosLosEventos)}
                title="Marcar o quitar todos los juegos activos como favoritos"
                style={{ padding: '7px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '6px', color: '#f59e0b', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                {todosSonFavoritos ? '☆ Quitar todos' : '★ Todos favoritos'}
              </button>
              {(numOcultos > 0 || mostrarOcultos) && (
                <button
                  onClick={() => setMostrarOcultos(!mostrarOcultos)}
                  style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem' }}
                >
                  {mostrarOcultos ? '👁 Ocultar de nuevo' : `👁 Ver ocultos (${numOcultos})`}
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: '#64748b' }}>
            <span><span style={{ color: '#ef4444' }}>●</span> Final</span>
            <span><span style={{ color: '#10b981' }}>●</span> En juego</span>
            <span><span style={{ color: '#94a3b8' }}>●</span> Sin empezar</span>
          </div>
        </div>

        {/* Contenido */}
        {error && !agrupado ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '16px', color: '#fca5a5', fontSize: '0.9rem' }}>
            {error} — reintentando en la próxima actualización.
          </div>
        ) : !cargado ? (
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#64748b' }}>
            Cargando juegos...
          </div>
        ) : agrupado ? (
          gruposFiltrados.length === 0 ? (
            <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
              {filtro !== 'todos'
                ? 'No hay juegos con este filtro en la fecha seleccionada.'
                : `No hay juegos en ninguna liga en la fecha ${selectedDate}.`}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {gruposFiltrados.map(g => {
                const activosLiga = g.eventos.filter(e => estadoCat(e) !== 'post' && !ocultos[String(e.id)]);
                const ligaTodaFav = activosLiga.length > 0 && activosLiga.every(e => seguidos[String(e.id)]);
                const ligaOculta = g.eventos.length > 0 && g.eventos.every(e => ocultos[String(e.id)]);
                return (
                  <div key={g.liga} style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '9px 14px', background: 'rgba(0, 210, 255, 0.07)', borderBottom: '1px solid rgba(0,210,255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.88rem', color: '#00d2ff', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {activosLiga.length > 0 && (
                          <button
                            onClick={() => toggleFavoritosLista(g.eventos, g.liga)}
                            title={ligaTodaFav ? 'Quitar favorito a toda la liga' : 'Marcar toda la liga como favorita'}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: ligaTodaFav ? '#f59e0b' : '#475569', padding: 0, lineHeight: 1 }}
                          >
                            {ligaTodaFav ? '★' : '☆'}
                          </button>
                        )}
                        <button
                          onClick={() => toggleOcultosLista(g.eventos)}
                          title={ligaOculta ? 'Mostrar la liga y volver a notificar' : 'Ocultar toda la liga (sin notificaciones)'}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: ligaOculta ? '#f59e0b' : '#475569', padding: 0, lineHeight: 1 }}
                        >
                          {ligaOculta ? '👁' : '🚫'}
                        </button>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{g.visibles.length} juego(s)</span>
                      </div>
                    </div>
                    <div>
                      {g.visibles.map(ev => renderFila(ev, g.liga))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : eventos.length === 0 ? (
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
            No hay juegos de esta liga en la fecha {selectedDate}.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
            {eventos.map(renderTarjeta)}
          </div>
        )}
      </div>
    </div>
  );
}
