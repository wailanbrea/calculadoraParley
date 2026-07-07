import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Obtener fecha del argumento o usar la de hoy
const dateArg = process.argv[2];
const todayStr = new Date().toISOString().split('T')[0];
const targetDate = dateArg || todayStr;

// Ruta de salida (arg 3) o por defecto en el cwd
const outputArg = process.argv[3];
const defaultOutputPath = path.join(process.cwd(), `sofascore_basketball_${targetDate}.json`);
const outputPath = outputArg || defaultOutputPath;

console.log(`Crawl Sofascore basketball ${targetDate} -> ${outputPath}`);

function mapSofascoreStatusToLivescore(status) {
  const code = status?.code;
  const desc = status?.description || '';

  if (code === 100) return 'FT'; // Finished
  if (code === 0) return 'NS';   // Not Started

  if (desc.includes('1st')) return 'Q1';
  if (desc.includes('2nd')) return 'Q2';
  if (desc.includes('3rd')) return 'Q3';
  if (desc.includes('4th')) return 'Q4';
  if (desc.includes('Halftime') || desc.includes('HT')) return 'HT';
  if (desc.includes('Overtime') || desc.includes('OT')) return 'OT';

  return desc || 'NS';
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  // timezoneId en la zona de los usuarios (RD/AST): así Sofascore agrupa los partidos
  // por el mismo día que ve el usuario, sin importar la zona horaria del VPS.
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    timezoneId: process.env.CRAWL_TZ || 'America/Santo_Domingo',
    locale: 'en-US'
  });
  const page = await context.newPage();

  const interceptedEvents = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('scheduled-events') || url.includes('events')) {
      try {
        if (response.status() === 200) {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const json = await response.json();
            if (json.events && Array.isArray(json.events)) {
              interceptedEvents.push(...json.events);
            }
          }
        }
      } catch (e) { /* ignorar */ }
    }
  });

  const targetUrl = `https://www.sofascore.com/basketball/${targetDate}`;
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(15000);
  console.log(`Capturados ${interceptedEvents.length} eventos.`);

  const stagesMap = {};

  for (const event of interceptedEvents) {
    const tournament = event.tournament;
    if (!tournament) continue;

    const sid = String(tournament.uniqueTournament?.id || tournament.id || Math.random());
    const cnm = tournament.category?.name || 'World';
    const snm = tournament.name || 'League';
    const stageKey = `${cnm} — ${snm}`;

    if (!stagesMap[stageKey]) {
      stagesMap[stageKey] = { Sid: sid, Cnm: cnm, Snm: snm, Events: [] };
    }

    if (stagesMap[stageKey].Events.some(e => e.Eid === String(event.id))) continue;

    const eps = mapSofascoreStatusToLivescore(event.status);
    const esdFormatted = event.startTimestamp
      ? new Date(event.startTimestamp * 1000).toISOString().replace(/[-T:]/g, '').split('.')[0]
      : targetDate.replace(/-/g, '') + '000000';

    const mappedEvent = {
      Eid: String(event.id),
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
      Tr2: event.awayScore?.current !== undefined ? String(event.awayScore.current) : undefined,

      Tr1Q1: event.homeScore?.period1 !== undefined ? String(event.homeScore.period1) : undefined,
      Tr1Q2: event.homeScore?.period2 !== undefined ? String(event.homeScore.period2) : undefined,
      Tr1Q3: event.homeScore?.period3 !== undefined ? String(event.homeScore.period3) : undefined,
      Tr1Q4: event.homeScore?.period4 !== undefined ? String(event.homeScore.period4) : undefined,
      Tr1OT: event.homeScore?.overtime !== undefined ? String(event.homeScore.overtime) : undefined,

      Tr2Q1: event.awayScore?.period1 !== undefined ? String(event.awayScore.period1) : undefined,
      Tr2Q2: event.awayScore?.period2 !== undefined ? String(event.awayScore.period2) : undefined,
      Tr2Q3: event.awayScore?.period3 !== undefined ? String(event.awayScore.period3) : undefined,
      Tr2Q4: event.awayScore?.period4 !== undefined ? String(event.awayScore.period4) : undefined,
      Tr2OT: event.awayScore?.overtime !== undefined ? String(event.awayScore.overtime) : undefined
    };

    stagesMap[stageKey].Events.push(mappedEvent);
  }

  const livescoreFormat = { Stages: Object.values(stagesMap) };

  // Escritura atómica: escribir a un archivo temporal y renombrar, para que api.php
  // nunca lea un JSON a medio escribir.
  const tmpPath = outputPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(livescoreFormat, null, 2));
  fs.renameSync(tmpPath, outputPath);
  console.log(`OK: ${livescoreFormat.Stages.length} torneos escritos en ${outputPath}`);

  await browser.close();
}

run().catch((e) => { console.error('Crawl falló:', e); process.exit(1); });
