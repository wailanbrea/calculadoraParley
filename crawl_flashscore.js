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
const defaultOutputPath = path.join(process.cwd(), `flashscore_${sport}_${targetDate}.json`);
const outputPath = outputArg || defaultOutputPath;

console.log(`Crawl Flashscore for Sport: ${sport} on date: ${targetDate}`);
console.log(`Target output path: ${outputPath}`);

function mapFlashscoreStatusToLivescore(stage, time) {
  const s = (stage || '').trim().toLowerCase();
  
  if (s.includes('finished') || s.includes('ended')) return 'FT';
  if (s.includes('half time') || s.includes('ht') || s.includes('descanso')) return 'HT';
  
  if (sport === 'basketball') {
    if (s.includes('1st quarter') || s.includes('q1')) return 'Q1';
    if (s.includes('2nd quarter') || s.includes('q2')) return 'Q2';
    if (s.includes('3rd quarter') || s.includes('q3')) return 'Q3';
    if (s.includes('4th quarter') || s.includes('q4')) return 'Q4';
  } else {
    // Soccer
    if (s.includes('1st half') || s.includes('1 tiempo') || s.includes('1h')) return '1H';
    if (s.includes('2nd half') || s.includes('2 tiempo') || s.includes('2h')) return '2H';
  }
  
  if (s.includes('overtime') || s.includes('prórroga') || s.includes('ot')) return 'OT';
  
  if (!s && time) return 'NS'; // Si no tiene estado pero tiene hora, no ha empezado
  
  return stage || 'NS';
}

async function run() {
  console.log('Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  // Flashscore home es fútbol, baloncesto es /basketball/
  const targetUrl = sport === 'basketball' 
    ? 'https://www.flashscore.com/basketball/' 
    : 'https://www.flashscore.com/';
    
  console.log(`Navigating to Flashscore: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  
  console.log('DOM loaded. Waiting 15 seconds for match tables to render...');
  await page.waitForTimeout(15000);
  
  console.log('Extracting matches from Flashscore DOM...');
  const matchData = await page.evaluate((sportType) => {
    const results = [];
    // En Flashscore, los elementos de deporte están dentro de .sportName
    const containerClass = sportType === 'basketball' ? '.sportName.basketball' : '.sportName.soccer';
    const container = document.querySelector(containerClass);
    if (!container) return [];
    
    const elements = container.querySelectorAll('div');
    let currentLeague = 'Unknown Tournament';
    
    elements.forEach(el => {
      if (el.classList.contains('event__header')) {
        const titleEl = el.querySelector('.event__title--name');
        if (titleEl) {
          currentLeague = titleEl.textContent.trim();
        }
      }
      
      if (el.classList.contains('event__match')) {
        const timeEl = el.querySelector('.event__time');
        const stageEl = el.querySelector('.event__stage'); // Estado en vivo (ej. '1st Quarter 4' o 'Finished')
        const homeTeamEl = el.querySelector('.event__participant--home');
        const awayTeamEl = el.querySelector('.event__participant--away');
        
        const homeScoreEl = el.querySelector('.event__score--home');
        const awayScoreEl = el.querySelector('.event__score--away');
        
        const homeQuarters = Array.from(el.querySelectorAll('.event__part--home')).map(x => x.textContent.trim());
        const awayQuarters = Array.from(el.querySelectorAll('.event__part--away')).map(x => x.textContent.trim());
        
        // Generar un ID único basado en clases o participantes si no hay data-id
        const eid = el.id || Math.random().toString(36).substring(2, 9);
        
        results.push({
          eid,
          league: currentLeague,
          time: timeEl ? timeEl.textContent.trim() : '',
          stage: stageEl ? stageEl.textContent.trim() : '',
          home: homeTeamEl ? homeTeamEl.textContent.trim() : '?',
          away: awayTeamEl ? awayTeamEl.textContent.trim() : '?',
          homeScore: homeScoreEl ? homeScoreEl.textContent.trim() : '',
          awayScore: awayScoreEl ? awayScoreEl.textContent.trim() : '',
          homeQuarters,
          awayQuarters
        });
      }
    });
    
    return results;
  }, sport);
  
  console.log(`Extracted ${matchData.length} matches from DOM.`);
  
  // Agrupar por liga en el formato de salida
  const stagesMap = {};
  
  for (const match of matchData) {
    const stageKey = match.league;
    
    if (!stagesMap[stageKey]) {
      // Intentar extraer país y liga
      const parts = stageKey.split(':');
      const cnm = parts[0]?.trim() || 'World';
      const snm = parts[1]?.trim() || stageKey;
      
      stagesMap[stageKey] = {
        Sid: Math.random().toString(36).substring(2, 9),
        Cnm: cnm,
        Snm: snm,
        Events: []
      };
    }
    
    const eps = mapFlashscoreStatusToLivescore(match.stage, match.time);
    
    const mappedEvent = {
      Eid: match.eid.replace('g_3_', '').replace('g_1_', ''), // Limpiar prefijo de ID de Flashscore
      Eps: eps,
      Esd: parseInt(targetDate.replace(/-/g, '') + '000000', 10),
      T1: [{
        ID: Math.random().toString(36).substring(2, 9),
        Nm: match.home,
        Abr: ''
      }],
      T2: [{
        ID: Math.random().toString(36).substring(2, 9),
        Nm: match.away,
        Abr: ''
      }],
      Tr1: match.homeScore !== '-' && match.homeScore !== '' ? match.homeScore : undefined,
      Tr2: match.awayScore !== '-' && match.awayScore !== '' ? match.awayScore : undefined
    };
    
    if (sport === 'basketball') {
      // Marcadores por cuartos
      mappedEvent.Tr1Q1 = match.homeQuarters[0];
      mappedEvent.Tr1Q2 = match.homeQuarters[1];
      mappedEvent.Tr1Q3 = match.homeQuarters[2];
      mappedEvent.Tr1Q4 = match.homeQuarters[3];
      mappedEvent.Tr1OT = match.homeQuarters[4];
      
      mappedEvent.Tr2Q1 = match.awayQuarters[0];
      mappedEvent.Tr2Q2 = match.awayQuarters[1];
      mappedEvent.Tr2Q3 = match.awayQuarters[2];
      mappedEvent.Tr2Q4 = match.awayQuarters[3];
      mappedEvent.Tr2OT = match.awayQuarters[4];
    } else {
      // Marcadores por mitades
      mappedEvent.Tr1H1 = match.homeQuarters[0];
      mappedEvent.Tr1H2 = match.homeQuarters[1];
      mappedEvent.Tr1OT = match.homeQuarters[2];
      
      mappedEvent.Tr2H1 = match.awayQuarters[0];
      mappedEvent.Tr2H2 = match.awayQuarters[1];
      mappedEvent.Tr2OT = match.awayQuarters[2];
    }
    
    stagesMap[stageKey].Events.push(mappedEvent);
  }
  
  const livescoreFormat = {
    Stages: Object.values(stagesMap)
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(livescoreFormat, null, 2));
  console.log(`Successfully wrote ${livescoreFormat.Stages.length} stages to ${outputPath}`);
  
  await browser.close();
}

run().catch(console.error);
