// runner.js — Actualizador de marcadores 24/7 para el VPS.
//
// Corre el crawler de Sofascore cada N minutos y escribe el JSON directamente en la
// carpeta del proyecto (donde api.php lo lee). Pensado para correr de forma persistente
// en el VPS con `node runner.js`, SIN depender de ninguna PC ni de Git.
//
// Configurable por variables de entorno:
//   CRAWL_INTERVAL_MIN  (por defecto 2)
//   CRAWL_TIMEOUT_SEC   (por defecto 90)  — mata un crawl colgado para no bloquear el ciclo

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// El proyecto (donde api.php lee los JSON) es la carpeta padre de /crawler.
const PROJECT_DIR = path.resolve(__dirname, '..');
const INTERVAL_MIN = Number(process.env.CRAWL_INTERVAL_MIN || 2);
const TIMEOUT_SEC = Number(process.env.CRAWL_TIMEOUT_SEC || 90);

function hoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function log(msg) {
  console.log(`[${new Date().toLocaleString()}] ${msg}`);
}

// Borra los sofascore_basketball_*.json de más de 2 días para no acumular basura.
function limpiarViejos() {
  try {
    const limite = Date.now() - 2 * 24 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(PROJECT_DIR)) {
      if (/^sofascore_basketball_.*\.json$/.test(f)) {
        const full = path.join(PROJECT_DIR, f);
        if (fs.statSync(full).mtimeMs < limite) fs.unlinkSync(full);
      }
    }
  } catch (e) { /* no crítico */ }
}

let corriendo = false;

function ejecutarCrawl() {
  if (corriendo) { log('El crawl anterior sigue corriendo; se omite este ciclo.'); return; }
  corriendo = true;

  const fecha = hoyISO();
  const salida = path.join(PROJECT_DIR, `sofascore_basketball_${fecha}.json`);
  log(`Actualizando basketball ${fecha}…`);

  const proc = spawn(process.execPath, [path.join(__dirname, 'crawl_sofascore.js'), fecha, salida], {
    stdio: 'inherit',
  });

  const killer = setTimeout(() => {
    log(`El crawl superó ${TIMEOUT_SEC}s; se cancela.`);
    try { proc.kill('SIGKILL'); } catch (e) { /* nada */ }
  }, TIMEOUT_SEC * 1000);

  proc.on('exit', (code) => {
    clearTimeout(killer);
    corriendo = false;
    log(`Crawl terminado (código ${code}).`);
    limpiarViejos();
  });
  proc.on('error', (err) => {
    clearTimeout(killer);
    corriendo = false;
    log(`Error lanzando el crawler: ${err.message}`);
  });
}

log(`Runner iniciado. Intervalo: ${INTERVAL_MIN} min. Proyecto: ${PROJECT_DIR}`);
ejecutarCrawl();
setInterval(ejecutarCrawl, INTERVAL_MIN * 60 * 1000);
