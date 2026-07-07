import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Uso: node crawl_flashscore.js [YYYY-MM-DD] [basketball|football] [ruta_salida]
// Nota: Flashscore muestra el día actual; el parámetro de fecha solo etiqueta el archivo.
const dateArg = process.argv[2];
const sportArg = process.argv[3]; // basketball | football
const outputArg = process.argv[4];

const TZ = process.env.CRAWL_TZ || 'America/Santo_Domingo';
function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

const targetDate = dateArg || hoyISO();
const sport = (sportArg || 'basketball').toLowerCase();

const defaultOutputPath = path.join(process.cwd(), `flashscore_${sport}_${targetDate}.json`);
const outputPath = outputArg || defaultOutputPath;

console.log(`Crawl Flashscore ${sport} ${targetDate} -> ${outputPath}`);

function mapFlashscoreStatusToLivescore(stage, time) {
  const s = (stage || '').trim().toLowerCase();

  if (s.includes('finished') || s.includes('ended') || s.includes('after')) return 'FT';
  if (s.includes('half time') || s === 'ht' || s.includes('descanso')) return 'HT';

  if (sport === 'basketball') {
    if (s.includes('1st quarter') || s.includes('q1')) return 'Q1';
    if (s.includes('2nd quarter') || s.includes('q2')) return 'Q2';
    if (s.includes('3rd quarter') || s.includes('q3')) return 'Q3';
    if (s.includes('4th quarter') || s.includes('q4')) return 'Q4';
  } else {
    if (s.includes('1st half') || s.includes('1 tiempo') || s.includes('1h')) return '1H';
    if (s.includes('2nd half') || s.includes('2 tiempo') || s.includes('2h')) return '2H';
  }

  if (s.includes('overtime') || s.includes('prórroga') || s.includes('ot')) return 'OT';

  if (!s && time) return 'NS'; // Sin estado pero con hora: no ha empezado

  return stage || 'NS';
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    timezoneId: TZ,
    locale: 'en-US'
  });
  const page = await context.newPage();

  const targetUrl = sport === 'basketball'
    ? 'https://www.flashscore.com/basketball/'
    : 'https://www.flashscore.com/';

  console.log(`Navegando a ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Flashscore hidrata las ligas por partes: esperar y hacer scroll hasta que el
  // número de partidos se estabilice (dos lecturas iguales) o se agote el tiempo.
  let previo = -1;
  let estable = 0;
  for (let i = 0; i < 12 && estable < 2; i++) {
    await page.waitForTimeout(3000);
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    const actual = await page.evaluate(() => document.querySelectorAll('.event__match').length);
    console.log(`  … ${actual} partidos renderizados`);
    if (actual === previo && actual > 0) estable++;
    else estable = 0;
    previo = actual;
  }

  const matchData = await page.evaluate((sportType) => {
    const results = [];
    const containerClass = sportType === 'basketball' ? '.sportName.basketball' : '.sportName.soccer';
    // Puede haber VARIOS contenedores del deporte (en vivo, programados,
    // finalizados): hay que recorrerlos todos, no solo el primero.
    let containers = Array.from(document.querySelectorAll(containerClass));
    if (containers.length === 0) containers = [document];

    const vistos = new Set();
    const elements = containers.flatMap(c => Array.from(c.querySelectorAll('div')));
    let currentLeague = 'Unknown Tournament';

    // El nombre de la liga vive en el header del bloque (.headerLeague__wrapper):
    // el primer <a> es la liga (ej. "WNBA") y el elemento *category* el país ("USA:").
    // Se dejan fallbacks porque Flashscore cambia las clases con frecuencia.
    const extraerLiga = (headerEl) => {
      const ignorar = /^(standings|draw|fixtures|live)$/i;

      let pais = '';
      const paisEl = headerEl.querySelector('[class*="category"], .event__title--type, [class*="event__title--type"]');
      if (paisEl) pais = paisEl.textContent.replace(/:\s*$/, '').trim();

      // 1) Primer enlace que no sea "Standings"/"Draw"/etc.
      const links = Array.from(headerEl.querySelectorAll('a'))
        .map(a => a.textContent.trim())
        .filter(t => t && !ignorar.test(t));
      let nombre = links[0] || '';

      // 2) Selectores legacy
      if (!nombre) {
        const el = headerEl.querySelector('.event__title--name, [class*="event__title--name"]');
        if (el) nombre = el.textContent.trim();
      }

      // 3) Texto plano del header
      if (!nombre) {
        nombre = headerEl.textContent.replace(/\s+/g, ' ').replace(/(Standings|Draw|Fixtures)\s*$/i, '').trim();
      }

      if (!nombre) return 'Unknown Tournament';
      return pais && !nombre.toLowerCase().startsWith(pais.toLowerCase())
        ? `${pais}: ${nombre}`
        : nombre;
    };

    elements.forEach(el => {
      const cls = String(el.className || '');
      if (el.classList.contains('event__header') || cls.includes('headerLeague__wrapper') || cls.includes('wclLeagueHeader')) {
        currentLeague = extraerLiga(el);
      }

      if (el.classList.contains('event__match')) {
        if (el.id && vistos.has(el.id)) return; // evitar duplicados entre contenedores
        if (el.id) vistos.add(el.id);
        const timeEl = el.querySelector('.event__time');
        const stageEl = el.querySelector('.event__stage');
        let homeTeamEl = el.querySelector('.event__participant--home, [class*="participant--home"], .event__homeParticipant');
        let awayTeamEl = el.querySelector('.event__participant--away, [class*="participant--away"], .event__awayParticipant');

        // Markup nuevo (soccer): los nombres van en elementos "wcl-name",
        // primero el local y luego el visitante.
        if (!homeTeamEl || !awayTeamEl) {
          const nombres = el.querySelectorAll('[class*="wcl-name"]');
          if (nombres.length >= 2) {
            homeTeamEl = nombres[0];
            awayTeamEl = nombres[1];
          }
        }

        const homeScoreEl = el.querySelector('.event__score--home, [class*="score--home"]');
        const awayScoreEl = el.querySelector('.event__score--away, [class*="score--away"]');

        const homeQuarters = Array.from(el.querySelectorAll('.event__part--home, [class*="part--home"]')).map(x => x.textContent.trim());
        const awayQuarters = Array.from(el.querySelectorAll('.event__part--away, [class*="part--away"]')).map(x => x.textContent.trim());

        const eid = el.id || Math.random().toString(36).substring(2, 9);

        // El elemento del ganador puede arrastrar tooltips tipo
        // "Spain U19 WAdvancing to next round: Spain U19 W" — quedarnos con el nombre real.
        const limpiarNombre = (t) => {
          t = t.replace(/\s+/g, ' ').trim();
          const m = t.match(/advancing to next round:\s*(.+)$/i);
          if (m) return m[1].trim();
          return t;
        };

        results.push({
          eid,
          league: currentLeague,
          time: timeEl ? timeEl.textContent.trim() : '',
          stage: stageEl ? stageEl.textContent.trim() : '',
          home: homeTeamEl ? limpiarNombre(homeTeamEl.textContent) : '?',
          away: awayTeamEl ? limpiarNombre(awayTeamEl.textContent) : '?',
          homeScore: homeScoreEl ? homeScoreEl.textContent.trim() : '',
          awayScore: awayScoreEl ? awayScoreEl.textContent.trim() : '',
          homeQuarters,
          awayQuarters
        });
      }
    });

    return results;
  }, sport);

  console.log(`Extraídos ${matchData.length} partidos del DOM.`);

  const stagesMap = {};

  const limpiarPeriodo = (v) => (v !== undefined && v !== '' && v !== '-') ? v : undefined;

  for (const match of matchData) {
    const stageKey = match.league;

    if (!stagesMap[stageKey]) {
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
      Eid: match.eid.replace('g_3_', '').replace('g_1_', ''),
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
      mappedEvent.Tr1Q1 = limpiarPeriodo(match.homeQuarters[0]);
      mappedEvent.Tr1Q2 = limpiarPeriodo(match.homeQuarters[1]);
      mappedEvent.Tr1Q3 = limpiarPeriodo(match.homeQuarters[2]);
      mappedEvent.Tr1Q4 = limpiarPeriodo(match.homeQuarters[3]);
      mappedEvent.Tr1OT = limpiarPeriodo(match.homeQuarters[4]);

      mappedEvent.Tr2Q1 = limpiarPeriodo(match.awayQuarters[0]);
      mappedEvent.Tr2Q2 = limpiarPeriodo(match.awayQuarters[1]);
      mappedEvent.Tr2Q3 = limpiarPeriodo(match.awayQuarters[2]);
      mappedEvent.Tr2Q4 = limpiarPeriodo(match.awayQuarters[3]);
      mappedEvent.Tr2OT = limpiarPeriodo(match.awayQuarters[4]);
    } else {
      mappedEvent.Tr1H1 = limpiarPeriodo(match.homeQuarters[0]);
      mappedEvent.Tr1H2 = limpiarPeriodo(match.homeQuarters[1]);
      mappedEvent.Tr1OT = limpiarPeriodo(match.homeQuarters[2]);

      mappedEvent.Tr2H1 = limpiarPeriodo(match.awayQuarters[0]);
      mappedEvent.Tr2H2 = limpiarPeriodo(match.awayQuarters[1]);
      mappedEvent.Tr2OT = limpiarPeriodo(match.awayQuarters[2]);
    }

    stagesMap[stageKey].Events.push(mappedEvent);
  }

  const livescoreFormat = { Stages: Object.values(stagesMap) };

  // Escritura atómica
  const tmpPath = outputPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(livescoreFormat, null, 2));
  fs.renameSync(tmpPath, outputPath);
  console.log(`OK: ${matchData.length} partidos en ${livescoreFormat.Stages.length} torneos escritos en ${outputPath}`);

  await browser.close();
}

run().catch((e) => { console.error('Crawl falló:', e); process.exit(1); });
