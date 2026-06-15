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
  defaultMlbRunlineRules
} from './defaultData';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [config, setConfig] = useState(null);

  // --- Carga Inicial de Configuraciones ---
  useEffect(() => {
    const local = localStorage.getItem('parley_calc_config');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (!parsed.mlbRunlineRules || parsed.mlbRunlineRules.length < defaultMlbRunlineRules.length) {
          parsed.mlbRunlineRules = defaultMlbRunlineRules;
          localStorage.setItem('parley_calc_config', JSON.stringify(parsed));
        }
        setConfig(parsed);
      } catch (e) {
        console.error("Error cargando la configuración local", e);
        loadDefaultConfig();
      }
    } else {
      loadDefaultConfig();
    }
  }, []);

  const loadDefaultConfig = () => {
    const defaultConfig = {
      casaAdjustRanges: defaultCasaAdjustRanges,
      visitAdjustRanges: defaultVisitAdjustRanges,
      preciosSiNo: defaultSiNoPrecios,
      preciosPa: defaultPaPrecios,
      preciosTercio: defaultTercioPrecios,
      tercioMlRules: defaultTercioMlRules,
      mlbRunlineRules: defaultMlbRunlineRules
    };
    setConfig(defaultConfig);
  };

  // --- Guardar Configuración ---
  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('parley_calc_config', JSON.stringify(newConfig));
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
          <Dashboard config={config} />
        )}

        {activePage === 'parley' && (
          <CalculadoraParley />
        )}

        {activePage === 'tickets' && (
          <FraccionarTickets />
        )}
        
        {activePage === 'settings' && (
          <Settings config={config} onSaveConfig={handleSaveConfig} />
        )}
      </main>
    </div>
  );
}

