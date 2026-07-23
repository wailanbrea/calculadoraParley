import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const STORAGE_KEY = 'closing_sequence_state_v1';
const HISTORY_SEED_VERSION = '2026-07-23-secuencia-real-v4';
const ACCESS_PASSWORD = 'ubet@';
const STATS_PASSWORD = 'ubet0909';
const FIXED_START_TIME = '16:00';
const FIXED_END_TIME = '00:00';
const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const GENERATION_DAYS = ['Viernes', 'Sabado', 'Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves'];
const STATUS_OPTIONS = ['Pendiente', 'Generado', 'Confirmado', 'En curso', 'Completado', 'Cancelado', 'Modificado'];
const ABSENCE_TYPES = ['Libre', 'Vacaciones', 'Permiso', 'Cambio de turno', 'Enfermedad', 'Sustitucion', 'Otro'];

const defaultEmployees = [
  { id: 'emp-1', name: 'Daniel', canCloseAlone: true, canMiniRotate: true, level: 'Senior', active: true },
  { id: 'emp-2', name: 'Ariel', canCloseAlone: true, canMiniRotate: true, level: 'Senior', active: true },
  { id: 'emp-3', name: 'Diego', canCloseAlone: true, canMiniRotate: true, level: 'Semi Senior', active: true },
  { id: 'emp-4', name: 'Chamo', canCloseAlone: true, canMiniRotate: true, level: 'Semi Senior', active: true },
  { id: 'emp-5', name: 'Michael', canCloseAlone: false, canMiniRotate: false, level: 'Semi Senior', active: true },
  { id: 'emp-6', name: 'Guillermo', canCloseAlone: false, canMiniRotate: false, level: 'Semi Senior', active: true }
];

const EMPLOYEE_IDS = {
  Daniel: 'emp-1',
  Ariel: 'emp-2',
  Diego: 'emp-3',
  Chamo: 'emp-4',
  Michael: 'emp-5',
  Guillermo: 'emp-6'
};

const historicalSequence = [
  { date: '2026-06-15', day: 'Lunes', names: ['Daniel', 'Michael', 'Diego'] },
  { date: '2026-06-18', day: 'Jueves', names: ['Michael', 'Ariel', 'Daniel'] },
  { date: '2026-06-19', day: 'Viernes', names: ['Michael', 'Ariel', 'Chamo'] },
  { date: '2026-06-20', day: 'Sabado', names: ['Ariel', 'Daniel'] },
  { date: '2026-06-21', day: 'Domingo', names: [] },
  { date: '2026-06-22', day: 'Lunes', names: ['Daniel', 'Michael', 'Diego'], miniApplied: ['Daniel'] },
  { date: '2026-06-23', day: 'Martes', names: [] },
  { date: '2026-06-24', day: 'Miercoles', names: ['Chamo', 'Ariel'] },
  { date: '2026-06-25', day: 'Jueves', names: [] },
  { date: '2026-06-26', day: 'Viernes', names: ['Michael', 'Ariel', 'Daniel'] },
  { date: '2026-06-27', day: 'Sabado', names: ['Ariel', 'Chamo'] },
  { date: '2026-06-28', day: 'Domingo', names: [] },
  { date: '2026-06-29', day: 'Lunes', names: ['Michael', 'Diego', 'Daniel'], miniApplied: ['Daniel'] },
  { date: '2026-06-30', day: 'Martes', names: [] },
  { date: '2026-07-01', day: 'Miercoles', names: ['Chamo', 'Ariel'] },
  { date: '2026-07-02', day: 'Jueves', names: ['Ariel', 'Daniel', 'Michael'] },
  { date: '2026-07-03', day: 'Viernes', names: ['Chamo', 'Guillermo', 'Ariel'] },
  { date: '2026-07-04', day: 'Sabado', names: ['Guillermo', 'Ariel', 'Daniel'], miniApplied: ['Ariel'] },
  { date: '2026-07-05', day: 'Domingo', names: [] },
  { date: '2026-07-06', day: 'Lunes', names: ['Diego', 'Daniel', 'Michael'], miniApplied: ['Daniel'] },
  { date: '2026-07-07', day: 'Martes', names: ['Daniel', 'Michael', 'Ariel'] },
  { date: '2026-07-08', day: 'Miercoles', names: ['Guillermo', 'Ariel', 'Chamo'] },
  { date: '2026-07-09', day: 'Jueves', names: ['Michael', 'Ariel', 'Daniel'], miniApplied: ['Daniel'] },
  { date: '2026-07-10', day: 'Viernes', names: ['Ariel', 'Daniel', 'Michael'] },
  { date: '2026-07-11', day: 'Sabado', names: ['Ariel', 'Chamo', 'Michael'] },
  { date: '2026-07-12', day: 'Domingo', names: ['Chamo', 'Michael', 'Ariel'] },
  { date: '2026-07-13', day: 'Lunes', names: [] },
  { date: '2026-07-14', day: 'Martes', names: [] },
  { date: '2026-07-15', day: 'Miercoles', names: [] },
  { date: '2026-07-16', day: 'Jueves', names: [] },
  { date: '2026-07-17', day: 'Viernes', names: ['Ariel', 'Daniel', 'Guillermo'] },
  { date: '2026-07-18', day: 'Sabado', names: ['Michael', 'Ariel', 'Chamo'] },
  { date: '2026-07-19', day: 'Domingo', names: ['Ariel', 'Daniel'], miniApplied: ['Daniel'] },
  { date: '2026-07-20', day: 'Lunes', names: ['Michael', 'Diego', 'Daniel'], miniApplied: ['Daniel'] },
  { date: '2026-07-21', day: 'Martes', names: ['Michael', 'Daniel', 'Ariel'], miniApplied: ['Ariel'] },
  { date: '2026-07-22', day: 'Miercoles', names: ['Ariel', 'Chamo', 'Guillermo'] },
  { date: '2026-07-23', day: 'Jueves', names: ['Ariel', 'Daniel', 'Michael'] }
];

