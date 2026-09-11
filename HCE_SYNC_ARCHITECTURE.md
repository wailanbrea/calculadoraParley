# Arquitectura y Guía Técnica: Sincronización Automática HCE (BetOnline & Betcris)

> **Documento para Desarrolladores e Inteligencias Artificiales**  
> Este documento detalla la ingeniería inversa, flujo de datos, endpoints internos, selectores DOM y la arquitectura completa del módulo de sincronización de líneas **HCE (Hits + Carreras + Errores)** entre **BetOnline** y **Betcris** para la plataforma **CalculadoraParley** (`calcparley.bsolutions.dev`).

---

## 1. Contexto y Objetivo del Negocio

En las apuestas de béisbol de las Grandes Ligas (MLB), el mercado **HCE (Hits + Carreras + Errores)** —conocido en inglés como **R+H+E (Runs + Hits + Errors)**— es un mercado exótico de alto volumen.
Los apostadores comparan continuamente las líneas y cuotas entre dos casas de referencia en la región:
- **BetOnline** (`betonline.ag`)
- **Betcris** (`be.betcris.do`)

### El Problema para el Usuario
- En **BetOnline**, todas las líneas de R+H+E de la jornada se publican juntas en una sola pantalla (`/game-props`).
- En **Betcris**, el mercado HCE **NO se muestra en la lista general de partidos de MLB**. Está catalogado como un sub-mercado ("Prop") oculto dentro de cada partido individual (`/game/:gameUuid`).
- Para un usuario común, tener que abrir 15 partidos uno por uno, buscar la pestaña "Props", y copiar los números manualmente resulta inviable y propenso a errores.
- **Objetivo**: Lograr que con **1 solo clic** ("⚡ Sincronizar Líneas") en la Calculadora de Parley, una extensión de Chrome escanee en segundo plano ambas casas de apuestas abiertas en pestañas del navegador, extraiga todas las líneas y las envíe al comparador automáticamente.

---

## 2. Ingeniería Inversa de Betcris (Angular SPA)

### 2.1 Estructura de Rutas en Betcris
Betcris corre una SPA en Angular (Ivy). Las rutas clave para MLB son:
1. **Categoría / Liga (Lista de Partidos)**:
   `https://be.betcris.do/sportsbook/category/sport/D6B7F0DA-465C-4883-9B4D-092F7FB99F92/seclvlcat/AB8B6AA7-2297-44FF-874E-E0F967F11F69`
   - `D6B7F0DA-465C-4883-9B4D-092F7FB99F92`: UUID del deporte (Baseball).
   - `seclvlcat/AB8B6AA7-2297-44FF-874E-E0F967F11F69`: UUID de la liga (MLB).
2. **Partido Individual (Props y Sub-mercados)**:
   `https://be.betcris.do/sportsbook/category/sport/.../seclvlcat/.../game/:gameUuid`

### 2.2 Selectores DOM de la Lista de Partidos
En la lista de partidos, Betcris **NO utiliza etiquetas `<a>` estándar** con `href="/game/..."`. Utiliza componentes personalizados de Angular:
```html
<pt-schedule-game id="8155D7D3-9DDB-40C7-8DE4-D579814247AA" class="schedule__game ...">
  ...
  <div class="schedule__game-more-markets">Props</div>
</pt-schedule-game>
```
- **Clave**: El atributo `id` del elemento `<pt-schedule-game>` contiene exactamente el **Game UUID** (36 caracteres en formato UUID v4).

### 2.3 Endpoints Internos de Betcris (`/gateway/BetslipProxy.aspx/`)
Betcris expone un proxy ASP.NET con endpoints JSON:
1. **`scheduleGetLeagueView`**:
   - **Uso**: Obtiene todos los partidos programados de una liga (`seclvlcat`).
   - **Método**: `POST /gateway/BetslipProxy.aspx/scheduleGetLeagueView`
   - **Headers requeridos**:
     ```json
     {
       "Content-Type": "application/json",
       "Accept": "application/json",
       "rtqname": "",
       "x-version": "0.0.0"
     }
     ```
   - **Body**:
     ```json
     {
       "o": {
         "BORequestData": {
           "BOParameters": {
             "BORt": {},
             "leagueUUID": "AB8B6AA7-2297-44FF-874E-E0F967F11F69"
           }
         }
       }
     }
     ```
   - **Retorno**: `{ "Games": [ { "gameUUID": "...", "description": "Padres vs Giants", ... } ] }`.

2. **`scheduleGetGamesByUUID` (Market Hierarchy para Props)**:
   - **Uso**: Obtiene **todos los sub-mercados** de un partido dado su `ParentUUID`.
   - **Método**: `POST /gateway/BetslipProxy.aspx/scheduleGetGamesByUUID`
   - **Body**:
     ```json
     {
       "o": {
         "BORequestData": {
           "BOParameters": {
             "BORt": {},
             "ParentUUID": "8155D7D3-9DDB-40C7-8DE4-D579814247AA"
           }
         }
       }
     }
     ```
   - **Retorno**: `{ "games": [ ...submercados... ] }`.
   - El mercado de HCE se identifica porque su `description` contiene: `"Total de Hits+Carreras+Errores"` o `"Hits+Carreras+Errores"`.

