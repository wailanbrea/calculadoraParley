import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const STORAGE_KEY = 'closing_sequence_state_v1';
const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const WEEKEND_DAYS = ['Viernes', 'Sabado', 'Domingo'];
const STATUS_OPTIONS = ['Pendiente', 'Generado', 'Confirmado', 'En curso', 'Completado', 'Cancelado', 'Modificado'];
const ABSENCE_TYPES = ['Libre', 'Vacaciones', 'Permiso', 'Cambio de turno', 'Enfermedad', 'Sustitucion', 'Otro'];

const defaultEmployees = [
  { id: 'emp-1', name: 'Wailan', canCloseAlone: true, canMiniRotate: true, level: 'Senior', active: true },
  { id: 'emp-2', name: 'Ariel', canCloseAlone: true, canMiniRotate: true, level: 'Senior', active: true },
  { id: 'emp-3', name: 'Michael', canCloseAlone: true, canMiniRotate: true, level: 'Semi Senior', active: true },
  { id: 'emp-4', name: 'Daniel', canCloseAlone: true, canMiniRotate: true, level: 'Semi Senior', active: true },
  { id: 'emp-5', name: 'Guillermo', canCloseAlone: false, canMiniRotate: true, level: 'Junior', active: true }
];

const defaultSettings = {
  startTime: '16:00',
  endTime: '00:00',
  firstExitTime: '22:00',
  closingCount: 2,
  miniRotationSize: 2,
  timezone: 'America/Santo_Domingo',
  maxEmployees: 5,
  generationDay: 'Jueves'
};

const defaultState = {
  employees: defaultEmployees,
  settings: defaultSettings,
  templates: {
    Lunes: ['emp-1', 'emp-2', 'emp-3'],
    Martes: ['emp-1', 'emp-2', 'emp-3'],
    Miercoles: ['emp-1', 'emp-2', 'emp-3'],
    Jueves: ['emp-1', 'emp-2', 'emp-3']
  },
  rotations: {},
  schedules: [],
  logs: []
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
      employees: Array.isArray(parsed.employees) ? parsed.employees : defaultEmployees,
      templates: { ...defaultState.templates, ...(parsed.templates || {}) },
      rotations: parsed.rotations || {},
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : []
    };
  } catch {
    return defaultState;
  }
}

function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function groupKey(ids) {
  return [...new Set(ids)].sort().join('-');
}

function rotate(ids, cursor = 0) {
  if (!ids.length) return [];
  const safeCursor = cursor % ids.length;
  return [...ids.slice(safeCursor), ...ids.slice(0, safeCursor)];
}