const defaultSettings = {
  startTime: FIXED_START_TIME,
  endTime: FIXED_END_TIME,
  firstExitTime: '22:00',
  closingCount: 2,
  miniRotationSize: 2,
  sequenceMode: 'pair',
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
  logs: [],
  historySeedVersion: ''
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = applyHistoricalSeed(defaultState);
      saveState(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    const loadedState = {
      ...defaultState,
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
      employees: Array.isArray(parsed.employees) ? parsed.employees : defaultEmployees,
      templates: { ...defaultState.templates, ...(parsed.templates || {}) },
      rotations: parsed.rotations || {},
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      historySeedVersion: parsed.historySeedVersion || ''
    };
    if (loadedState.historySeedVersion !== HISTORY_SEED_VERSION) {
      const seeded = applyHistoricalSeed(loadedState);
      saveState(seeded);
      return seeded;
    }
    return loadedState;
  } catch {
    const seeded = applyHistoricalSeed(defaultState);
    saveState(seeded);
    return seeded;
  }
}

function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function groupKey(ids) {
  return [...new Set(ids)].sort().join('-');
}

function sameGroup(idsA, idsB) {
  return groupKey(idsA) === groupKey(idsB);
}

function sequenceForRotation(ids, rotationState) {
  if (Array.isArray(rotationState?.sequence) && sameGroup(ids, rotationState.sequence)) {
    return rotationState.sequence;
  }
  return ids;
}

function rotate(ids, cursor = 0) {
  if (!ids.length) return [];
  const safeCursor = cursor % ids.length;
  return [...ids.slice(safeCursor), ...ids.slice(0, safeCursor)];
}

function idsFromNames(list) {
  return list.map(name => EMPLOYEE_IDS[name]).filter(Boolean);
}

function setRotationFromSequence(rotations, ids, sequence, date) {
  if (!ids.length) return rotations;
  const key = groupKey(ids);
  const normalizedSequence = sequenceForRotation(ids, { sequence });
  return {
    ...rotations,
    [key]: {
      sequence: normalizedSequence,
      cursor: normalizedSequence.length > 1 ? 1 : 0,
      lastAdvancedAt: `${date}T23:59:00`
    }
  };
}

function buildHistoricalSchedules() {
  return historicalSequence.map(item => {
    const employeeIds = idsFromNames(item.names);
    const isEmpty = employeeIds.length === 0;
    const closingPool = employeeIds.length > 1 ? employeeIds.slice(-2) : [];
    const miniOrder = item.miniApplied?.length && canMiniRotateGroup(closingPool, defaultEmployees) ? closingPool : [];
    return {
      id: `hist-${item.date}`,
      date: item.date,
      day: item.day,
      startTime: defaultSettings.startTime,
      endTime: defaultSettings.endTime,
      firstExitTime: defaultSettings.firstExitTime,
      employeeIds,
      order: employeeIds,
      primaryOrder: employeeIds,
      miniOrder,
      groupKey: isEmpty ? '' : groupKey(employeeIds),
      miniKey: miniOrder.length > 1 ? groupKey(miniOrder) : '',
      closerId: employeeIds[employeeIds.length - 1] || '',
      status: isEmpty ? 'Cancelado' : 'Completado',
      absenceType: isEmpty ? 'Sin Secuencia' : '',
      notes: item.miniApplied?.length ? `Mini secuencia aplicada: ${item.miniApplied.join(', ')}` : '',
      reason: isEmpty ? 'Sin Secuencia' : 'Historial real cargado',
      completedAt: isEmpty ? null : `${item.date}T23:59:00`
    };
  });
}

function buildHistoricalRotations() {
  return historicalSequence.reduce((rotations, item) => {
    const employeeIds = idsFromNames(item.names);
    if (!employeeIds.length) return rotations;
    let nextRotations = setRotationFromSequence(rotations, employeeIds, employeeIds, item.date);
    if (employeeIds.length > 2 && item.miniApplied?.length) {
      const miniOrder = employeeIds.slice(-2);
      if (canMiniRotateGroup(miniOrder, defaultEmployees)) {
        nextRotations = setRotationFromSequence(nextRotations, miniOrder, miniOrder, item.date);
      }
    }
    return nextRotations;
  }, {});
}

