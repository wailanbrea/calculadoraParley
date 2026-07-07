/* global process */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Uso: node crawl_sofascore.js [YYYY-MM-DD] [basketball|football|soccer] [ruta_salida]
const dateArg = process.argv[2];
const sportArg = process.argv[3]; // basketball | football | soccer
const outputArg = process.argv[4];

// Zona de los usuarios (RD/AST): fechas y agrupacion de partidos independientes
// de la zona horaria de la maquina donde corre el crawler (PC o VPS).
const TZ = process.env.CRAWL_TZ || 'America/Santo_Domingo';
function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

const targetDate = dateArg || hoyISO();
if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
  throw new Error(`Fecha invalida: ${targetDate}. Usa YYYY-MM-DD.`);
}

const requestedSport = (sportArg || 'basketball').toLowerCase();
if (!['basketball', 'football', 'soccer'].includes(requestedSport)) {
  throw new Error(`Deporte invalido: ${requestedSport}. Usa basketball, football o soccer.`);
}

// Sofascore usa "football" para soccer. El proyecto guarda archivos como soccer.
const sportSlug = requestedSport === 'basketball' ? 'basketball' : 'football';
const outputSport = sportSlug === 'football' ? 'soccer' : 'basketball';

const defaultOutputPath = path.join(process.cwd(), `sofascore_${outputSport}_${targetDate}.json`);
const outputPath = outputArg || defaultOutputPath;

console.log(`Crawl Sofascore ${sportSlug} ${targetDate} -> ${outputPath}`);

function mapSofascoreStatusToLivescore(status) {
  const code = status?.code;
  const desc = status?.description || '';

  if (code === 100) return 'FT'; // Finished
  if (code === 0) return 'NS';   // Not Started

  if (sportSlug === 'basketball') {
    if (desc.includes('1st')) return 'Q1';
    if (desc.includes('2nd')) return 'Q2';
    if (desc.includes('3rd')) return 'Q3';
    if (desc.includes('4th')) return 'Q4';
  } else {
    if (desc.includes('1st')) return '1H';
    if (desc.includes('2nd')) return '2H';
  }

  if (desc.includes('Halftime') || desc.includes('HT')) return 'HT';
  if (desc.includes('Overtime') || desc.includes('OT')) return 'OT';

  return desc || 'NS';
}

// Fecha (en TZ del usuario) a la que pertenece un timestamp de evento
function fechaDeEvento(startTimestamp) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(startTimestamp * 1000));
}

