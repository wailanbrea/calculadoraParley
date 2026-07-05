import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import CalculadoraParley from './components/CalculadoraParley';
import FraccionarTickets from './components/FraccionarTickets';
import BasesAlcanzadas from './components/BasesAlcanzadas';
import ScoreboardDeporte from './components/ScoreboardDeporte';

const LIGAS_BASKET = [
  { id: 'basketball/nba', label: 'NBA' },
  { id: 'basketball/wnba', label: 'WNBA' },
  { id: 'tsdb:Basketball:FIBA', label: 'FIBA (Internacional)' },
  { id: 'basketball/fiba', label: 'FIBA World Cup' },
  { id: 'basketball/mens-olympics-basketball', label: 'Olímpico Masculino' },
  { id: 'basketball/womens-olympics-basketball', label: 'Olímpico Femenino' },
  { id: 'basketball/mens-college-basketball', label: 'NCAA College (M)' }
];

const LIGAS_SOCCER = [
  { id: 'soccer/fifa.world', label: 'Mundial FIFA 2026' },
  { id: 'soccer/usa.1', label: 'MLS (USA)' },
  { id: 'soccer/usa.usl.1', label: 'USL Championship (USA)' },
  { id: 'soccer/mex.1', label: 'Liga MX (México)' },
  { id: 'soccer/arg.1', label: 'Liga Profesional (Argentina)' },
  { id: 'soccer/arg.2', label: 'Nacional B (Argentina)' },
  { id: 'soccer/arg.3', label: 'Primera B (Argentina)' },
  { id: 'soccer/bra.1', label: 'Brasileirão Serie A' },
  { id: 'soccer/bra.2', label: 'Brasileirão Serie B' },
  { id: 'soccer/ecu.1', label: 'LigaPro (Ecuador)' },
  { id: 'soccer/uru.1', label: 'Liga AUF (Uruguay)' },
  { id: 'soccer/col.1', label: 'Primera A (Colombia)' },
  { id: 'soccer/per.1', label: 'Liga 1 (Perú)' },
  { id: 'soccer/chi.1', label: 'Primera División (Chile)' },
  { id: 'soccer/par.1', label: 'Primera División (Paraguay)' },
  { id: 'soccer/bol.1', label: 'Liga Profesional (Bolivia)' },
  { id: 'soccer/ven.1', label: 'Primera División (Venezuela)' },
  { id: 'soccer/crc.1', label: 'Primera División (Costa Rica)' },
  { id: 'soccer/gua.1', label: 'Liga Nacional (Guatemala)' },
  { id: 'soccer/hon.1', label: 'Liga Nacional (Honduras)' },
  { id: 'soccer/slv.1', label: 'Primera División (El Salvador)' },
  { id: 'soccer/esp.1', label: 'LaLiga (España)' },
  { id: 'soccer/eng.1', label: 'Premier League (Inglaterra)' },
  { id: 'soccer/ita.1', label: 'Serie A (Italia)' },
  { id: 'soccer/ger.1', label: 'Bundesliga (Alemania)' },
  { id: 'soccer/fra.1', label: 'Ligue 1 (Francia)' },
  { id: 'soccer/por.1', label: 'Primeira Liga (Portugal)' },
  { id: 'soccer/ned.1', label: 'Eredivisie (Países Bajos)' },
  { id: 'soccer/uefa.champions', label: 'UEFA Champions League' },
  { id: 'soccer/uefa.europa', label: 'UEFA Europa League' },
  { id: 'soccer/conmebol.libertadores', label: 'Copa Libertadores' },
  { id: 'soccer/conmebol.sudamericana', label: 'Copa Sudamericana' },
  { id: 'soccer/concacaf.leagues.cup', label: 'Leagues Cup' }
];
import { 
  defaultCasaAdjustRanges, 
  defaultVisitAdjustRanges, 
  defaultSiNoPrecios, 
  defaultPaPrecios, 
  defaultTercioPrecios, 
  defaultTercioMlRules,
  defaultMlbRunlineRules,
  defaultMargins
} from './defaultData';

function tercioRuleKey(rule) {
  return [
    Number(rule.total),
    String(rule.tipoH || '').toUpperCase(),
    String(rule.lineaH || ''),
    Number(rule.tercio),
    String(rule.tipoT || '').toUpperCase(),
    String(rule.lineaT || '')
  ].join('|');
}

function siNoRuleKey(rule) {
  return [
    Number(rule.total),
    String(rule.tipo || '').toUpperCase(),
    String(rule.linea || '')
  ].join('|');
}

function mergeMissingDefaultSiNoRules(configData) {
  if (!Array.isArray(configData?.preciosSiNo)) return configData;
  const existing = new Set(configData.preciosSiNo.map(siNoRuleKey));
  defaultSiNoPrecios.forEach(rule => {
    const key = siNoRuleKey(rule);
    if (!existing.has(key)) {
      configData.preciosSiNo.push(rule);
      existing.add(key);
    }
  });
  return configData;
}

