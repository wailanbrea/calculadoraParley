import React, { useState } from 'react';
import MLBLineups from './MLBLineups';
import BasesAlcanzadas from './BasesAlcanzadas';

// Módulo MLB: reúne el predictor de lineups + bases alcanzadas (nuevo) y el
// seguimiento de bases en vivo que ya existía, en pestañas.
export default function MLBModulo({ config }) {
  const [tab, setTab] = useState('lineups');

  const btn = (id, label) => (
    <button onClick={() => setTab(id)} style={{
      padding: '8px 16px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600,
      border: 'none', borderBottom: '2px solid ' + (tab === id ? '#00d2ff' : 'transparent'),
      background: 'transparent', color: tab === id ? '#67e8f9' : '#94a3b8',
    }}>{label}</button>
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0b1220 0%, #0b0f19 100%)',
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
        {btn('lineups', '⚾ Lineups & Predicción')}
        {btn('bases', '📊 Seguimiento de bases')}
      </div>
      {tab === 'lineups' ? <MLBLineups /> : <BasesAlcanzadas config={config} />}
    </div>
  );
}
