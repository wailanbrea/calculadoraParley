# Crawler de marcadores en vivo (24/7 en el VPS) — OBLIGATORIO

Este crawler descarga los marcadores de basketball de **Sofascore y Flashscore** y los
escribe como `sofascore_basketball_YYYY-MM-DD.json` y `flashscore_basketball_YYYY-MM-DD.json`
en la carpeta del proyecto, donde `public/api.php` y `public/verificacion.php` los leen.
**Corre en el VPS de forma independiente — tu PC no participa.**

> ⚠️ **NO desactives este crawler.** Aunque los marcadores en vivo de basketball ahora vienen
> de **api-basketball** (api-sports), el crawler sigue siendo **obligatorio** porque es la
> **2da fuente** con la que:
> 1. **`verificacion.php` compara Q1, Q2 y el final** de cada juego (Sofascore/Flashscore
>    cubren ~25 ligas que ESPN no toca: Australia, NZ, Filipinas, Canadá, Puerto Rico, etc.).
>    Sin el crawler, casi todos los juegos quedan "sin 2da fuente" y no se puede comparar.
> 2. El **Comparador** (`get_basketball_comparison`) cruza Sofascore/Flashscore/ESPN.
>
> Si el crawler se detiene, dejan de generarse los `*_basketball_HOY.json` y la verificación
> pierde cobertura (todo vuelve a "1 fuente").

> Soccer y MLB NO dependen del crawler para su marcador: `api.php` los consulta directo
> (Livescore / statsapi de MLB). El crawler es para la 2da fuente de basketball.

## Cómo saber si está corriendo (chequeo rápido)

En el VPS, dentro de la carpeta del proyecto, debe existir el archivo de HOY:

```powershell
dir sofascore_basketball_*.json, flashscore_basketball_*.json | Sort-Object LastWriteTime -Descending | Select-Object -First 4
```

El de la fecha de hoy debe tener una fecha de modificación de hace pocos minutos. Si no
existe o está viejo, el crawler NO está corriendo → arráncalo (ver abajo).

## Instalación en el VPS (una sola vez)

Requiere **Node.js LTS** (https://nodejs.org). Con Node instalado, en PowerShell:

```powershell
cd "C:\xampp\htdocs\calcparley\crawler"   # (ajusta a la ruta real del proyecto en el VPS)
npm install
npx playwright install chromium
```

`npm install` baja Playwright; `npx playwright install chromium` baja el navegador headless.

## Arrancarlo 24/7

```powershell
cd "C:\xampp\htdocs\calcparley\crawler"
node runner.js
```

El runner actualiza cada 2 minutos y escribe el JSON en la carpeta del proyecto.
Deja esa ventana abierta, o mejor, configúralo como servicio/tarea de inicio (abajo).

### Que arranque solo al encender el VPS (recomendado)

**Opción A — Tarea Programada al inicio (simple):**
1. Task Scheduler → Create Task.
2. Trigger: *At startup*.
3. Action: *Start a program* → `node` (o la ruta a node.exe), argumentos: `runner.js`,
   "Start in": la carpeta `...\crawler`.
4. Marca *Run whether user is logged on or not* y *Run with highest privileges*.

**Opción B — como servicio con NSSM (más robusto):** instala NSSM y
`nssm install CalcParleyCrawler node.exe`, con AppDirectory = carpeta `crawler` y
Arguments = `runner.js`. Así se reinicia solo si se cae.

## Ajustes (opcionales)

- `CRAWL_INTERVAL_MIN` (por defecto 2): minutos entre actualizaciones.
- `CRAWL_TIMEOUT_SEC` (por defecto 90): mata un crawl colgado.

```powershell
$env:CRAWL_INTERVAL_MIN=3; node runner.js
```

## Notas

- El JSON se escribe de forma atómica (`.tmp` + rename), así api.php nunca lee un
  archivo a medio escribir.
- El runner borra solo los JSON de más de 2 días.
- La fecha usa la zona horaria del VPS; asegúrate de que el VPS esté en la misma zona
  que tus usuarios (RD = AST, UTC-4) para que las fechas de los partidos coincidan.
- Ya **no hace falta** subir marcadores por Git: el VPS los genera solo. Los archivos
  `sofascore_*.json` están en `.gitignore`.
