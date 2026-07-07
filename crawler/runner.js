// runner.js — Actualizador de marcadores 24/7 para el VPS.
//
// Corre los crawlers de Sofascore y Flashscore secuencialmente para Baloncesto y Soccer
// cada N minutos y escribe los JSONs directamente en la carpeta del proyecto.
// Pensado para correr de forma persistente en el VPS con `node runner.js` sin colgar el servidor.

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// El proyecto (donde api.php lee los JSON) es la carpeta padre de /crawler.
const PROJECT_DIR = path.resolve(__dirname, '..');
const INTERVAL_MIN = Number(process.env.CRAWL_INTERVAL_MIN || 2);
const TIMEOUT_SEC = Number(process.env.CRAWL_TIMEOUT_SEC || 90);

// Fecha "de hoy" en la zona de los usuarios (RD/AST por defecto), INDEPENDIENTE de la
// zona horaria del VPS. Configurable con CRAWL_TZ.
const TZ = process.env.CRAWL_TZ || 'America/Santo_Domingo';
function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function log(msg) {
  console.log(`[${new Date().toLocaleString()}] ${msg}`);
}

// Ruta de los navegadores de Playwright.
function browsersPath() {
  try {
    const p = fs.readFileSync(path.join(__dirname, 'browsers-path.txt'), 'utf8').trim();
    return p || null;
  } catch (e) { return null; }
}

// Borra los archivos JSON de más de 2 días para no acumular basura.
function limpiarViejos() {
  try {
    const limite = Date.now() - 2 * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(PROJECT_DIR)) {
      if (/^(sofascore|flashscore)_(basketball|soccer)_.*\.json$/.test(f)) {
        const full = path.join(PROJECT_DIR, f);
        if (fs.statSync(full).mtimeMs < limite) fs.unlinkSync(full);
      }
    }
  } catch (e) { /* no crítico */ }
}

function runCrawlerProcess(scriptName, fecha, sport, salida) {
  return new Promise((resolve) => {
    log(`Iniciando ${scriptName} (${sport}) para ${fecha}...`);
    
    const childEnv = { ...process.env };
    const bp = browsersPath();
    if (bp) childEnv.PLAYWRIGHT_BROWSERS_PATH = bp;

    const proc = spawn(process.execPath, [
      path.join(__dirname, scriptName), 
      fecha, 
      sport,
      salida
    ], {
      stdio: 'inherit',
      env: childEnv,
    });

    const killer = setTimeout(() => {
      log(`${scriptName} (${sport}) superó ${TIMEOUT_SEC}s; se cancela.`);
      try { proc.kill('SIGKILL'); } catch (e) { /* nada */ }
    }, TIMEOUT_SEC * 1000);

    proc.on('exit', (code) => {
      clearTimeout(killer);
      log(`${scriptName} (${sport}) terminado con código ${code}.`);
      resolve();
    });
    
    proc.on('error', (err) => {
      clearTimeout(killer);
      log(`Error lanzando ${scriptName} (${sport}): ${err.message}`);
      resolve();
    });
  });
}

let corriendo = false;

async function ejecutarCrawl() {
  if (corriendo) { log('El ciclo anterior sigue ejecutándose; se omite este ciclo.'); return; }
  corriendo = true;

  const fecha = hoyISO();
  
  // 1. Sofascore Basketball
  await runCrawlerProcess('crawl_sofascore.js', fecha, 'basketball', path.join(PROJECT_DIR, `sofascore_basketball_${fecha}.json`));
  
  // 2. Flashscore Basketball
  await runCrawlerProcess('crawl_flashscore.js', fecha, 'basketball', path.join(PROJECT_DIR, `flashscore_basketball_${fecha}.json`));
  
  // 3. Sofascore Soccer (football en Sofascore)
  await runCrawlerProcess('crawl_sofascore.js', fecha, 'football', path.join(PROJECT_DIR, `sofascore_soccer_${fecha}.json`));
  
  // 4. Flashscore Soccer (football en Flashscore)
  await runCrawlerProcess('crawl_flashscore.js', fecha, 'football', path.join(PROJECT_DIR, `flashscore_soccer_${fecha}.json`));

  log('Ciclo de actualización completado.');
  limpiarViejos();
  corriendo = false;
}

log(`Runner de VPS iniciado. Intervalo: ${INTERVAL_MIN} min. Proyecto: ${PROJECT_DIR}`);
ejecutarCrawl();
setInterval(ejecutarCrawl, INTERVAL_MIN * 60 * 1000);