3. **Estructura del Objeto de Línea HCE en Betcris**:
   ```javascript
   {
     description: "Padres vs Giants: Total de Hits+Carreras+Errores",
     contenders: [{ name: "San Diego Padres" }, { name: "San Francisco Giants" }],
     lines: {
       drvs: [
         {
           tot: {
             vp: 25.5,  // Total Over (Línea)
             v: 103,    // Cuota Over (+103)
             hp: 25.5,  // Total Under (Línea)
             h: -133    // Cuota Under (-133)
           }
         }
       ]
     }
   }
   ```

---

## 3. Ingeniería de BetOnline

### 3.1 Ruta y Navegación
- URL: `https://www.betonline.ag/sportsbook/baseball/mlb/game-props`
- Todos los partidos de la jornada con líneas R+H+E se encuentran en esta página bajo encabezados de sección o tablas de eventos.

### 3.2 Extracción en BetOnline
- Se realiza directamente sobre el DOM mediante parsing de tarjetas o texto en pantalla.
- La expresión regular busca:
  `Equipo Visitante vs Equipo Local` seguido de `Runs Hits Errors` u `Over/Under` con sus respectivas líneas y cuotas.

---

## 4. Arquitectura de la Extensión de Chrome (`public/extension/`)

La extensión actúa como un puente seguro entre el navegador del usuario (que tiene las cookies y sesiones activas en BetOnline y Betcris) y el servidor de la Calculadora:

```
┌────────────────────────────────────────────────────────┐
│               CalculadoraParley Web App                │
│             (calcparley.bsolutions.dev)                │
└──────────────────────────▲─────────────────────────────┘
                           │ postMessage ('CALCPARLEY_TRIGGER_SYNC')
┌──────────────────────────▼─────────────────────────────┐
│                 content_calcparley.js                  │
│       (Puente entre React y la extensión Chrome)       │
└──────────────────────────▲─────────────────────────────┘
                           │ chrome.runtime.sendMessage
┌──────────────────────────▼─────────────────────────────┐
│                     background.js                      │
│             (Service Worker Orquestador)               │
│  - Busca pestañas de BetOnline y Betcris              │
│  - Ejecuta scripting en las pestañas                   │
│  - Envía resultados a api.php                         │
└───────────▲───────────────────────────────▲────────────┘
            │ chrome.scripting.executeScript│
┌───────────▼───────────┐       ┌───────────▼───────────┐
│     Pestaña BetOnline │       │    Pestaña Betcris    │
│  (content_betonline)  │       │   (content_betcris)   │
│  Scraping DOM R+H+E   │       │  Scanner UUIDs DOM    │
│                       │       │  + scheduleGetGames   │
└───────────────────────┘       └───────────────────────┘
```

### 4.1 Archivos Principales
- `manifest.json`: Manifiesto V3 con permisos `scripting`, `tabs`, `activeTab` y orígenes permitidos.
- `background.js`:
  - `syncBetonline(targetApi)`: Localiza la pestaña de BetOnline, extrae las líneas R+H+E y las guarda vía API.
  - `syncBetcris(targetApi)`: Localiza la pestaña de Betcris, inyecta `scrapeBetcrisDOM`, recolecta los UUIDs y consulta los sub-mercados.
  - `scrapeBetcrisDOM()`: Función inyectada que:
    1. Revisa si la pantalla actual ya muestra el texto de HCE (escaneo directo).
    2. Recolecta todos los UUIDs de partidos desde `<pt-schedule-game id="...">`, atributos ID y llamadas a `scheduleGetLeagueView`.
    3. Para cada partido, consulta `scheduleGetGamesByUUID` con credenciales de sesión.
    4. Devuelve el array estructurado de juegos normalizados.
- `content_betcris.js`: Content script inyectado en Betcris con botón flotante discreto ⚡ para sincronizar manualmente desde Betcris.
- `content_calcparley.js`: Intercepta `CALCPARLEY_TRIGGER_SYNC` desde la web app y comunica el progreso y resultados.

---

## 5. API Backend (`api.php`)

- **`POST api.php?action=save_hce_betonline`**:
  Recibe `{ games: [...] }` y guarda en `server_hce_betonline.json`.
- **`POST api.php?action=save_hce_betcris`**:
  Recibe `{ games: [...], append: true }` y guarda/fusiona en `server_hce_betcris.json`.
- **`GET api.php?action=get_hce`**:
  Retorna los datos consolidados con marcas de tiempo para la UI en React.

---

## 6. Procedimiento para Otra IA / Desarrollador

Si necesitas modificar, depurar o extender esta función:

1. **Si Betcris cambia su estructura de frontend**:
   - Revisa `main-*.js` y `chunk-OXU5VQ43.js` en `https://be.betcris.do`.
   - Verifica los endpoints de `BetslipProxy.aspx` (busca `getGamesByUUID` o `scheduleGetGamesByUUID`).
   - Revisa los encabezados en la clase `wt` (`chunk-62PTLVCP.js`): `rtqname` y `x-version`.
2. **Para probar cambios localmente**:
   - Edita `public/extension/background.js` y `public/extension/content_betcris.js`.
   - Empaqueta el zip:
     ```powershell
     Compress-Archive -Path "public\extension\*" -DestinationPath "public\extension.zip" -Force
     ```
   - Compila la app web:
     ```bash
     npm run build
     ```
   - Haz commit y push:
     ```bash
     git add .
     git commit -m "Descripción clara del cambio"
     git push origin main
     ```
3. **Para desplegar en producción VPS (`bsolutions-vps`)**:
   ```bash
   ssh bsolutions-vps "cd /d C:\xampp\htdocs\calcparley && git pull origin main && npm run build"
   ```