async function fetchScheduledEvents(page) {
  const targetUrl = `https://www.sofascore.com/${sportSlug}/${targetDate}`;
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

  return page.evaluate(async ({ sport, date }) => {
    const headers = { accept: 'application/json, text/plain, */*' };

    async function fetchJson(path) {
      const res = await fetch(path, { headers });
      if (!res.ok) {
        throw new Error(`${path} respondio HTTP ${res.status}`);
      }
      return res.json();
    }

    const categoriesResponse = await fetchJson(`/api/v1/sport/${sport}/categories`);
    const categories = Array.isArray(categoriesResponse.categories) ? categoriesResponse.categories : [];
    const events = [];
    const failures = [];
    let cursor = 0;

    async function worker() {
      while (cursor < categories.length) {
        const category = categories[cursor++];
        try {
          const json = await fetchJson(`/api/v1/category/${category.id}/scheduled-events/${date}`);
          if (Array.isArray(json.events)) {
            events.push(...json.events);
          }
        } catch (error) {
          failures.push({
            id: category.id,
            name: category.name,
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    await Promise.all(Array.from({ length: 12 }, () => worker()));

    return {
      events,
      categoryCount: categories.length,
      failures
    };
  }, { sport: sportSlug, date: targetDate });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      timezoneId: TZ,
      locale: 'en-US'
    });
    const page = await context.newPage();

    const { events: scheduledEvents, categoryCount, failures } = await fetchScheduledEvents(page);

    if (failures.length === categoryCount && categoryCount > 0) {
      throw new Error(`Sofascore fallo en todas las categorias de ${sportSlug}.`);
    }
    if (failures.length > 0) {
      console.warn(`Aviso: ${failures.length}/${categoryCount} categorias fallaron; se continua con datos parciales.`);
    }
    console.log(`API Sofascore: ${scheduledEvents.length} eventos crudos desde ${categoryCount} categorias.`);

    const stagesMap = {};
    const seenEventIds = new Set();
    let descartadosDeporte = 0;
    let descartadosFecha = 0;
    let duplicados = 0;

    for (const event of scheduledEvents) {
      const tournament = event.tournament;
      if (!tournament || !event.id) continue;

      const eventId = String(event.id);
      if (seenEventIds.has(eventId)) {
        duplicados++;
        continue;
      }
      seenEventIds.add(eventId);

      const evSlug = tournament.category?.sport?.slug;
      if (evSlug && evSlug !== sportSlug) { descartadosDeporte++; continue; }

      if (event.startTimestamp && fechaDeEvento(event.startTimestamp) !== targetDate) {
        descartadosFecha++;
        continue;
      }

      const sid = String(tournament.uniqueTournament?.id || tournament.id || Math.random());
      const cnm = tournament.category?.name || 'World';
      const snm = tournament.name || 'League';
      const stageKey = `${cnm} - ${snm}`;

      if (!stagesMap[stageKey]) {
        stagesMap[stageKey] = { Sid: sid, Cnm: cnm, Snm: snm, Events: [] };
      }

      const eps = mapSofascoreStatusToLivescore(event.status);
      const esdFormatted = event.startTimestamp
        ? new Date(event.startTimestamp * 1000).toISOString().replace(/[-T:]/g, '').split('.')[0]
        : targetDate.replace(/-/g, '') + '000000';

      const mappedEvent = {
        Eid: eventId,
        Eps: eps,
        Esd: parseInt(esdFormatted, 10),
        T1: [{
          ID: String(event.homeTeam?.id || ''),
          Nm: event.homeTeam?.name || '?',
          Img: event.homeTeam?.id ? `https://img.sofascore.com/api/v1/team/${event.homeTeam.id}/image/small` : undefined,
          Abr: event.homeTeam?.abbreviation || ''
        }],
        T2: [{
          ID: String(event.awayTeam?.id || ''),
          Nm: event.awayTeam?.name || '?',
          Img: event.awayTeam?.id ? `https://img.sofascore.com/api/v1/team/${event.awayTeam.id}/image/small` : undefined,
          Abr: event.awayTeam?.abbreviation || ''
        }],
        Tr1: event.homeScore?.current !== undefined ? String(event.homeScore.current) : undefined,
        Tr2: event.awayScore?.current !== undefined ? String(event.awayScore.current) : undefined
      };

      if (sportSlug === 'basketball') {
        mappedEvent.Tr1Q1 = event.homeScore?.period1 !== undefined ? String(event.homeScore.period1) : undefined;
        mappedEvent.Tr1Q2 = event.homeScore?.period2 !== undefined ? String(event.homeScore.period2) : undefined;
        mappedEvent.Tr1Q3 = event.homeScore?.period3 !== undefined ? String(event.homeScore.period3) : undefined;
        mappedEvent.Tr1Q4 = event.homeScore?.period4 !== undefined ? String(event.homeScore.period4) : undefined;
        mappedEvent.Tr1OT = event.homeScore?.overtime !== undefined ? String(event.homeScore.overtime) : undefined;

        mappedEvent.Tr2Q1 = event.awayScore?.period1 !== undefined ? String(event.awayScore.period1) : undefined;
        mappedEvent.Tr2Q2 = event.awayScore?.period2 !== undefined ? String(event.awayScore.period2) : undefined;
        mappedEvent.Tr2Q3 = event.awayScore?.period3 !== undefined ? String(event.awayScore.period3) : undefined;
        mappedEvent.Tr2Q4 = event.awayScore?.period4 !== undefined ? String(event.awayScore.period4) : undefined;
        mappedEvent.Tr2OT = event.awayScore?.overtime !== undefined ? String(event.awayScore.overtime) : undefined;
      } else {
        const h1_1 = event.homeScore?.period1;
        const h2_1 = event.homeScore?.period2;
        const h1_2 = event.awayScore?.period1;
        const h2_2 = event.awayScore?.period2;

        mappedEvent.Tr1H1 = h1_1 !== undefined ? String(h1_1) : undefined;
        mappedEvent.Tr1H2 = h2_1 !== undefined ? String(h2_1) : undefined;
        mappedEvent.Tr1OT = event.homeScore?.overtime !== undefined ? String(event.homeScore.overtime) : undefined;

        mappedEvent.Tr2H1 = h1_2 !== undefined ? String(h1_2) : undefined;
        mappedEvent.Tr2H2 = h2_2 !== undefined ? String(h2_2) : undefined;
        mappedEvent.Tr2OT = event.awayScore?.overtime !== undefined ? String(event.awayScore.overtime) : undefined;
      }

      stagesMap[stageKey].Events.push(mappedEvent);
    }

    const livescoreFormat = { Stages: Object.values(stagesMap) };
    const totalEventos = Object.values(stagesMap).reduce((n, st) => n + st.Events.length, 0);

    // Escritura atomica: nunca dejar un JSON a medio escribir donde lo lee api.php
    const tmpPath = outputPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(livescoreFormat, null, 2));
    fs.renameSync(tmpPath, outputPath);
    console.log(`OK: ${totalEventos} eventos en ${livescoreFormat.Stages.length} torneos (descartados: ${descartadosDeporte} otro deporte, ${descartadosFecha} otra fecha, ${duplicados} duplicados).`);

  } finally {
    await browser.close();
  }
}

run().catch((e) => { console.error('Crawl falló:', e); process.exit(1); });