function mergeMissingDefaultTercioRules(configData) {
  if (!Array.isArray(configData?.preciosTercio)) return configData;
  const existing = new Set(configData.preciosTercio.map(tercioRuleKey));
  defaultTercioPrecios.forEach(rule => {
    const key = tercioRuleKey(rule);
    if (!existing.has(key)) {
      configData.preciosTercio.push(rule);
      existing.add(key);
    }
  });
  return configData;
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [config, setConfig] = useState(null);
  const [dashboardGames, setDashboardGames] = useState([]);
  const [dashboardExpandedGames, setDashboardExpandedGames] = useState({});
  // --- Carga Inicial de Configuraciones ---
  useEffect(() => {
    // Intentar obtener la configuración del servidor
    fetch('./api.php?action=get')
      .then(res => {
        if (!res.ok) throw new Error("Error de red o archivo ausente");
        return res.json();
      })
      .then(serverData => {
        if (serverData && typeof serverData === 'object' && serverData.preciosTercio) {
          // Rellenar reglas de runline si faltan en la versión del servidor
          if (!serverData.mlbRunlineRules || serverData.mlbRunlineRules.length < defaultMlbRunlineRules.length) {
            serverData.mlbRunlineRules = defaultMlbRunlineRules;
          }
          if (!serverData.margins) {
            serverData.margins = defaultMargins;
          }
          if (serverData.enableRunlines === undefined) {
            serverData.enableRunlines = false;
          }
          mergeMissingDefaultSiNoRules(serverData);
          mergeMissingDefaultTercioRules(serverData);

          console.log("Configuración cargada desde el servidor.");
          setConfig(serverData);
          localStorage.setItem('parley_calc_config', JSON.stringify(serverData));
        } else {
          loadLocalOrBackup();
        }
      })
      .catch(err => {
        console.warn("No se pudo cargar del servidor, usando local/respaldo:", err.message);
        loadLocalOrBackup();
      });
  }, []);

  const loadLocalOrBackup = () => {
    const local = localStorage.getItem('parley_calc_config');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (!parsed.mlbRunlineRules || parsed.mlbRunlineRules.length < defaultMlbRunlineRules.length) {
          parsed.mlbRunlineRules = defaultMlbRunlineRules;
          localStorage.setItem('parley_calc_config', JSON.stringify(parsed));
        }
        if (!parsed.margins) {
          parsed.margins = defaultMargins;
          localStorage.setItem('parley_calc_config', JSON.stringify(parsed));
        }
        if (parsed.enableRunlines === undefined) {
          parsed.enableRunlines = false;
          localStorage.setItem('parley_calc_config', JSON.stringify(parsed));
        }
        mergeMissingDefaultSiNoRules(parsed);
        mergeMissingDefaultTercioRules(parsed);
        localStorage.setItem('parley_calc_config', JSON.stringify(parsed));

        setConfig(parsed);
      } catch (e) {
        console.error("Error cargando configuración local", e);
        loadDefaultConfig();
      }
    } else {
      loadDefaultConfig();
    }
  };

  const loadDefaultConfig = () => {
    const defaultConfig = {
      casaAdjustRanges: defaultCasaAdjustRanges,
      visitAdjustRanges: defaultVisitAdjustRanges,
      preciosSiNo: defaultSiNoPrecios,
      preciosPa: defaultPaPrecios,
      preciosTercio: defaultTercioPrecios,
      tercioMlRules: defaultTercioMlRules,
      mlbRunlineRules: defaultMlbRunlineRules,
      margins: defaultMargins,
      enableRunlines: false
    };
    setConfig(defaultConfig);
  };

  // --- Guardar Configuración ---
  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    // 1. Respaldar localmente
    localStorage.setItem('parley_calc_config', JSON.stringify(newConfig));

    // 2. Guardar en el servidor de forma compartida
    fetch('./api.php?action=save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newConfig)
    })
      .then(res => {
        if (!res.ok) throw new Error("Error al escribir configuración en servidor");
        return res.json();
      })
      .then(data => {
        console.log("Configuración guardada y sincronizada en el servidor:", data);
      })
      .catch(err => {
        console.error("Fallo al sincronizar reglas con el servidor:", err.message);
      });
  };
  if (!config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#060813', color: '#f8fafc' }}>
        <h2>Cargando aplicación...</h2>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navigation activePage={activePage} setActivePage={setActivePage} />
      
      <main className="main-content">
        {activePage === 'dashboard' && (
          <Dashboard
            config={config}
            parsedGames={dashboardGames}
            setParsedGames={setDashboardGames}
            expandedGames={dashboardExpandedGames}
            setExpandedGames={setDashboardExpandedGames}
          />
        )}

        {activePage === 'parley' && (
          <CalculadoraParley />
        )}

        {activePage === 'tickets' && (
          <FraccionarTickets />
        )}
        
        {activePage === 'bases_alcanzadas' && (
          <BasesAlcanzadas config={config} />
        )}

        {activePage === 'basket' && (
          <ScoreboardDeporte
            titulo="Básquetbol — NBA e Internacional"
            icono="🏀"
            ligas={LIGAS_BASKET}
            tipoAlertas="basket"
            agrupado
          />
        )}

        {activePage === 'soccer' && (
          <ScoreboardDeporte
            titulo="Soccer"
            icono="⚽"
            ligas={LIGAS_SOCCER}
            ordenLocalPrimero
            tipoAlertas="soccer"
            agrupado
          />
        )}
        
        {activePage === 'settings' && (
          <Settings config={config} onSaveConfig={handleSaveConfig} dashboardGames={dashboardGames} />
        )}
      </main>
    </div>
  );
}

