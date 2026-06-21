import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import CalculadoraParley from './components/CalculadoraParley';
import FraccionarTickets from './components/FraccionarTickets';
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
      margins: defaultMargins
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
        
        {activePage === 'settings' && (
          <Settings config={config} onSaveConfig={handleSaveConfig} dashboardGames={dashboardGames} />
        )}
      </main>
    </div>
  );
}