function applyHistoricalSeed(state) {
  const historicalSchedules = buildHistoricalSchedules();
  const historicalIds = new Set(historicalSchedules.map(item => item.id));
  const schedules = [
    ...state.schedules.filter(item => !historicalIds.has(item.id)),
    ...historicalSchedules
  ].sort((a, b) => a.date.localeCompare(b.date));

  return {
    ...state,
    employees: Array.isArray(state.employees) && state.employees.length ? state.employees : defaultEmployees,
    rotations: {
      ...state.rotations,
      ...buildHistoricalRotations()
    },
    schedules,
    historySeedVersion: HISTORY_SEED_VERSION,
    logs: [
      buildLog('history.seeded', { version: HISTORY_SEED_VERSION, shifts: historicalSchedules.length }),
      ...state.logs.filter(log => log.action !== 'history.seeded')
    ]
  };
}

function nextIsoDate(dateIso, offsetDays) {
  const base = dateIso ? new Date(`${dateIso}T12:00:00`) : new Date();
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function weekStartIso(dateIso) {
  const base = new Date(`${dateIso}T12:00:00`);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
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

function formatTime12(value) {
  if (!value) return '';
  const [hourRaw, minute = '00'] = value.split(':');
  let hour = Number(hourRaw);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute.padStart(2, '0')} ${suffix}`;
}

function fixedShiftTimeLabel() {
  return `${formatTime12(FIXED_START_TIME)} - ${formatTime12(FIXED_END_TIME)}`;
}

function buildManualShiftPatch(order, employees = defaultEmployees, settings = defaultSettings, reason = 'Secuencia editada manualmente') {
  const closingPool = settings.sequenceMode === 'triple' ? [] : order.slice(-2);
  const miniOrder = canMiniRotateGroup(closingPool, employees) ? closingPool : [];
  return {
    employeeIds: order,
    order,
    primaryOrder: order,
    miniOrder,
    groupKey: order.length ? groupKey(order) : '',
    miniKey: miniOrder.length > 1 ? groupKey(miniOrder) : '',
    closerId: order[order.length - 1] || '',
    reason,
    status: 'Modificado'
  };
}

function employeeNameMap(employees) {
  return Object.fromEntries(employees.map(emp => [emp.id, emp.name]));
}

function names(ids, nameMap) {
  return ids.map(id => nameMap[id] || id);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseSequenceInput(value, employeeIds, employees) {
  const employeeByName = Object.fromEntries(employees.map(emp => [normalizeText(emp.name), emp.id]));
  const parsed = String(value || '')
    .split(',')
    .map(item => employeeByName[normalizeText(item)])
    .filter(Boolean);
  if (parsed.length !== employeeIds.length) return [];
  if (new Set(parsed).size !== parsed.length) return [];
  return sameGroup(parsed, employeeIds) ? parsed : [];
}

function requestMissingRotation(rotations, employeeIds, employees, date, day) {
  if (!employeeIds.length) return rotations;
  const key = groupKey(employeeIds);
  if (rotations[key]) return rotations;
  const currentNames = names(employeeIds, employeeNameMap(employees));
  const answer = window.prompt(
    `El grupo de ${day} ${date} no tiene registro pasado.\n\nGrupo: ${currentNames.join(', ')}\n\nEscribe el ultimo orden usado separado por coma para registrarlo.`
  );
  if (answer === null) return null;
  const sequence = parseSequenceInput(answer, employeeIds, employees);
  if (!sequence.length) {
    window.alert('Orden invalido. Debes escribir exactamente los nombres del grupo, separados por coma.');
    return null;
  }
  return setRotationFromSequence(rotations, employeeIds, sequence, date);
}

function closingPoolForMini(employeeIds, rotations, settings) {
  const uniqueIds = [...new Set(employeeIds)].filter(Boolean);
  if (!uniqueIds.length || settings.sequenceMode === 'triple') return [];
  const mainRotation = rotations[groupKey(uniqueIds)] || {};
  const mainSequence = sequenceForRotation(uniqueIds, mainRotation);
  const primaryOrder = rotate(mainSequence, mainRotation.cursor || 0);
  const closingCount = Math.max(1, Math.min(Number(settings.closingCount) || 2, primaryOrder.length));
  return primaryOrder.slice(Math.max(0, primaryOrder.length - closingCount));
}

function shouldAdvanceMini(result) {
  return Boolean(result.miniKey && result.miniKey !== result.groupKey && result.miniOrder?.length > 1);
}

function hasMiniSequence(shift) {
  return Boolean(shift?.miniKey && Array.isArray(shift?.miniOrder) && shift.miniOrder.length > 1);
}

function canEmployeeMiniRotate(employeeId, employees) {
  const employee = employees.find(emp => emp.id === employeeId);
  return Boolean(employee?.canCloseAlone && employee?.canMiniRotate);
}

function displayEmployeeName(employeeId, nameMap, shift, employees = defaultEmployees) {
  const baseName = nameMap[employeeId] || employeeId;
  return hasMiniSequence(shift) && employeeId === shift?.closerId && canEmployeeMiniRotate(employeeId, employees) ? `${baseName}.` : baseName;
}

function canMiniRotateGroup(employeeIds, employees) {
  return employeeIds.length > 1 && employeeIds.every(id => canEmployeeMiniRotate(id, employees));
}

function calculateShift(employeeIds, rotations, settings, employees = defaultEmployees) {
  const uniqueIds = [...new Set(employeeIds)].filter(Boolean);
  if (!uniqueIds.length) {
    return { groupKey: '', order: [], primaryOrder: [], miniOrder: [], closerId: '', reason: 'Sin empleados seleccionados' };
  }

  const mainKey = groupKey(uniqueIds);
  const mainRotation = rotations[mainKey] || {};
  const mainSequence = sequenceForRotation(uniqueIds, mainRotation);
  const mainCursor = mainRotation.cursor || 0;
  const primaryOrder = rotate(mainSequence, mainCursor);
  if (settings.sequenceMode === 'triple') {
    return {
      groupKey: mainKey,
      miniKey: '',
      order: primaryOrder,
      primaryOrder,
      miniOrder: [],
      closerId: primaryOrder[primaryOrder.length - 1] || '',
      reason: 'Secuencia de 3 aplicada'
    };
  }

  const closingCount = Math.max(1, Math.min(Number(settings.closingCount) || 2, primaryOrder.length));
  const earlyCount = Math.max(0, primaryOrder.length - closingCount);
  const earlyOrder = primaryOrder.slice(0, earlyCount);
  const closingPool = primaryOrder.slice(earlyCount);

  let miniOrder = closingPool;
  let miniKey = '';
  if (canMiniRotateGroup(closingPool, employees)) {
    miniKey = groupKey(closingPool);
    const miniRotation = rotations[miniKey] || {};
    const miniSequence = sequenceForRotation(closingPool, miniRotation);
    const miniCursor = miniRotation.cursor || 0;
    miniOrder = rotate(miniSequence, miniCursor);
  }

  const order = [...earlyOrder, ...miniOrder];
  return {
    groupKey: mainKey,
    miniKey,
    order,
    primaryOrder,
    miniOrder,
    closerId: order[order.length - 1] || '',
    reason: miniKey ? 'Mini rotacion aplicada al grupo de cierre' : 'Rotacion principal aplicada sin mini rotacion'
  };
}

function advanceRotation(rotations, ids) {
  if (!ids.length) return rotations;
  const key = groupKey(ids);
  const currentRotation = rotations[key] || {};
  const sequence = sequenceForRotation(ids, currentRotation);
  const current = currentRotation.cursor || 0;
  return {
    ...rotations,
    [key]: {
      ...currentRotation,
      sequence,
      cursor: (current + 1) % sequence.length,
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

function formatLogAction(action) {
  const labels = {
    'history.seeded': 'Historial base cargado',
    'weekend.generated': 'Semana generada',
    'template.updated': 'Plantilla actualizada',
    'employee.created': 'Empleado agregado',
    'employee.updated': 'Empleado actualizado',
    'employees.saved': 'Empleados guardados',
    'shift.updated': 'Turno actualizado',
    'shift.recalculated': 'Turno recalculado',
    'shift.completed': 'Turno completado',
    'shift.manual_day_updated': 'Secuencia editada para un dia',
    'shift.manual_week_recalculated': 'Secuencia editada y semana recalculada'
  };
  return labels[action] || action;
}

function summarizeLogPayload(log, nameMap) {
  const payload = log.payload || {};
  if (log.action === 'history.seeded') {
    return `Version ${payload.version || '-'} · ${payload.shifts || 0} turnos cargados.`;
  }
  if (log.action === 'weekend.generated') {
    const shifts = payload.shifts || [];
    return `${shifts.length} turnos desde ${payload.weekStart || '-'}: ${shifts.map(shift => `${shift.day} ${shift.date}`).join(', ')}`;
  }
  if (log.action === 'template.updated') {
    return `${payload.day || '-'}: ${names(payload.employees || [], nameMap).join(', ') || 'sin empleados'}.`;
  }
  if (log.action === 'employee.created') {
    return `Nuevo empleado: ${payload.name || '-'}.`;
  }
  if (log.action === 'employee.updated') {
    const changes = Object.entries(payload.patch || {}).map(([key, value]) => `${key}: ${String(value)}`).join(', ');
    return `Empleado ${nameMap[payload.id] || payload.id || '-'} · ${changes || 'sin detalles'}.`;
  }
  if (log.action === 'employees.saved') {
    return `${payload.count || 0} empleados guardados con sus capacidades.`;
  }
  if (log.action === 'shift.completed') {
    return `Turno completado · grupo ${payload.groupKey || '-'} · cierra ${nameMap[payload.closerId] || payload.closerId || '-'}.`;
  }
  if (log.action === 'shift.manual_day_updated' || log.action === 'shift.manual_week_recalculated') {
    return `Nuevo orden: ${names(payload.order || [], nameMap).join(' -> ') || '-'}.`;
  }
  if (log.action === 'shift.updated') {
    const changes = Object.entries(payload.patch || {}).map(([key, value]) => `${key}: ${String(value)}`).join(', ');
    return `Turno ${payload.id || '-'} · ${changes || 'actualizado'}.`;
  }
  if (log.action === 'shift.recalculated') {
    return `Turno ${payload.id || '-'} recalculado.`;
  }
  return JSON.stringify(payload);
}

export default function SecuenciaCierre() {
  const [state, setState] = useState(loadState);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [accessError, setAccessError] = useState('');
  const [statsAccessGranted, setStatsAccessGranted] = useState(false);
  const [statsPassword, setStatsPassword] = useState('');
  const [statsError, setStatsError] = useState('');
  const [activeTab, setActiveTab] = useState('calendario');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [editShiftId, setEditShiftId] = useState('');
  const [editOrder, setEditOrder] = useState([]);
  const [editError, setEditError] = useState('');
  const [employeeDrafts, setEmployeeDrafts] = useState(() => state.employees);
  const [employeeDraftError, setEmployeeDraftError] = useState('');
  const [employeeDraftSuccess, setEmployeeDraftSuccess] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [weekStart, setWeekStart] = useState(getNextWeekendStart);
  const [weekendSelection, setWeekendSelection] = useState({
    Viernes: ['emp-1', 'emp-2', 'emp-3'],
    Sabado: ['emp-2', 'emp-4', 'emp-5'],
    Domingo: ['emp-1', 'emp-5', 'emp-6'],
    Lunes: state.templates.Lunes || [],
    Martes: state.templates.Martes || [],
    Miercoles: state.templates.Miercoles || [],
    Jueves: state.templates.Jueves || []
  });
  const [simSelection, setSimSelection] = useState(['emp-1', 'emp-2', 'emp-3']);
  const [simCount, setSimCount] = useState(10);

  const nameMap = useMemo(() => employeeNameMap(state.employees), [state.employees]);
  const activeEmployees = state.employees.filter(emp => emp.active);

  const selectedShift = state.schedules.find(shift => shift.id === selectedShiftId) || null;
  const calendarEvents = state.schedules.map(shift => ({
    id: shift.id,
    title: shift.day,
    start: shift.date,
    allDay: true,
    backgroundColor: shift.status === 'Completado' ? '#059669' : shift.status === 'Cancelado' ? '#dc2626' : '#7c3aed',
    borderColor: shift.status === 'Completado' ? '#059669' : shift.status === 'Cancelado' ? '#dc2626' : '#7c3aed',
    extendedProps: {
      day: shift.day,
      order: shift.order,
      miniOrder: shift.miniOrder,
      closerId: shift.closerId,
      status: shift.status,
      closer: nameMap[shift.closerId] || '-'
    }
  }));
  const weekendPreview = (() => {
    let rotations = { ...state.rotations };
    return GENERATION_DAYS.map((day, index) => {
      const date = nextIsoDate(weekStart, index);
      const employeeIds = weekendSelection[day] || [];
      const miniCandidate = closingPoolForMini(employeeIds, rotations, state.settings);
      const result = calculateShift(employeeIds, rotations, state.settings, state.employees);
      const missingMainHistory = Boolean(employeeIds.length && !rotations[groupKey(employeeIds)]);
      const missingMiniHistory = Boolean(canMiniRotateGroup(miniCandidate, state.employees) && groupKey(miniCandidate) !== groupKey(employeeIds) && !rotations[groupKey(miniCandidate)]);
      const missingHistory = missingMainHistory || missingMiniHistory;
      if (employeeIds.length) rotations = advanceRotation(rotations, employeeIds);
      if (shouldAdvanceMini(result)) rotations = advanceRotation(rotations, result.miniOrder);
      return {
        id: `preview-${day}`,
        date,
        day,
        employeeIds,
        missingHistory,
        result
      };
    });
  })();

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
    let rotations = { ...state.rotations };
    const shifts = [];
    const generatedAt = Date.now();

    for (const item of weekendPreview) {
      rotations = requestMissingRotation(rotations, item.employeeIds, state.employees, item.date, item.day);
      if (!rotations) return;
      const miniCandidate = closingPoolForMini(item.employeeIds, rotations, state.settings);
      if (canMiniRotateGroup(miniCandidate, state.employees) && groupKey(miniCandidate) !== groupKey(item.employeeIds)) {
        rotations = requestMissingRotation(rotations, miniCandidate, state.employees, item.date, `${item.day} mini rotacion`);
        if (!rotations) return;
      }
      const result = calculateShift(item.employeeIds, rotations, state.settings, state.employees);
      shifts.push({
        id: `shift-${item.date}-${item.day}-${generatedAt}`,
        date: item.date,
        day: item.day,
        startTime: FIXED_START_TIME,
        endTime: FIXED_END_TIME,
        firstExitTime: state.settings.firstExitTime,
        employeeIds: item.employeeIds,
        order: result.order,
        primaryOrder: result.primaryOrder,
        miniOrder: result.miniOrder,
        groupKey: result.groupKey,
        miniKey: result.miniKey,
        closerId: result.closerId,
        status: item.employeeIds.length ? 'Generado' : 'Cancelado',
        absenceType: item.employeeIds.length ? '' : 'Sin Secuencia',
        notes: '',
        reason: item.employeeIds.length ? result.reason : 'Sin Secuencia',
        completedAt: null
      });
      if (item.employeeIds.length) rotations = advanceRotation(rotations, item.employeeIds);
      if (shouldAdvanceMini(result)) rotations = advanceRotation(rotations, result.miniOrder);
    }

    persist(prev => {
      const otherSchedules = prev.schedules.filter(existing => !shifts.some(next => next.date === existing.date));
      return {
        ...prev,
        rotations,
        schedules: [...otherSchedules, ...shifts].sort((a, b) => a.date.localeCompare(b.date)),
        logs: [buildLog('weekend.generated', { weekStart, shifts }), ...prev.logs]
      };
    });
    setActiveTab('calendario');
  }

  function loadHistoricalBase() {
    persist(prev => applyHistoricalSeed(prev));
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

  function addEmployeeDraft() {
    const name = newEmployeeName.trim();
    if (!name) return;
    setEmployeeDrafts(prev => [
      ...prev,
      { id: `emp-${Date.now()}`, name, canCloseAlone: true, canMiniRotate: true, level: 'Semi Senior', active: true }
    ]);
    setNewEmployeeName('');
    setEmployeeDraftError('');
    setEmployeeDraftSuccess('');
  }

  function updateEmployeeDraft(id, patch) {
    setEmployeeDrafts(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      const next = { ...emp, ...patch };
      if (patch.canCloseAlone === false) {
        next.canMiniRotate = false;
      }
      return next;
    }));
    setEmployeeDraftError('');
    setEmployeeDraftSuccess('');
  }

  function resetEmployeeDrafts() {
    setEmployeeDrafts(state.employees);
    setEmployeeDraftError('');
    setEmployeeDraftSuccess('');
    setNewEmployeeName('');
  }

  function saveEmployeeDrafts() {
    const normalized = employeeDrafts.map(emp => ({
      ...emp,
      name: emp.name.trim(),
      canMiniRotate: emp.canCloseAlone ? Boolean(emp.canMiniRotate) : false
    }));
    if (normalized.some(emp => !emp.name)) {
      setEmployeeDraftError('Todos los empleados deben tener nombre.');
      return;
    }
    persist(prev => ({
      ...prev,
      employees: normalized,
      logs: [buildLog('employees.saved', { count: normalized.length }), ...prev.logs]
    }));
    setEmployeeDrafts(normalized);
    setEmployeeDraftError('');
    setEmployeeDraftSuccess('Cambios guardados correctamente.');
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

  function startEditShift(shift) {
    setEditShiftId(shift.id);
    setEditOrder(shift.order?.length ? shift.order : shift.employeeIds);
    setEditError('');
  }

  function cancelEditShift() {
    setEditShiftId('');
    setEditOrder([]);
    setEditError('');
  }

  function changeEditOrder(index, employeeId) {
    setEditOrder(prev => prev.map((id, i) => i === index ? employeeId : id));
  }

  function moveEditOrder(index, direction) {
    setEditOrder(prev => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function validateEditOrder() {
    if (!editOrder.length) return 'La secuencia no puede quedar vacia.';
    if (new Set(editOrder).size !== editOrder.length) return 'No repitas empleados en la misma secuencia.';
    return '';
  }

  function saveManualOrder(scope) {
    const validation = validateEditOrder();
    if (validation) {
      setEditError(validation);
      return;
    }

    persist(prev => {
      const selected = prev.schedules.find(shift => shift.id === editShiftId);
      if (!selected) return prev;
      let rotations = setRotationFromSequence(prev.rotations, editOrder, editOrder, selected.date);
      const manualPatch = buildManualShiftPatch(editOrder, prev.employees, prev.settings);
      const selectedWeekStart = weekStartIso(selected.date);
      const nextSchedules = prev.schedules.map(shift => {
        if (shift.id === selected.id) {
          return { ...shift, ...manualPatch, notes: [shift.notes, 'Editado manualmente'].filter(Boolean).join(' | ') };
        }
        if (scope !== 'week' || weekStartIso(shift.date) !== selectedWeekStart || shift.date <= selected.date) {
          return shift;
        }
        const result = calculateShift(shift.employeeIds, rotations, prev.settings, prev.employees);
        rotations = advanceRotation(rotations, result.order);
        if (shouldAdvanceMini(result)) rotations = advanceRotation(rotations, result.miniOrder);
        return {
          ...shift,
          order: result.order,
          primaryOrder: result.primaryOrder,
          miniOrder: result.miniOrder,
          groupKey: result.groupKey,
          miniKey: result.miniKey,
          closerId: result.closerId,
          reason: 'Recalculado por cambio manual de la semana',
          status: 'Modificado'
        };
      });
      return {
        ...prev,
        rotations,
        schedules: nextSchedules,
        logs: [buildLog(scope === 'week' ? 'shift.manual_week_recalculated' : 'shift.manual_day_updated', { id: selected.id, order: editOrder }), ...prev.logs]
      };
    });
    cancelEditShift();
  }

  function recalculateShift(id) {
    persist(prev => ({
      ...prev,
      schedules: prev.schedules.map(shift => {
        if (shift.id !== id) return shift;
        const result = calculateShift(shift.employeeIds, prev.rotations, prev.settings, prev.employees);
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
      if (shouldAdvanceMini(shift)) rotations = advanceRotation(rotations, shift.miniOrder);
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
      const result = calculateShift(simSelection, rotations, state.settings, state.employees);
      rows.push({ n: i, ...result });
      rotations = advanceRotation(rotations, simSelection);
      if (shouldAdvanceMini(result)) rotations = advanceRotation(rotations, result.miniOrder);
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

  function submitAccess(e) {
    e.preventDefault();
    if (accessPassword === ACCESS_PASSWORD) {
      setAccessGranted(true);
      setAccessError('');
      setAccessPassword('');
      return;
    }
    setAccessError('Clave incorrecta');
  }

  function submitStatsAccess(e) {
    e.preventDefault();
    if (statsPassword === STATS_PASSWORD) {
      setStatsAccessGranted(true);
      setStatsError('');
      setStatsPassword('');
      return;
    }
    setStatsError('Clave incorrecta');
  }

  if (!accessGranted) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h2 className="page-title">Secuencia de Cierre</h2>
            <p className="page-subtitle">Introduce la clave para acceder a este modulo.</p>
          </div>
        </div>

        <div className="glass-panel" style={{ maxWidth: '420px', margin: '0 auto' }}>
          <form onSubmit={submitAccess}>
            <div className="form-group">
              <label className="form-label">Clave de acceso</label>
              <input
                className="form-input"
                type="password"
                value={accessPassword}
                onChange={e => setAccessPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            {accessError && (
              <div className="badge badge-error" style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}>
                {accessError}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

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
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Generar semana de cierre</h3>
              <button type="button" className="btn btn-secondary" onClick={loadHistoricalBase} style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                Cargar historial base
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Viernes de inicio</label>
              <input className="form-input" type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
            </div>
            {GENERATION_DAYS.map(day => (
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
              Generar Semana
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
                  {item.missingHistory && (
                    <div className="badge badge-review" style={{ marginTop: '0.5rem' }}>
                      Pedira historial pasado al generar
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendario' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(640px, 1.55fr) minmax(280px, 0.55fr)', gap: '1.5rem' }}>
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
                eventClick={(info) => {
                  setSelectedShiftId(info.event.id);
                  cancelEditShift();
                }}
                eventContent={(info) => {
                  const props = info.event.extendedProps;
                  return (
                    <div className="closing-calendar-event">
                      <div className="closing-calendar-day">{props.day}</div>
                      <div className="closing-calendar-time">{fixedShiftTimeLabel()}</div>
                      {(props.order || []).map(employeeId => (
                        <div
                          key={employeeId}
                          className={employeeId === props.closerId ? 'closing-calendar-name closing-calendar-closer' : 'closing-calendar-name'}
                        >
                          {displayEmployeeName(employeeId, nameMap, props, state.employees)}
                        </div>
                      ))}
                    </div>
                  );
                }}
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
                <div>Horario: {fixedShiftTimeLabel()}</div>
                <div>
                  <div className="form-label">Orden de Personal</div>
                  <div className="closing-detail-list">
                    {selectedShift.order.map(employeeId => (
                      <span key={employeeId} className={employeeId === selectedShift.closerId ? 'closing-detail-closer' : ''}>
                        {displayEmployeeName(employeeId, nameMap, selectedShift, state.employees)}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="form-label">Mini rotacion</div>
                  <div className="closing-detail-list">
                    {hasMiniSequence(selectedShift) ? selectedShift.miniOrder.map(employeeId => (
                      <span key={employeeId} className={employeeId === selectedShift.closerId ? 'closing-detail-closer' : ''}>
                        {displayEmployeeName(employeeId, nameMap, selectedShift, state.employees)}
                      </span>
                    )) : <span>-</span>}
                  </div>
                </div>
                <div>Cierra: <strong className="closing-detail-closer" style={{ padding: '0.15rem 0.45rem', borderRadius: '6px' }}>{displayEmployeeName(selectedShift.closerId, nameMap, selectedShift, state.employees) || '-'}</strong></div>
                <div>Motivo: {selectedShift.reason}</div>
                <div className="glass-panel" style={{ background: 'rgba(6,8,19,0.03)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: editShiftId === selectedShift.id ? '1rem' : 0 }}>
                    <strong>Editar secuencia</strong>
                    {statsAccessGranted ? (
                      editShiftId === selectedShift.id ? (
                        <button type="button" className="btn btn-secondary" onClick={cancelEditShift} style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>Cancelar</button>
                      ) : (
                        <button type="button" className="btn btn-secondary" onClick={() => startEditShift(selectedShift)} style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>Editar</button>
                      )
                    ) : null}
                  </div>
                  {!statsAccessGranted ? (
                    <form onSubmit={submitStatsAccess} style={{ display: 'grid', gap: '0.75rem' }}>
                      <p style={{ color: 'var(--text-muted)' }}>Para editar usa la clave privada.</p>
                      <input
                        className="form-input"
                        type="password"
                        placeholder="Clave"
                        value={statsPassword}
                        onChange={e => setStatsPassword(e.target.value)}
                        required
                      />
                      {statsError && <div className="badge badge-error">{statsError}</div>}
                      <button type="submit" className="btn btn-primary">Desbloquear edicion</button>
                    </form>
                  ) : editShiftId === selectedShift.id ? (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {editOrder.map((employeeId, index) => (
                        <div key={`${employeeId}-${index}`} style={{ display: 'grid', gridTemplateColumns: '42px 1fr 40px 40px', gap: '0.5rem', alignItems: 'center' }}>
                          <strong>#{index + 1}</strong>
                          <select className="form-input" value={employeeId} onChange={e => changeEditOrder(index, e.target.value)}>
                            {selectedShift.employeeIds.map(id => <option key={id} value={id}>{nameMap[id] || id}</option>)}
                          </select>
                          <button type="button" className="btn btn-secondary" onClick={() => moveEditOrder(index, -1)} style={{ padding: '0.45rem' }}>↑</button>
                          <button type="button" className="btn btn-secondary" onClick={() => moveEditOrder(index, 1)} style={{ padding: '0.45rem' }}>↓</button>
                        </div>
                      ))}
                      {editError && <div className="badge badge-error">{editError}</div>}
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-primary" onClick={() => saveManualOrder('day')}>Guardar solo este dia</button>
                        <button type="button" className="btn btn-success" onClick={() => saveManualOrder('week')}>Guardar y recalcular semana</button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Desbloqueado. Puedes editar el orden de este dia.</p>
                  )}
                </div>
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
          {!statsAccessGranted ? (
            <form onSubmit={submitStatsAccess} style={{ maxWidth: '420px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Introduce la clave privada para editar empleados.</p>
              <div className="form-group">
                <label className="form-label">Clave de edicion</label>
                <input
                  className="form-input"
                  type="password"
                  value={statsPassword}
                  onChange={e => setStatsPassword(e.target.value)}
                  required
                />
              </div>
              {statsError && (
                <div className="badge badge-error" style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}>
                  {statsError}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Desbloquear empleados
              </button>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <input className="form-input" value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} placeholder="Nombre del empleado" />
                <button type="button" className="btn btn-secondary" onClick={addEmployeeDraft}>Agregar</button>
                <button type="button" className="btn btn-primary" onClick={saveEmployeeDrafts}>Guardar cambios</button>
                <button type="button" className="btn btn-secondary" onClick={resetEmployeeDrafts}>Cancelar</button>
              </div>
              {employeeDraftError && (
                <div className="badge badge-error" style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}>
                  {employeeDraftError}
                </div>
              )}
              {employeeDraftSuccess && (
                <div className="badge badge-ok" style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}>
                  {employeeDraftSuccess}
                </div>
              )}
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {employeeDrafts.map(emp => (
                  <div key={emp.id} className="result-card" style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px 110px', gap: '0.75rem', alignItems: 'center', textAlign: 'left' }}>
                    <input className="form-input" value={emp.name} onChange={e => updateEmployeeDraft(emp.id, { name: e.target.value })} />
                    <select className="form-input" value={emp.level} onChange={e => updateEmployeeDraft(emp.id, { level: e.target.value })}>
                      <option>Junior</option>
                      <option>Semi Senior</option>
                      <option>Senior</option>
                    </select>
                    <label><input type="checkbox" checked={emp.canCloseAlone} onChange={e => updateEmployeeDraft(emp.id, { canCloseAlone: e.target.checked })} /> Cierra solo</label>
                    <label title={!emp.canCloseAlone ? 'Si no cierra solo, no participa en mini secuencia.' : ''}>
                      <input
                        type="checkbox"
                        checked={emp.canCloseAlone && emp.canMiniRotate}
                        disabled={!emp.canCloseAlone}
                        onChange={e => updateEmployeeDraft(emp.id, { canMiniRotate: e.target.checked })}
                      /> Mini rotacion
                    </label>
                    <label><input type="checkbox" checked={emp.active} onChange={e => updateEmployeeDraft(emp.id, { active: e.target.checked })} /> Activo</label>
                  </div>
                ))}
              </div>
            </>
          )}
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
            <div className="result-card" style={{ textAlign: 'left', marginBottom: '1rem' }}>
              <div className="result-card-title">Horario fijo</div>
              <div className="result-card-value" style={{ fontSize: '1.25rem', color: 'var(--primary-hover)' }}>{fixedShiftTimeLabel()}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de secuencia</label>
              <label className="filter-btn" style={{ justifyContent: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={state.settings.sequenceMode === 'triple'}
                  onChange={e => updateSettings({ sequenceMode: e.target.checked ? 'triple' : 'pair' })}
                />
                Secuencia de 3
              </label>
              <div style={{ marginTop: '0.45rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {state.settings.sequenceMode === 'triple' ? 'Activa: 123, 231, 312.' : 'Activa: secuencia 1-2 con mini rotacion validada.'}
              </div>
            </div>
            {[
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
          {!statsAccessGranted ? (
            <form onSubmit={submitStatsAccess} style={{ maxWidth: '420px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Introduce la clave para ver las estadisticas.</p>
              <div className="form-group">
                <label className="form-label">Clave de estadisticas</label>
                <input
                  className="form-input"
                  type="password"
                  value={statsPassword}
                  onChange={e => setStatsPassword(e.target.value)}
                  required
                />
              </div>
              {statsError && (
                <div className="badge badge-error" style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}>
                  {statsError}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Ver estadisticas
              </button>
            </form>
          ) : (
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
          )}
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Auditoria e historial</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {state.logs.slice(0, 80).map(log => (
              <div key={log.id} className="result-card closing-audit-card">
                <div className="closing-audit-head">
                  <div>
                    <strong>{formatLogAction(log.action)}</strong>
                    <div className="closing-audit-meta">{log.user || 'Local'} · {new Date(log.at).toLocaleString()}</div>
                  </div>
                  <span className="badge badge-review">{log.action.split('.')[0]}</span>
                </div>
                <div className="closing-audit-summary">{summarizeLogPayload(log, nameMap)}</div>
              </div>
            ))}
            {state.logs.length === 0 && <div className="badge badge-review">Sin eventos registrados.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
