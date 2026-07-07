// runner.js — Actualizador de marcadores 24/7 para el VPS.
//
// Corre los crawlers de Sofascore y Flashscore (basketball y soccer) cada N minutos
// y escribe los JSON directamente en la carpeta del proyecto (donde api.php los lee).
// Pensado para correr de forma persistente en el VPS con `node runner.js`.
//
// Configurable por variables de entorno:
//   CRAWL_INTERVAL_MIN  (por defecto 3)
//   CRAWL_TIMEOUT_SEC   (por defecto 90)  — mata un crawl colgado para no bloquear el ciclo
//   CRAWL_TZ            (por defecto America/Santo_Domingo)

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// El proyecto (donde api.php lee los JSON) es la carpeta padre de /crawler.
const PROJECT_DIR = path.resolve(__dirname, '..');
const INTERVAL_MIN = Number(process.env.CRAWL_INTERVAL_MIN || 3);
const TIMEOUT_SEC = Number(process.env.CRAWL_TIMEOUT_SEC || 90);

// Fecha "de hoy" en la zona de los usuarios (RD/AST por defecto), INDEPENDIENTE de la
// zona horaria del VPS. Así el nombre del archivo coincide con la fecha que pide la
// página (que usa el navegador del usuario). Configurable con CRAWL_TZ.
const TZ = process.env.CRAWL_TZ || 'America/Santo_Domingo';
function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function log(msg) {
  console.log(`[${new Date().toLocaleString()}] ${msg}`);
}

// Ruta de los navegadores de Playwright. Cuando la tarea corre como SYSTEM no ve la
// cache del perfil de usuario, así que install-task.ps1 la guarda en browsers-path.txt
// y aquí se la pasamos al crawler por PLAYWRIGHT_BROWSERS_PATH.
function browsersPath() {
  try {
    const p = fs.readFileSync(path.join(__dirname, 'browsers-path.txt'), 'utf8').trim();
    return p || null;
  } catch (e) { return null; }
}

// Borra los JSON de marcadores de más de 2 días para no acumular basura.
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

// Corre un crawler y resuelve cuando termina (o se agota el timeout).
function correrCrawl(script, fecha, sport, salida, childEnv) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [path.join(__dirname, script), fecha, sport, salida], {
      stdio: 'inherit',
      env: childEnv,
    });

    const killer = setTimeout(() => {
      log(`${script} (${sport}) superó ${TIMEOUT_SEC}s; se cancela.`);
      try { proc.kill('SIGKILL'); } catch (e) { /* nada */ }
    }, TIMEOUT_SEC * 1000);

    proc.on('exit', (code) => {
      clearTimeout(killer);
      log(`${script} (${sport}) terminó (código ${code}).`);
      resolve();
    });
    proc.on('error', (err) => {
      clearTimeout(killer);
      log(`Error lanzando ${script}: ${err.message}`);
      resolve();
    });
  });
}

let corriendo = false;

async function ejecutarCiclo() {
  if (corriendo) { log('El ciclo anterior sigue corriendo; se omite este.'); return; }
  corriendo = true;

  const fecha = hoyISO();
  log(`Actualizando marcadores ${fecha}…`);

  const childEnv = { ...process.env, CRAWL_TZ: TZ };
  const bp = browsersPath();
  if (bp) childEnv.PLAYWRIGHT_BROWSERS_PATH = bp;

  const jobs = [
    ['crawl_sofascore.js',  'basketball', `sofascore_basketball_${fecha}.json`],
    ['crawl_flashscore.js', 'basketball', `flashscore_basketball_${fecha}.json`],
    ['crawl_sofascore.js',  'football',   `sofascore_soccer_${fecha}.json`],
    ['crawl_flashscore.js', 'football',   `flashscore_soccer_${fecha}.json`],
  ];

  for (const [script, sport, archivo] of jobs) {
    const salida = path.join(PROJECT_DIR, archivo);
    await correrCrawl(script, fecha, sport, salida, childEnv);
  }

  limpiarViejos();
  corriendo = false;
  log('Ciclo completado.');
}

log(`Runner iniciado. Intervalo: ${INTERVAL_MIN} min. Proyecto: ${PROJECT_DIR}`);
ejecutarCiclo();
setInterval(ejecutarCiclo, INTERVAL_MIN * 60 * 1000);