function nextIsoDate(dateIso, offsetDays) {
  const base = dateIso ? new Date(`${dateIso}T12:00:00`) : new Date();
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function getNextWeekendStart() {
  const today = new Date();
  const currentDay = today.getDay();
  const fridayIndex = 5;
  const diff = (fridayIndex - currentDay + 7) % 7 || 7;
  today.setDate(today.getDate() + diff);
  return today.toISOString().slice(0, 10);
}

function dayNameFromDate(dateIso) {
  const dayIndex = new Date(`${dateIso}T12:00:00`).getDay();
  return ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'][dayIndex];
}

function employeeNameMap(employees) {
  return Object.fromEntries(employees.map(emp => [emp.id, emp.name]));
}

function names(ids, nameMap) {
  return ids.map(id => nameMap[id] || id);
}

function calculateShift(employeeIds, rotations, settings) {
  const uniqueIds = [...new Set(employeeIds)].filter(Boolean);
  if (!uniqueIds.length) {
    return { groupKey: '', order: [], primaryOrder: [], miniOrder: [], closerId: '', reason: 'Sin empleados seleccionados' };
  }

  const mainKey = groupKey(uniqueIds);
  const mainCursor = rotations[mainKey]?.cursor || 0;
  const primaryOrder = rotate(uniqueIds, mainCursor);
  const closingCount = Math.max(1, Math.min(Number(settings.closingCount) || 2, primaryOrder.length));
  const earlyCount = Math.max(0, primaryOrder.length - closingCount);
  const earlyOrder = primaryOrder.slice(0, earlyCount);
  const closingPool = primaryOrder.slice(earlyCount);

  let miniOrder = closingPool;
  let miniKey = '';
  if (closingPool.length > 1) {
    miniKey = groupKey(closingPool);
    const miniCursor = rotations[miniKey]?.cursor || 0;
    miniOrder = rotate(closingPool, miniCursor);
  }

  const order = [...earlyOrder, ...miniOrder];
  return {
    groupKey: mainKey,
    miniKey,
    order,
    primaryOrder,
    miniOrder,
    closerId: order[order.length - 1] || '',
    reason: miniKey ? 'Mini rotacion aplicada al grupo de cierre' : 'Rotacion principal aplicada'
  };
}

function advanceRotation(rotations, ids) {
  if (!ids.length) return rotations;
  const key = groupKey(ids);
  const current = rotations[key]?.cursor || 0;
  return {
    ...rotations,
    [key]: {
      cursor: (current + 1) % ids.length,
      lastAdvancedAt: new Date().toISOString()
    }
  };
}

function buildLog(action, payload) {
  return {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    at: new Date().toISOString(),
    user: 'Local',
    payload
  };
}

export default function SecuenciaCierre() {
  const [state, setState] = useState(loadState);
  const [activeTab, setActiveTab] = useState('generador');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [weekStart, setWeekStart] = useState(getNextWeekendStart);
  const [weekendSelection, setWeekendSelection] = useState({
    Viernes: ['emp-1', 'emp-2', 'emp-3'],
    Sabado: ['emp-2', 'emp-3', 'emp-4'],
    Domingo: ['emp-1', 'emp-4', 'emp-5']
  });
  const [simSelection, setSimSelection] = useState(['emp-1', 'emp-2', 'emp-3']);
  const [simCount, setSimCount] = useState(10);

  const nameMap = useMemo(() => employeeNameMap(state.employees), [state.employees]);
  const activeEmployees = state.employees.filter(emp => emp.active);

  const selectedShift = state.schedules.find(shift => shift.id === selectedShiftId) || null;
  const calendarEvents = state.schedules.map(shift => ({
    id: shift.id,
    title: `${shift.day}: ${names(shift.order, nameMap).join(' > ')}`,
    start: shift.date,
    allDay: true,
    backgroundColor: shift.status === 'Completado' ? '#059669' : shift.status === 'Cancelado' ? '#dc2626' : '#7c3aed',
    borderColor: shift.status === 'Completado' ? '#059669' : shift.status === 'Cancelado' ? '#dc2626' : '#7c3aed',
    extendedProps: { status: shift.status, closer: nameMap[shift.closerId] || '-' }
  }));
  const weekendPreview = WEEKEND_DAYS.map((day, index) => {
    const date = nextIsoDate(weekStart, index);
    const employeeIds = weekendSelection[day] || [];
    return {
      id: `preview-${day}`,
      date,
      day,
      employeeIds,
      result: calculateShift(employeeIds, state.rotations, state.settings)
    };
  });

  function persist(updater) {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveState(next);
      return next;
    });
  }

  function toggleSelection(day, employeeId) {
    setWeekendSelection(prev => {
      const current = prev[day] || [];
      const exists = current.includes(employeeId);
      return {
        ...prev,
        [day]: exists ? current.filter(id => id !== employeeId) : [...current, employeeId]
      };
    });
  }

  function toggleTemplate(day, employeeId) {
    persist(prev => {
      const current = prev.templates[day] || [];
      const exists = current.includes(employeeId);
      const templates = {
        ...prev.templates,
        [day]: exists ? current.filter(id => id !== employeeId) : [...current, employeeId]
      };
      return { ...prev, templates, logs: [buildLog('template.updated', { day, employees: templates[day] }), ...prev.logs] };
    });
  }

  function generateWeekend() {
    const shifts = weekendPreview.map(item => ({
      id: `shift-${item.date}-${item.day}-${Date.now()}`,
      date: item.date,
      day: item.day,
      startTime: state.settings.startTime,
      endTime: state.settings.endTime,
      firstExitTime: state.settings.firstExitTime,
      employeeIds: item.employeeIds,
      order: item.result.order,
      primaryOrder: item.result.primaryOrder,
      miniOrder: item.result.miniOrder,
      groupKey: item.result.groupKey,
      miniKey: item.result.miniKey,
      closerId: item.result.closerId,
      status: 'Generado',
      absenceType: '',
      notes: '',
      reason: item.result.reason,
      completedAt: null
    }));

    persist(prev => {
      const otherSchedules = prev.schedules.filter(existing => !shifts.some(next => next.date === existing.date));
      return {
        ...prev,
        schedules: [...otherSchedules, ...shifts].sort((a, b) => a.date.localeCompare(b.date)),
        logs: [buildLog('weekend.generated', { weekStart, shifts }), ...prev.logs]
      };
    });
    setActiveTab('calendario');
  }

  function addEmployee() {
    const name = newEmployeeName.trim();
    if (!name) return;
    persist(prev => ({
      ...prev,
      employees: [
        ...prev.employees,
        { id: `emp-${Date.now()}`, name, canCloseAlone: true, canMiniRotate: true, level: 'Semi Senior', active: true }
      ],
      logs: [buildLog('employee.created', { name }), ...prev.logs]
    }));
    setNewEmployeeName('');
  }

  function updateEmployee(id, patch) {
    persist(prev => ({
      ...prev,
      employees: prev.employees.map(emp => emp.id === id ? { ...emp, ...patch } : emp),
      logs: [buildLog('employee.updated', { id, patch }), ...prev.logs]
    }));
  }

  function updateSettings(patch) {
    persist(prev => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }

  function updateShift(id, patch) {
    persist(prev => ({
      ...prev,
      schedules: prev.schedules.map(shift => shift.id === id ? { ...shift, ...patch, status: patch.status || 'Modificado' } : shift),
      logs: [buildLog('shift.updated', { id, patch }), ...prev.logs]
    }));
  }

  function recalculateShift(id) {
    persist(prev => ({
      ...prev,
      schedules: prev.schedules.map(shift => {
        if (shift.id !== id) return shift;
        const result = calculateShift(shift.employeeIds, prev.rotations, prev.settings);
        return {
          ...shift,
          order: result.order,
          primaryOrder: result.primaryOrder,
          miniOrder: result.miniOrder,
          groupKey: result.groupKey,
          miniKey: result.miniKey,
          closerId: result.closerId,
          reason: result.reason,
          status: 'Modificado'
        };
      }),
      logs: [buildLog('shift.recalculated', { id }), ...prev.logs]
    }));
  }

  function completeShift(id) {
    persist(prev => {
      const shift = prev.schedules.find(item => item.id === id);
      if (!shift || shift.status === 'Completado') return prev;
      let rotations = advanceRotation(prev.rotations, shift.employeeIds);
      if (shift.miniOrder?.length > 1) rotations = advanceRotation(rotations, shift.miniOrder);
      return {
        ...prev,
        rotations,
        schedules: prev.schedules.map(item => item.id === id ? { ...item, status: 'Completado', completedAt: new Date().toISOString() } : item),
        logs: [buildLog('shift.completed', { id, groupKey: shift.groupKey, miniKey: shift.miniKey, closerId: shift.closerId }), ...prev.logs]
      };
    });
  }

  function moveShift(info) {
    const nextDate = info.event.startStr;
    updateShift(info.event.id, { date: nextDate, day: dayNameFromDate(nextDate) });
  }

  function runSimulation() {
    let rotations = { ...state.rotations };
    const rows = [];
    for (let i = 1; i <= Number(simCount); i++) {
      const result = calculateShift(simSelection, rotations, state.settings);
      rows.push({ n: i, ...result });
      rotations = advanceRotation(rotations, simSelection);
      if (result.miniOrder?.length > 1) rotations = advanceRotation(rotations, result.miniOrder);
    }
    return rows;
  }

  const stats = useMemo(() => {
    const base = Object.fromEntries(state.employees.map(emp => [emp.id, {
      name: emp.name,
      first: 0,
      second: 0,
      third: 0,
      last: 0,
      closed: 0,
      beforeClose: 0,
      absences: 0
    }]));

    state.schedules.forEach(shift => {
      if (shift.absenceType) {
        shift.employeeIds.forEach(id => { if (base[id]) base[id].absences += 1; });
      }
      shift.order.forEach((id, index) => {
        if (!base[id]) return;
        if (index === 0) base[id].first += 1;
        if (index === 1) base[id].second += 1;
        if (index === 2) base[id].third += 1;
        if (index === shift.order.length - 1) {
          base[id].last += 1;
          base[id].closed += 1;
        } else {
          base[id].beforeClose += 1;
        }
      });
    });
    return Object.values(base);
  }, [state.employees, state.schedules]);

  const simulation = runSimulation();

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Secuencia de Cierre</h2>
          <p className="page-subtitle">Motor independiente para rotaciones, mini rotaciones, cierres y calendario semanal.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {['generador', 'calendario', 'empleados', 'plantillas', 'simulador', 'estadisticas', 'historial'].map(tab => (
            <button
              key={tab}
              type="button"
              className={`filter-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'generador' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(360px, 1.1fr)', gap: '1.5rem' }}>
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Generar fin de semana</h3>
            <div className="form-group">
              <label className="form-label">Viernes de la semana</label>
              <input className="form-input" type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
            </div>
            {WEEKEND_DAYS.map(day => (
              <div key={day} style={{ marginTop: '1.25rem' }}>
                <div className="form-label">{day}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                  {activeEmployees.map(emp => (
                    <label key={`${day}-${emp.id}`} className="filter-btn" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(weekendSelection[day] || []).includes(emp.id)}
                        onChange={() => toggleSelection(day, emp.id)}
                      />
                      {emp.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={generateWeekend}>
              Generar Fin de Semana
            </button>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Vista previa</h3>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {weekendPreview.map(item => (
                <div key={item.id} className="result-card" style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <strong>{item.day} · {item.date}</strong>
                    <span className="badge badge-review">{item.result.groupKey || 'Sin grupo'}</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Personal: {names(item.employeeIds, nameMap).join(', ') || 'Ninguno'}</div>
                  <div style={{ marginTop: '0.5rem' }}>Orden final: <strong>{names(item.result.order, nameMap).join(' → ') || '-'}</strong></div>
                  <div style={{ marginTop: '0.4rem', color: 'var(--color-ok)' }}>Cierra: {nameMap[item.result.closerId] || '-'}</div>
                  <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)' }}>{item.result.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendario' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) minmax(320px, 0.8fr)', gap: '1.5rem' }}>
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Calendario de turnos</h3>
            <div className="closing-calendar">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={calendarEvents}
                editable
                eventDrop={moveShift}
                eventClick={(info) => setSelectedShiftId(info.event.id)}
                height="auto"
                locale="es"
                buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Agenda' }}
                eventDidMount={(info) => {
                  info.el.title = `Estado: ${info.event.extendedProps.status}\nCierra: ${info.event.extendedProps.closer}`;
                }}
              />
              {state.schedules.length === 0 && <div className="badge badge-review" style={{ marginTop: '1rem' }}>No hay turnos generados.</div>}
            </div>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Detalle del dia</h3>
            {!selectedShift ? (
              <p style={{ color: 'var(--text-muted)' }}>Selecciona un turno del calendario.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div><strong>{selectedShift.day}</strong> · {selectedShift.date}</div>
                <div>Horario: {selectedShift.startTime} - {selectedShift.endTime}</div>
                <div>Personal: {names(selectedShift.employeeIds, nameMap).join(', ')}</div>
                <div>Orden principal: {names(selectedShift.primaryOrder, nameMap).join(' → ')}</div>
                <div>Mini rotacion: {names(selectedShift.miniOrder, nameMap).join(' → ') || '-'}</div>
                <div>Cierra: <strong>{nameMap[selectedShift.closerId] || '-'}</strong></div>
                <div>Motivo: {selectedShift.reason}</div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={selectedShift.status} onChange={e => updateShift(selectedShift.id, { status: e.target.value })}>
                    {STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ausencia / sustitucion</label>
                  <select className="form-input" value={selectedShift.absenceType || ''} onChange={e => updateShift(selectedShift.id, { absenceType: e.target.value })}>
                    <option value="">Ninguna</option>
                    {ABSENCE_TYPES.map(type => <option key={type}>{type}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea className="form-input" rows={3} value={selectedShift.notes || ''} onChange={e => updateShift(selectedShift.id, { notes: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => recalculateShift(selectedShift.id)}>Recalcular</button>
                  <button type="button" className="btn btn-success" onClick={() => completeShift(selectedShift.id)}>Marcar completado</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'empleados' && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Empleados y capacidades</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input className="form-input" value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} placeholder="Nombre del empleado" />
            <button type="button" className="btn btn-primary" onClick={addEmployee}>Agregar</button>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {state.employees.map(emp => (
              <div key={emp.id} className="result-card" style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px 110px', gap: '0.75rem', alignItems: 'center', textAlign: 'left' }}>
                <input className="form-input" value={emp.name} onChange={e => updateEmployee(emp.id, { name: e.target.value })} />
                <select className="form-input" value={emp.level} onChange={e => updateEmployee(emp.id, { level: e.target.value })}>
                  <option>Junior</option>
                  <option>Semi Senior</option>
                  <option>Senior</option>
                </select>
                <label><input type="checkbox" checked={emp.canCloseAlone} onChange={e => updateEmployee(emp.id, { canCloseAlone: e.target.checked })} /> Cierra solo</label>
                <label><input type="checkbox" checked={emp.canMiniRotate} onChange={e => updateEmployee(emp.id, { canMiniRotate: e.target.checked })} /> Mini rotacion</label>
                <label><input type="checkbox" checked={emp.active} onChange={e => updateEmployee(emp.id, { active: e.target.checked })} /> Activo</label>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'plantillas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) minmax(280px, 0.8fr)', gap: '1.5rem' }}>
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Plantilla fija lunes a jueves</h3>
            {DAYS.slice(0, 4).map(day => (
              <div key={day} style={{ marginBottom: '1rem' }}>
                <div className="form-label">{day}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                  {activeEmployees.map(emp => (
                    <label key={`${day}-${emp.id}`} className="filter-btn" style={{ justifyContent: 'flex-start' }}>
                      <input type="checkbox" checked={(state.templates[day] || []).includes(emp.id)} onChange={() => toggleTemplate(day, emp.id)} />
                      {emp.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Configuracion</h3>
            {[
              ['startTime', 'Hora entrada', 'time'],
              ['endTime', 'Hora salida', 'time'],
              ['firstExitTime', 'Primera salida', 'time'],
              ['closingCount', 'Empleados que permanecen', 'number'],
              ['miniRotationSize', 'Tamano mini rotacion', 'number'],
              ['maxEmployees', 'Maximo empleados por turno', 'number']
            ].map(([key, label, type]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" type={type} value={state.settings[key]} onChange={e => updateSettings({ [key]: e.target.value })} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Zona horaria</label>
              <input className="form-input" value={state.settings.timezone} onChange={e => updateSettings({ timezone: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulador' && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Simulador de rotaciones futuras</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {activeEmployees.map(emp => (
                <label key={emp.id} className="filter-btn">
                  <input
                    type="checkbox"
                    checked={simSelection.includes(emp.id)}
                    onChange={() => setSimSelection(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])}
                  />
                  {emp.name}
                </label>
              ))}
            </div>
            <select className="form-input" value={simCount} onChange={e => setSimCount(e.target.value)}>
              {[5, 10, 20, 30].map(n => <option key={n} value={n}>{n} rotaciones</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {simulation.map(row => (
              <div key={row.n} className="result-card" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 180px', gap: '1rem', textAlign: 'left' }}>
                <strong>#{row.n}</strong>
                <span>{names(row.order, nameMap).join(' → ')}</span>
                <span style={{ color: 'var(--color-ok)' }}>Cierra: {nameMap[row.closerId] || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'estadisticas' && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Estadisticas de equidad</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="mapping-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Primero</th>
                  <th>Segundo</th>
                  <th>Tercero</th>
                  <th>Ultimo</th>
                  <th>Cerro</th>
                  <th>Salio antes</th>
                  <th>Ausencias</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(row => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.first}</td>
                    <td>{row.second}</td>
                    <td>{row.third}</td>
                    <td>{row.last}</td>
                    <td>{row.closed}</td>
                    <td>{row.beforeClose}</td>
                    <td>{row.absences}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Auditoria e historial</h3>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {state.logs.slice(0, 80).map(log => (
              <div key={log.id} className="result-card" style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <strong>{log.action}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(log.at).toLocaleString()}</span>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{JSON.stringify(log.payload, null, 2)}</pre>
              </div>
            ))}
            {state.logs.length === 0 && <div className="badge badge-review">Sin eventos registrados.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
