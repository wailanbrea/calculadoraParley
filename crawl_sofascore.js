import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Obtener parámetros
const dateArg = process.argv[2];
const sportArg = process.argv[3]; // basketball | football
const outputArg = process.argv[4];

const todayStr = new Date().toISOString().split('T')[0];
const targetDate = dateArg || todayStr;
const sport = (sportArg || 'basketball').toLowerCase();

// Formato de salida
const defaultOutputPath = path.join(process.cwd(), `sofascore_${sport}_${targetDate}.json`);
const outputPath = outputArg || defaultOutputPath;

console.log(`Crawl Sofascore for Sport: ${sport} on date: ${targetDate}`);
console.log(`Target output path: ${outputPath}`);

function mapSofascoreStatusToLivescore(status) {
  const code = status?.code;
  const desc = status?.description || '';
  
  if (code === 100) return 'FT'; // Finished
  if (code === 0) return 'NS';   // Not Started
  
  if (sport === 'basketball') {
    if (desc.includes('1st')) return 'Q1';
    if (desc.includes('2nd')) return 'Q2';
    if (desc.includes('3rd')) return 'Q3';
    if (desc.includes('4th')) return 'Q4';
  } else {
    // Soccer
    if (desc.includes('1st')) return '1H';
    if (desc.includes('2nd')) return '2H';
  }
  
  if (desc.includes('Halftime') || desc.includes('HT')) return 'HT';
  if (desc.includes('Overtime') || desc.includes('OT')) return 'OT';
  
  return desc || 'NS';
}

async function run() {
  console.log('Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
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
      } catch (e) {
        // Ignorar
      }
    }
  });

  const targetUrl = `https://www.sofascore.com/${sport}/${targetDate}`;
  console.log(`Navigating to Sofascore: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  
  console.log('Waiting 15 seconds for all API events to finish loading...');
  await page.waitForTimeout(15000);
  
  console.log(`Interception finished. Captured ${interceptedEvents.length} raw events.`);
  
  // Agrupar eventos por torneo (Stage)
  const stagesMap = {};
  
  for (const event of interceptedEvents) {
    const tournament = event.tournament;
    if (!tournament) continue;
    
    const sid = String(tournament.uniqueTournament?.id || tournament.id || Math.random());
    const cnm = tournament.category?.name || 'World';
    const snm = tournament.name || 'League';
    const stageKey = `${cnm} — ${snm}`;
    
    if (!stagesMap[stageKey]) {
      stagesMap[stageKey] = {
        Sid: sid,
        Cnm: cnm,
        Snm: snm,
        Events: []
      };
    }
    
    // Evitar duplicados por ID de evento
    if (stagesMap[stageKey].Events.some(e => e.Eid === String(event.id))) {
      continue;
    }
    
    const eps = mapSofascoreStatusToLivescore(event.status);
    const esdFormatted = event.startTimestamp 
      ? new Date(event.startTimestamp * 1000).toISOString().replace(/[-T:]/g, '').split('.')[0]
      : targetDate.replace(/-/g, '') + '000000';
      
    // Mapeo básico de evento
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
      Tr2: event.awayScore?.current !== undefined ? String(event.awayScore.current) : undefined
    };
    
    if (sport === 'basketball') {
      // Mapear cuartos individuales (Basketball)
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
      // Mapear mitades individuales (Soccer/Football)
      const h1_1 = event.homeScore?.period1;
      const h2_1 = event.homeScore?.current !== undefined && h1_1 !== undefined 
        ? event.homeScore.current - h1_1 
        : undefined;
        
      const h1_2 = event.awayScore?.period1;
      const h2_2 = event.awayScore?.current !== undefined && h1_2 !== undefined 
        ? event.awayScore.current - h1_2 
        : undefined;

      mappedEvent.Tr1H1 = h1_1 !== undefined ? String(h1_1) : undefined;
      mappedEvent.Tr1H2 = h2_1 !== undefined ? String(h2_1) : undefined;
      mappedEvent.Tr1OT = event.homeScore?.overtime !== undefined ? String(event.homeScore.overtime) : undefined;
      
      mappedEvent.Tr2H1 = h1_2 !== undefined ? String(h1_2) : undefined;
      mappedEvent.Tr2H2 = h2_2 !== undefined ? String(h2_2) : undefined;
      mappedEvent.Tr2OT = event.awayScore?.overtime !== undefined ? String(event.awayScore.overtime) : undefined;
    }
    
    stagesMap[stageKey].Events.push(mappedEvent);
  }
  
  const livescoreFormat = {
    Stages: Object.values(stagesMap)
  };
  
  // Guardar en archivo
  fs.writeFileSync(outputPath, JSON.stringify(livescoreFormat, null, 2));
  console.log(`Successfully wrote ${livescoreFormat.Stages.length} stages to ${outputPath}`);
  
  await browser.close();
}

run().catch(console.error);
