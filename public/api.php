<?php
// CORS setup
$allowed_origins = [
    'http://172.20.0.251:8080',
    'https://calcparley.bsolutions.dev',
    'https://www.mlb.com',
    'https://mlb.com'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $origin);
} else {
    // Por defecto, o si es local/vacío
    header("Access-Control-Allow-Origin: https://calcparley.bsolutions.dev");
}
header("Access-Control-Allow-Headers: Content-Type, X-CalcParley-Import-Token");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$configFile = dirname(__DIR__) . '/server_config.json';
$feedFile = dirname(__DIR__) . '/server_feed.json';
$basesFile = dirname(__DIR__) . '/server_bases.json';
$tokenFile = dirname(__DIR__) . '/import_token.txt';

// Si el archivo de config no existe, lo inicializamos
if (!file_exists($configFile)) {
    file_put_contents($configFile, json_encode(null));
}

// Si el token no existe, creamos uno por defecto seguro
if (!file_exists($tokenFile)) {
    file_put_contents($tokenFile, 'calcparley_import_token_secure_9876');
}
$expectedToken = trim(file_get_contents($tokenFile));

// Fallback de getallheaders() para compatibilidad
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Acción: get config
if ($action === 'get') {
    $data = file_get_contents($configFile);
    echo $data;
    exit;
}

// Acción: save config
if ($action === 'save') {
    $input = file_get_contents('php://input');
    $decoded = json_decode($input, true);
    if ($decoded !== null) {
        if (file_put_contents($configFile, json_encode($decoded, JSON_PRETTY_PRINT))) {
            echo json_encode(["status" => "success", "message" => "Configuración guardada en el servidor"]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "No se pudo escribir el archivo. Verifica permisos."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "JSON inválido"]);
    }
    exit;
}

// Helper para validar el token de importación
function validateToken($expectedToken) {
    $headers = getallheaders();
    $token = '';
    foreach ($headers as $name => $value) {
        if (strcasecmp($name, 'X-CalcParley-Import-Token') === 0) {
            $token = trim($value);
            break;
        }
    }
    $acceptedTokens = [$expectedToken];
    if (str_ends_with($expectedToken, '_9876')) {
        $acceptedTokens[] = '9876';
    }

    $isValid = false;
    foreach ($acceptedTokens as $acceptedToken) {
        if (!empty($token) && hash_equals($acceptedToken, $token)) {
            $isValid = true;
            break;
        }
    }

    if (!$isValid) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "No autorizado: Token inválido"]);
        exit;
    }
}

// Acción: save_feed
if ($action === 'save_feed') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido"]);
        exit;
    }
    validateToken($expectedToken);
    
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data === null || !isset($data['games']) || !is_array($data['games'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "JSON inválido o estructura incorrecta"]);
        exit;
    }
    
    // Guardar usando LOCK_EX para prevenir condiciones de carrera
    $saved = file_put_contents($feedFile, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
    if ($saved === false) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Error escribiendo el feed en el servidor"]);
        exit;
    }
    
    clearstatcache(true, $feedFile);

    echo json_encode([
        "success" => true,
        "count" => count($data['games']),
        "saved_at" => isset($data['captured_at']) ? $data['captured_at'] : date('c'),
        "file_updated_at" => date('c', filemtime($feedFile))
    ]);
    exit;
}

// Acción: get_feed
if ($action === 'get_feed') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido"]);
        exit;
    }
    $consume = isset($_GET['consume']) && $_GET['consume'] === '1';

    if (file_exists($feedFile)) {
        clearstatcache(true, $feedFile);
        header("X-CalcParley-Feed-Updated-At: " . date('c', filemtime($feedFile)));
        $data = file_get_contents($feedFile);
        if ($consume) {
            unlink($feedFile);
            header("X-CalcParley-Feed-Consumed: 1");
        }
        echo $data;
    } else {
        echo json_encode([
            "success" => true,
            "games" => []
        ]);
    }
    exit;
}

// Acción: clear_feed
if ($action === 'clear_feed') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido"]);
        exit;
    }
    validateToken($expectedToken);
    
    if (file_exists($feedFile)) {
        unlink($feedFile);
    }
    
    echo json_encode([
        "success" => true,
        "message" => "Feed eliminado del servidor"
    ]);
    exit;
}

// Acción: save_bases
if ($action === 'save_bases') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido"]);
        exit;
    }
    validateToken($expectedToken);
    
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data === null || !isset($data['gameId'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "JSON inválido o estructura incorrecta"]);
        exit;
    }
    
    $existing = [];
    if (file_exists($basesFile)) {
        $existingContent = file_get_contents($basesFile);
        $decodedBases = json_decode($existingContent, true);
        if (is_array($decodedBases)) {
            $existing = $decodedBases;
        }
    }
    
    $gameId = $data['gameId'];
    $existing[$gameId] = $data;
    
    $saved = file_put_contents($basesFile, json_encode($existing, JSON_PRETTY_PRINT), LOCK_EX);
    if ($saved === false) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Error escribiendo las bases en el servidor"]);
        exit;
    }
    
    clearstatcache(true, $basesFile);
    
    echo json_encode([
        "success" => true,
        "gameId" => $gameId,
        "message" => "Bases alcanzadas guardadas para el juego $gameId"
    ]);
    exit;
}

// Acción: get_bases
if ($action === 'get_bases') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido"]);
        exit;
    }
    
    if (file_exists($basesFile)) {
        clearstatcache(true, $basesFile);
        echo file_get_contents($basesFile);
    } else {
        echo json_encode((object)[]);
    }
    exit;
}

// Acción: clear_bases
if ($action === 'clear_bases') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido"]);
        exit;
    }
    validateToken($expectedToken);
    
    if (file_exists($basesFile)) {
        unlink($basesFile);
    }
    
    echo json_encode([
        "success" => true,
        "message" => "Historial de bases alcanzadas eliminado"
    ]);
    exit;
}

// Descarga una URL externa con cURL (forzado a IPv4, con reintento y timeouts amplios).
// El CDN de la MLB (Fastly) responde 406 a peticiones que no parecen de un navegador,
// así que se prueban varios perfiles de encabezados hasta que uno funcione.
// Fallback a file_get_contents si cURL no está disponible.
function fetchExternalJson($url, &$error = null) {
    $error = null;

    $navegadorUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    $perfiles = [
        [
            'ua' => $navegadorUA,
            'headers' => [
                'Accept: application/json, text/plain, */*',
                'Accept-Language: en-US,en;q=0.9,es;q=0.8',
                'Referer: https://www.mlb.com/',
                'Origin: https://www.mlb.com'
            ]
        ],
        [
            'ua' => $navegadorUA,
            'headers' => ['Accept: */*']
        ]
    ];

    if (function_exists('curl_init')) {
        foreach ($perfiles as $perfil) {
            for ($try = 0; $try < 2; $try++) {
                $ch = curl_init($url);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_CONNECTTIMEOUT => 5,
                    CURLOPT_TIMEOUT => 15,
                    CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
                    CURLOPT_ENCODING => '',
                    CURLOPT_USERAGENT => $perfil['ua'],
                    CURLOPT_HTTPHEADER => $perfil['headers']
                ]);
                $res = curl_exec($ch);
                $err = curl_error($ch);
                $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                if ($res !== false && $code >= 200 && $code < 300) {
                    return $res;
                }
                $error = $err !== '' ? $err : ('HTTP ' . $code);
            }
        }
        return false;
    }

    $context = stream_context_create([
        'http' => [
            'timeout' => 15,
            'ignore_errors' => true,
            'header' => "User-Agent: $navegadorUA\r\nAccept: application/json, text/plain, */*\r\nAccept-Language: en-US,en;q=0.9\r\nReferer: https://www.mlb.com/\r\n"
        ]
    ]);
    $res = @file_get_contents($url, false, $context);
    if ($res === false) {
        $error = 'file_get_contents fallo (revisa allow_url_fopen/openssl)';
    }
    return $res;
}

// Llama a api-basketball (api-sports) y mapea al formato Livescore que usa el frontend.
// Devuelve ['Stages'=>[...], '_live'=>bool] o null en caso de error.
function fetchApiBasketball($fecha, $key, &$error = null) {
    $error = null;
    if (!function_exists('curl_init')) { $error = 'sin cURL'; return null; }
    $url = "https://v1.basketball.api-sports.io/games?date={$fecha}&timezone=America/Santo_Domingo";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ["x-apisports-key: {$key}"],
    ]);
    $res = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
    if ($res === false || $code !== 200) { $error = $curlErr !== '' ? $curlErr : "HTTP $code"; return null; }
    $json = json_decode($res, true);
    if (!isset($json['response']) || !is_array($json['response'])) {
        $errs = isset($json['errors']) ? json_encode($json['errors']) : 'respuesta inesperada';
        $error = "api-basketball: $errs";
        return null;
    }
    return mapApiBasketball($json['response']);
}

function mapApiBasketball($games) {
    // Estados de api-basketball -> códigos que entiende el frontend.
    $mapEstado = function ($short) {
        $s = strtoupper((string)($short ?? 'NS'));
        $m = ['AOT'=>'FT','FT'=>'FT','AWD'=>'FT','NS'=>'NS','POST'=>'Postp','CANC'=>'Canc','SUSP'=>'Susp','ABD'=>'Aband'];
        return isset($m[$s]) ? $m[$s] : $s; // Q1..Q4, HT, OT, BT quedan igual
    };
    $stages = [];
    $live = false;
    foreach ($games as $g) {
        $liga = isset($g['league']['name']) ? $g['league']['name'] : 'Liga';
        $pais = isset($g['country']['name']) ? $g['country']['name'] : 'World';
        $clave = $pais . ' — ' . $liga;
        if (!isset($stages[$clave])) {
            $stages[$clave] = ['Sid'=>(string)(isset($g['league']['id']) ? $g['league']['id'] : mt_rand()), 'Cnm'=>$pais, 'Snm'=>$liga, 'Events'=>[]];
        }
        $eps = $mapEstado(isset($g['status']['short']) ? $g['status']['short'] : 'NS');
        if (!in_array($eps, ['NS','FT','Postp','Canc','Susp','Aband'], true)) $live = true;

        $ts = isset($g['timestamp']) ? (int)$g['timestamp'] : 0;
        if ($ts > 0) {
            $dt = new DateTime('@' . $ts);
            $dt->setTimezone(new DateTimeZone('America/Santo_Domingo'));
            $esd = (int) $dt->format('YmdHis');
        } else {
            $esd = (int) (str_replace('-', '', substr(isset($g['date']) ? $g['date'] : '', 0, 10)) . '000000');
        }
        $home = isset($g['teams']['home']) ? $g['teams']['home'] : [];
        $away = isset($g['teams']['away']) ? $g['teams']['away'] : [];
        $sh = isset($g['scores']['home']) ? $g['scores']['home'] : [];
        $sa = isset($g['scores']['away']) ? $g['scores']['away'] : [];

        $ev = [
            'Eid' => (string)(isset($g['id']) ? $g['id'] : ''),
            'Eps' => $eps,
            'Esd' => $esd,
            'T1' => [['Nm'=>isset($home['name']) ? $home['name'] : '?', 'Img'=>isset($home['logo']) ? $home['logo'] : null]],
            'T2' => [['Nm'=>isset($away['name']) ? $away['name'] : '?', 'Img'=>isset($away['logo']) ? $away['logo'] : null]],
        ];
        if (isset($sh['total']) && $sh['total'] !== null) $ev['Tr1'] = (string)$sh['total'];
        if (isset($sa['total']) && $sa['total'] !== null) $ev['Tr2'] = (string)$sa['total'];
        foreach (['quarter_1'=>'Q1','quarter_2'=>'Q2','quarter_3'=>'Q3','quarter_4'=>'Q4','over_time'=>'OT'] as $k=>$q) {
            if (isset($sh[$k]) && $sh[$k] !== null) $ev['Tr1'.$q] = (string)$sh[$k];
            if (isset($sa[$k]) && $sa[$k] !== null) $ev['Tr2'.$q] = (string)$sa[$k];
        }
        $stages[$clave]['Events'][] = $ev;
    }
    return ['Stages'=>array_values($stages), '_live'=>$live];
}

// Acción: proxy_livescore — reenvía la API pública de Livescore.com (bloquea CORS del
// navegador, así que el servidor la consulta con caché de ~55s para no abusar)
if ($action === 'proxy_livescore') {
    $sport = isset($_GET['sport']) ? $_GET['sport'] : 'soccer';
    if (!in_array($sport, ['soccer', 'basketball'], true)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Deporte no permitido"]);
        exit;
    }
    $dateRaw = isset($_GET['date']) ? str_replace('-', '', $_GET['date']) : date('Ymd');
    if (!preg_match('/^\d{8}$/', $dateRaw)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Fecha inválida"]);
        exit;
    }
    $tz = isset($_GET['tz']) ? (int)$_GET['tz'] : -4;
    if ($tz < -12) $tz = -12;
    if ($tz > 14) $tz = 14;

    $cacheDir = dirname(__DIR__);
    $cacheFile = $cacheDir . "/cache_ls_{$sport}_{$dateRaw}_{$tz}.json";
    $formattedDate = substr($dateRaw, 0, 4) . '-' . substr($dateRaw, 4, 2) . '-' . substr($dateRaw, 6, 2);

    // BASKETBALL vía api-basketball (api-sports) si hay una key configurada. Fuente
    // confiable (JSON, sin scraping). Diseñado para el plan gratis (100 req/día):
    //  - Caché de 5 min con juegos en vivo, 15 min sin juegos (una llamada trae TODOS
    //    los juegos del día; los usuarios comparten el caché, no suman requests).
    //  - Tope duro de 95 llamadas/día: al llegar, sirve el último dato en vez de gastar
    //    cuota o dar error. Configurable con las constantes de abajo.
    // Extrae la key aunque el archivo traiga texto de más: toma el primer token
    // alfanumérico de 20-64 chars (formato de las keys de api-sports).
    $apiKeyRaw = @file_get_contents($cacheDir . '/apisports_key.txt');
    $apiKey = (is_string($apiKeyRaw) && preg_match('/[A-Za-z0-9]{20,64}/', $apiKeyRaw, $mk)) ? $mk[0] : '';
    if ($sport === 'basketball' && $apiKey !== '') {
        $ttlLive = 300;    // 5 min con juegos en vivo
        $ttlIdle = 900;    // 15 min sin juegos
        $topeDiario = 95;  // margen bajo los 100/día del plan gratis

        $cf = $cacheDir . "/cache_apibasket_{$formattedDate}.json";
        $cached = file_exists($cf) ? json_decode(file_get_contents($cf), true) : null;
        $tieneCache = is_array($cached) && isset($cached['Stages']);

        if ($tieneCache) {
            $ttl = !empty($cached['_live']) ? $ttlLive : $ttlIdle;
            if ((time() - filemtime($cf)) < $ttl) {
                echo json_encode(['Stages' => $cached['Stages']]);
                exit;
            }
        }

        // Contador diario para no exceder la cuota gratis
        $countFile = $cacheDir . '/cache_apibasket_count.json';
        $hoy = date('Ymd');
        $cnt = @json_decode(@file_get_contents($countFile), true);
        if (!is_array($cnt) || (isset($cnt['d']) ? $cnt['d'] : '') !== $hoy) $cnt = ['d' => $hoy, 'n' => 0];

        if ($cnt['n'] < $topeDiario) {
            $abErr = null;
            $mapped = fetchApiBasketball($formattedDate, $apiKey, $abErr);
            if ($mapped !== null) {
                file_put_contents($cf, json_encode($mapped), LOCK_EX);
                $cnt['n']++;
                file_put_contents($countFile, json_encode($cnt), LOCK_EX);
                echo json_encode(['Stages' => $mapped['Stages']]);
                exit;
            }
        }
        // Cuota agotada o error: servir el último caché aunque esté viejo
        if ($tieneCache) { echo json_encode(['Stages' => $cached['Stages']]); exit; }
        // Sin caché: cae al flujo normal (sofascore/Livescore) más abajo
    }

    // Si es baloncesto o soccer y existe un archivo de sofascore cargado para esa fecha, servirlo directamente
    if ($sport === 'basketball' || $sport === 'football' || $sport === 'soccer') {
        $fileSportName = ($sport === 'basketball') ? 'basketball' : 'soccer';
        $sofascoreFile = $cacheDir . "/sofascore_{$fileSportName}_{$formattedDate}.json";
        if (file_exists($sofascoreFile)) {
            echo file_get_contents($sofascoreFile);
            exit;
        }
    }

    // Limpiar cachés de más de un día
    foreach (glob($cacheDir . '/cache_ls_*.json') as $viejo) {
        if (time() - filemtime($viejo) > 86400) @unlink($viejo);
    }

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 55) {
        echo file_get_contents($cacheFile);
        exit;
    }

    $url = "https://prod-public-api.livescore.com/v1/api/app/date/{$sport}/{$dateRaw}/{$tz}?locale=en&MD=1";
    $fetchError = null;
    $res = fetchExternalJson($url, $fetchError);
    if (!$res) {
        // Si hay un caché viejo, servirlo antes que fallar
        if (file_exists($cacheFile)) {
            echo file_get_contents($cacheFile);
            exit;
        }
        http_response_code(502);
        echo json_encode(["status" => "error", "message" => "Livescore no disponible: $fetchError"]);
        exit;
    }
    file_put_contents($cacheFile, $res, LOCK_EX);
    echo $res;
    exit;
}

// Acción: sync_mlb_bases
if ($action === 'sync_mlb_bases') {
    $dateParam = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    $datesToSync = [$dateParam];

    // Si la fecha pedida es el día actual del servidor, barrer también el día anterior
    // (los juegos nocturnos de MLB terminan pasada la medianoche)
    if ($dateParam === date('Y-m-d')) {
        $datesToSync[] = date('Y-m-d', strtotime('-1 day'));
    }
    
    $existing = [];
    if (file_exists($basesFile)) {
        $existingContent = file_get_contents($basesFile);
        $decodedBases = json_decode($existingContent, true);
        if (is_array($decodedBases)) {
            $existing = $decodedBases;
        }
    }
    
    $syncCount = 0;
    $alreadyCount = 0;
    $fetchErrors = [];

    foreach ($datesToSync as $syncDate) {
        $scheduleUrl = "https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=" . $syncDate;
        $fetchError = null;
        $scheduleJson = fetchExternalJson($scheduleUrl, $fetchError);
        if (!$scheduleJson) {
            $fetchErrors[] = "calendario $syncDate: $fetchError";
            continue;
        }
        
        $scheduleData = json_decode($scheduleJson, true);
        if (!isset($scheduleData['dates'][0]['games'])) continue;
        
        $gamesList = $scheduleData['dates'][0]['games'];
        foreach ($gamesList as $g) {
            $gameId = (string)$g['gamePk'];
            
            $state = isset($g['status']['abstractGameState']) ? $g['status']['abstractGameState'] : '';
            if ($state !== 'Final') {
                continue;
            }
            
            if (isset($existing[$gameId])) {
                $alreadyCount++;
                continue;
            }
            
            $boxscoreUrl = "https://statsapi.mlb.com/api/v1/game/" . $gameId . "/boxscore";
            $fetchError = null;
            $boxscoreJson = fetchExternalJson($boxscoreUrl, $fetchError);
            if (!$boxscoreJson) {
                $fetchErrors[] = "boxscore $gameId: $fetchError";
                continue;
            }
            
            $boxscoreData = json_decode($boxscoreJson, true);
            if (!isset($boxscoreData['teams'])) continue;
            
            $boxscores = [];
            $teamsKeys = ['away', 'home'];
            
            foreach ($teamsKeys as $tKey) {
                $teamData = $boxscoreData['teams'][$tKey];
                $teamName = isset($teamData['team']['name']) ? $teamData['team']['name'] : ($tKey === 'away' ? 'Visitante' : 'Casa');
                $teamRuns = isset($teamData['teamStats']['batting']['runs']) ? (int)$teamData['teamStats']['batting']['runs'] : 0;
                
                $playersObj = isset($teamData['players']) ? $teamData['players'] : [];
                $playersList = [];
                
                foreach ($playersObj as $pId => $p) {
                    if (isset($p['battingOrder'])) {
                        $playersList[] = $p;
                    }
                }
                
                usort($playersList, function($a, $b) {
                    return (int)$a['battingOrder'] - (int)$b['battingOrder'];
                });
                
                $lineup = [];
                foreach ($playersList as $p) {
                    $fullName = isset($p['person']['fullName']) ? $p['person']['fullName'] : 'Jugador';
                    
                    // Reemplazo simple de caracteres especiales
                    $cleanName = str_replace(
                        ['á','é','í','ó','ú','Á','É','Í','Ó','Ú','ñ','Ñ','ü','Ü','í','Í'],
                        ['a','e','i','o','u','A','E','I','O','U','n','N','u','U','i','I'],
                        $fullName
                    );
                    
                    $battingOrder = isset($p['battingOrder']) ? $p['battingOrder'] : '000';
                    $isSub = (substr($battingOrder, -2) !== '00');
                    
                    $batStats = isset($p['stats']['batting']) ? $p['stats']['batting'] : [];
                    $ab = isset($batStats['atBats']) ? (int)$batStats['atBats'] : 0;
                    $r = isset($batStats['runs']) ? (int)$batStats['runs'] : 0;
                    $h = isset($batStats['hits']) ? (int)$batStats['hits'] : 0;
                    $rbi = isset($batStats['rbi']) ? (int)$batStats['rbi'] : 0;
                    $so = isset($batStats['strikeOuts']) ? (int)$batStats['strikeOuts'] : 0;
                    $tb = isset($batStats['totalBases']) ? (int)$batStats['totalBases'] : 0;
                    
                    $todosCeros = (!$isSub && $ab === 0 && $r === 0 && $h === 0 && $rbi === 0 && $so === 0);
                    
                    $pos = isset($p['position']['abbreviation']) ? $p['position']['abbreviation'] : '';
                    $rawName = $fullName . ($pos ? ' ' . $pos : '');
                    
                    $lineup[] = [
                        "rawName" => $rawName,
                        "cleanName" => $cleanName,
                        "isSubstitution" => $isSub,
                        "hits" => $h,
                        "tb" => $isSub ? 0 : $tb,
                        "todosCeros" => $todosCeros,
                        "stats" => [ "ab" => $ab, "r" => $r, "h" => $h, "rbi" => $rbi, "so" => $so ]
                    ];
                }
                
                $boxscores[] = [
                    "teamName" => $teamName,
                    "runs" => $teamRuns,
                    "lineup" => $lineup
                ];
            }
            
            $visitorName = isset($boxscores[0]['teamName']) ? $boxscores[0]['teamName'] : 'Visitante';
            $homeName = isset($boxscores[1]['teamName']) ? $boxscores[1]['teamName'] : 'Casa';
            $title = "MLB Gameday: " . $visitorName . " vs. " . $homeName;
            
            // Usar la fecha del calendario MLB consultado (no la conversión a la zona
            // horaria del servidor, que etiquetaba mal los juegos nocturnos)
            $gameDate = str_replace('-', '/', $syncDate);
            
            $existing[$gameId] = [
                "gameId" => $gameId,
                "date" => $gameDate,
                "title" => $title,
                "captured_at" => date('c'),
                "boxscores" => $boxscores
            ];
            
            $syncCount++;
        }
    }
    
    if ($syncCount > 0) {
        file_put_contents($basesFile, json_encode($existing, JSON_PRETTY_PRINT), LOCK_EX);
        clearstatcache(true, $basesFile);
    }
    
    echo json_encode([
        "success" => true,
        "synchronized" => $syncCount,
        "already_imported" => $alreadyCount,
        "dates_synced" => $datesToSync,
        "fetch_errors" => $fetchErrors,
        "message" => "Sincronización completada. $syncCount juegos nuevos importados.",
        "games" => $existing
    ]);
    exit;
}

// ====================================================================
// Comparador multi-fuente (Sofascore / Flashscore / ESPN / MLB.com)
// ====================================================================

// Fecha "de hoy" en la zona de los usuarios (RD/AST), no la del servidor.
function cmp_todayIso() {
    $dt = new DateTime('now', new DateTimeZone('America/Santo_Domingo'));
    return $dt->format('Y-m-d');
}

function cmp_dateParam() {
    $date = isset($_GET['date']) ? $_GET['date'] : '';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $date = cmp_todayIso();
    }
    return $date;
}

function cmp_isPastDate($date) {
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) && $date < cmp_todayIso();
}

function cmp_isLiveStatus($status) {
    $status = strtoupper(trim((string)$status));
    if ($status === '') return false;
    return !in_array($status, ['NS', 'FT', 'AET', 'AP', 'POSTPONED', 'CANCELLED', 'CANCELED', 'ABANDONED'], true);
}

function cmp_shouldSkipStalePastLive($file, $date, $status) {
    if (!$date || !cmp_isPastDate($date) || !cmp_isLiveStatus($status)) return false;
    clearstatcache(true, $file);
    $mtime = @filemtime($file);
    return $mtime && (time() - $mtime) > 30 * 60;
}

// Normaliza un nombre de equipo para poder cruzarlo entre fuentes
function cmp_normalizeName($name) {
    $name = function_exists('mb_strtolower') ? mb_strtolower(trim($name), 'UTF-8') : strtolower(trim($name));
    $name = strtr($name, [
        'á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','à'=>'a','è'=>'e','ì'=>'i','ò'=>'o','ù'=>'u',
        'ä'=>'a','ë'=>'e','ï'=>'i','ö'=>'o','ü'=>'u','ñ'=>'n','ç'=>'c','ã'=>'a','õ'=>'o','â'=>'a','ê'=>'e','ô'=>'o'
    ]);
    // Quitar palabras genéricas que varían entre fuentes
    $name = preg_replace('/\b(fc|cf|bc|bk|kk|sc|ac|club|cd|deportivo|basket|basketball|city)\b/', ' ', $name);
    $name = preg_replace('/[^a-z0-9 ]/', ' ', $name);
    $name = preg_replace('/\s+/', ' ', trim($name));
    return $name;
}

// Detecta si un texto (equipos y/o liga) parece de partido femenino
function cmp_isWomen($text) {
    return preg_match('/\b(w|women|fem(enin[ao]|enil)?|ladies)\b/', cmp_normalizeName($text)) === 1;
}

// Tokens "núcleo" de un nombre: normalizado y sin el marcador de género, porque
// unas fuentes lo ponen en el equipo ("Sweden U20 W") y otras en la liga.
function cmp_coreTokens($name) {
    $n = cmp_normalizeName($name);
    $n = preg_replace('/\b(w|women|ladies)\b/', ' ', $n);
    $n = preg_replace('/\s+/', ' ', trim($n));
    return array_values(array_filter(explode(' ', $n)));
}

// Dos tokens se consideran iguales si coinciden o si son casi iguales
// (variantes tipo "Turkiye"/"Turkey") con distancia Levenshtein <= 2.
function cmp_tokenEquals($a, $b) {
    if ($a === $b) return true;
    if (min(strlen($a), strlen($b)) >= 5 && levenshtein($a, $b) <= 2) return true;
    return false;
}

function cmp_teamsMatch($a, $b) {
    $ta = cmp_coreTokens($a);
    $tb = cmp_coreTokens($b);
    if (count($ta) === 0 || count($tb) === 0) return false;

    $sa = implode(' ', $ta);
    $sb = implode(' ', $tb);
    if ($sa === $sb) return true;
    if (strpos($sa, $sb) !== false || strpos($sb, $sa) !== false) return true;

    // Solapamiento de tokens con tolerancia a variantes
    $shorter = count($ta) <= count($tb) ? $ta : $tb;
    $longer  = count($ta) <= count($tb) ? $tb : $ta;
    $common = 0;
    foreach ($shorter as $tokA) {
        foreach ($longer as $tokB) {
            if (cmp_tokenEquals($tokA, $tokB)) { $common++; break; }
        }
    }
    return ($common / count($shorter)) >= 0.6;
}

// Lee un archivo en formato Livescore ({Stages:[{Events:[...]}]}) generado por los
// crawlers y lo aplana a una lista de juegos normalizados.
function cmp_loadStagesFile($file, $sport, $date = null) {
    if (!file_exists($file)) return [];
    clearstatcache(true, $file);
    $json = json_decode(file_get_contents($file), true);
    if (!isset($json['Stages']) || !is_array($json['Stages'])) return [];

    $periodKeys = $sport === 'basketball' ? ['Q1','Q2','Q3','Q4','OT'] : ['H1','H2','OT'];
    $games = [];
    foreach ($json['Stages'] as $stage) {
        $cnm = isset($stage['Cnm']) ? trim($stage['Cnm']) : '';
        $snm = isset($stage['Snm']) ? trim($stage['Snm']) : '';
        $league = trim($cnm . ($cnm && $snm && $cnm !== $snm ? ' — ' : '') . ($snm !== $cnm ? $snm : ''));
        if ($league === '') $league = 'Liga desconocida';

        $events = isset($stage['Events']) && is_array($stage['Events']) ? $stage['Events'] : [];
        foreach ($events as $ev) {
            $home = isset($ev['T1'][0]['Nm']) ? $ev['T1'][0]['Nm'] : '?';
            $away = isset($ev['T2'][0]['Nm']) ? $ev['T2'][0]['Nm'] : '?';
            $status = isset($ev['Eps']) ? (string)$ev['Eps'] : 'NS';

            if (cmp_shouldSkipStalePastLive($file, $date, $status)) {
                continue;
            }

            $hQ = [];
            $aQ = [];
            foreach ($periodKeys as $k) {
                $h = isset($ev["Tr1$k"]) ? trim((string)$ev["Tr1$k"]) : '';
                $a = isset($ev["Tr2$k"]) ? trim((string)$ev["Tr2$k"]) : '';
                if ($h !== '' || $a !== '') {
                    $hQ[] = $h;
                    $aQ[] = $a;
                }
            }

            $games[] = [
                'home' => $home,
                'away' => $away,
                'league' => $league,
                'data' => [
                    'homeScore' => isset($ev['Tr1']) ? trim((string)$ev['Tr1']) : '',
                    'awayScore' => isset($ev['Tr2']) ? trim((string)$ev['Tr2']) : '',
                    'homeQuarters' => $hQ,
                    'awayQuarters' => $aQ,
                    'status' => $status
                ]
            ];
        }
    }
    return $games;
}

// Descarga JSON externo con caché en disco (para no abusar de las APIs públicas)
function cmp_fetchJsonCached($url, $cacheKey, $ttl = 55) {
    $cacheFile = dirname(__DIR__) . '/cache_cmp_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $cacheKey) . '.json';

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $ttl) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if ($cached !== null) return $cached;
    }

    $err = null;
    $res = fetchExternalJson($url, $err);
    if ($res !== false && $res !== null) {
        $decoded = json_decode($res, true);
        if ($decoded !== null) {
            file_put_contents($cacheFile, $res, LOCK_EX);
            return $decoded;
        }
    }
    // Si falló la descarga, servir caché viejo antes que nada
    if (file_exists($cacheFile)) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if ($cached !== null) return $cached;
    }
    return null;
}

function cmp_cleanOldCaches() {
    foreach (glob(dirname(__DIR__) . '/cache_cmp_*.json') as $viejo) {
        if (time() - filemtime($viejo) > 86400) @unlink($viejo);
    }
}

function cmp_mapEspnStatus($statusType) {
    $state = isset($statusType['state']) ? $statusType['state'] : '';
    if ($state === 'pre') return 'NS';
    if ($state === 'post') return 'FT';
    return isset($statusType['shortDetail']) ? $statusType['shortDetail'] : 'LIVE';
}

function cmp_dateShiftYmd($dateIso, $days) {
    $dt = DateTime::createFromFormat('Y-m-d', $dateIso, new DateTimeZone('America/Santo_Domingo'));
    if (!$dt) return str_replace('-', '', $dateIso);
    if ($days !== 0) {
        $dt->modify(($days > 0 ? '+' : '') . $days . ' day');
    }
    return $dt->format('Ymd');
}

function cmp_eventLocalDate($dateTime) {
    if (!$dateTime) return '';
    try {
        $dt = new DateTime($dateTime);
        $dt->setTimezone(new DateTimeZone('America/Santo_Domingo'));
        return $dt->format('Y-m-d');
    } catch (Exception $e) {
        return '';
    }
}

function cmp_espnBasketballLeagues() {
    return [
        'nba', 'wnba', 'mens-college-basketball', 'fiba',
        'mens-olympics-basketball', 'womens-olympics-basketball', 'nbl',
        'nba-summer-las-vegas', 'nba-summer-utah', 'nba-summer-california', 'nba-development',
        'nba-summer-golden-state', 'nba-summer-orlando', 'nba-summer-sacramento'
    ];
}

// Trae los juegos de ESPN para las ligas configuradas y los normaliza al mismo
// formato que las otras fuentes.
function cmp_espnGamesRaw($sport, $dateIso) {
    $dateYmd = str_replace('-', '', $dateIso);
    $leaguesBySport = [
        'basketball' => [
            'nba', 'wnba', 'mens-college-basketball', 'womens-college-basketball',
            'nba-summer-las-vegas', 'nba-summer-utah', 'nba-summer-california', 'nba-development'
        ],
        'soccer'     => ['usa.1', 'eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'mex.1']
    ];
    if (!isset($leaguesBySport[$sport])) return [];

    $games = [];
    foreach ($leaguesBySport[$sport] as $league) {
        $url = "https://site.api.espn.com/apis/site/v2/sports/{$sport}/{$league}/scoreboard?dates={$dateYmd}";
        $json = cmp_fetchJsonCached($url, "espn_{$sport}_{$league}_{$dateYmd}");
        if (!$json || !isset($json['events']) || !is_array($json['events'])) continue;

        $leagueName = isset($json['leagues'][0]['abbreviation']) ? $json['leagues'][0]['abbreviation'] : strtoupper($league);

        foreach ($json['events'] as $event) {
            if (!isset($event['competitions'][0]['competitors'])) continue;
            $comp = $event['competitions'][0];

            $home = null;
            $away = null;
            foreach ($comp['competitors'] as $c) {
                $side = isset($c['homeAway']) ? $c['homeAway'] : '';
                $entry = [
                    'name' => isset($c['team']['displayName']) ? $c['team']['displayName'] : '?',
                    'score' => isset($c['score']) ? (string)$c['score'] : '',
                    'quarters' => []
                ];
                if (isset($c['linescores']) && is_array($c['linescores'])) {
                    foreach ($c['linescores'] as $ls) {
                        $entry['quarters'][] = isset($ls['value']) ? (string)(int)$ls['value'] : '';
                    }
                }
                if ($side === 'home') $home = $entry;
                if ($side === 'away') $away = $entry;
            }
            if (!$home || !$away) continue;

            $statusType = isset($comp['status']['type']) ? $comp['status']['type'] : (isset($event['status']['type']) ? $event['status']['type'] : []);
            $status = cmp_mapEspnStatus($statusType);

            // En juegos no iniciados ESPN reporta "0" mientras otras fuentes reportan
            // vacío; se deja en blanco para no generar falsas discrepancias.
            if ($status === 'NS') {
                $home['score'] = '';
                $away['score'] = '';
                $home['quarters'] = [];
                $away['quarters'] = [];
            }

            $games[] = [
                'home' => $home['name'],
                'away' => $away['name'],
                'league' => $leagueName,
                'data' => [
                    'homeScore' => $home['score'],
                    'awayScore' => $away['score'],
                    'homeQuarters' => $home['quarters'],
                    'awayQuarters' => $away['quarters'],
                    'status' => $status
                ]
            ];
        }
    }
    return $games;
}

// Fusiona juegos de varias fuentes en una sola lista, cruzando por nombres de equipo.
// El género del partido se evalúa con equipos + liga, porque cada fuente lo marca
// en un lugar distinto; no se cruzan partidos femeninos con masculinos.
function cmp_espnGames($sport, $dateIso) {
    $leaguesBySport = [
        'basketball' => cmp_espnBasketballLeagues(),
        'soccer' => ['usa.1', 'eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'mex.1']
    ];
    if (!isset($leaguesBySport[$sport])) return [];

    $games = [];
    $seenEvents = [];
    $dateCandidates = array_values(array_unique([
        cmp_dateShiftYmd($dateIso, -1),
        cmp_dateShiftYmd($dateIso, 0),
        cmp_dateShiftYmd($dateIso, 1)
    ]));

    foreach ($leaguesBySport[$sport] as $league) {
        foreach ($dateCandidates as $dateYmd) {
            $url = "https://site.api.espn.com/apis/site/v2/sports/{$sport}/{$league}/scoreboard?dates={$dateYmd}";
            $todayYmd = date('Ymd');
            $ttl = ($dateYmd === $todayYmd) ? 120 : 86400;
            $json = cmp_fetchJsonCached($url, "espn_{$sport}_{$league}_{$dateYmd}", $ttl);
            if (!$json || !isset($json['events']) || !is_array($json['events'])) continue;

            $leagueName = isset($json['leagues'][0]['abbreviation']) ? $json['leagues'][0]['abbreviation'] : strtoupper($league);

            foreach ($json['events'] as $event) {
                $eventId = isset($event['id']) ? (string)$event['id'] : '';
                $seenKey = $league . ':' . $eventId;
                if ($eventId !== '' && isset($seenEvents[$seenKey])) continue;
                if ($eventId !== '') $seenEvents[$seenKey] = true;

                $eventDate = isset($event['date']) ? $event['date'] : (isset($event['competitions'][0]['date']) ? $event['competitions'][0]['date'] : '');
                if (cmp_eventLocalDate($eventDate) !== $dateIso) continue;

                if (!isset($event['competitions'][0]['competitors'])) continue;
                $comp = $event['competitions'][0];

                $home = null;
                $away = null;
                foreach ($comp['competitors'] as $c) {
                    $side = isset($c['homeAway']) ? $c['homeAway'] : '';
                    $entry = [
                        'name' => isset($c['team']['displayName']) ? $c['team']['displayName'] : '?',
                        'score' => isset($c['score']) ? (string)$c['score'] : '',
                        'quarters' => []
                    ];
                    if (isset($c['linescores']) && is_array($c['linescores'])) {
                        foreach ($c['linescores'] as $ls) {
                            $entry['quarters'][] = isset($ls['value']) ? (string)(int)$ls['value'] : '';
                        }
                    }
                    if ($side === 'home') $home = $entry;
                    if ($side === 'away') $away = $entry;
                }
                if (!$home || !$away) continue;

                $statusType = isset($comp['status']['type']) ? $comp['status']['type'] : (isset($event['status']['type']) ? $event['status']['type'] : []);
                $status = cmp_mapEspnStatus($statusType);

                if ($status === 'NS') {
                    $home['score'] = '';
                    $away['score'] = '';
                    $home['quarters'] = [];
                    $away['quarters'] = [];
                }

                $games[] = [
                    'home' => $home['name'],
                    'away' => $away['name'],
                    'league' => $leagueName,
                    'data' => [
                        'homeScore' => $home['score'],
                        'awayScore' => $away['score'],
                        'homeQuarters' => $home['quarters'],
                        'awayQuarters' => $away['quarters'],
                        'status' => $status
                    ]
                ];
            }
        }
    }
    return $games;
}

function cmp_mergeSource(&$rows, $sourceGames, $sourceKey, $emptyRow) {
    foreach ($sourceGames as $g) {
        $gWomen = cmp_isWomen($g['home'] . ' ' . $g['away'] . ' ' . $g['league']);
        $matched = false;
        foreach ($rows as &$row) {
            if ($row[$sourceKey] === null
                && $row['_women'] === $gWomen
                && cmp_teamsMatch($row['home'], $g['home'])
                && cmp_teamsMatch($row['away'], $g['away'])) {
                $row[$sourceKey] = $g['data'];
                $matched = true;
                break;
            }
        }
        unset($row);
        if (!$matched) {
            $newRow = $emptyRow;
            $newRow['home'] = $g['home'];
            $newRow['away'] = $g['away'];
            $newRow['league'] = $g['league'];
            $newRow['_women'] = $gWomen;
            $newRow[$sourceKey] = $g['data'];
            $rows[] = $newRow;
        }
    }
}

// Acción: get_basketball_comparison / get_soccer_comparison
if ($action === 'get_basketball_comparison' || $action === 'get_soccer_comparison') {
    $sport = $action === 'get_basketball_comparison' ? 'basketball' : 'soccer';
    $date = cmp_dateParam();
    $dir = dirname(__DIR__);

    cmp_cleanOldCaches();

    $sofa = cmp_loadStagesFile("$dir/sofascore_{$sport}_{$date}.json", $sport, $date);
    $flash = cmp_loadStagesFile("$dir/flashscore_{$sport}_{$date}.json", $sport, $date);
    $espn = cmp_espnGames($sport, $date);

    $emptyRow = ['home' => '', 'away' => '', 'league' => '', '_women' => false, 'sofascore' => null, 'flashscore' => null, 'espn' => null];
    $rows = [];
    cmp_mergeSource($rows, $sofa, 'sofascore', $emptyRow);
    cmp_mergeSource($rows, $flash, 'flashscore', $emptyRow);
    cmp_mergeSource($rows, $espn, 'espn', $emptyRow);

    // Quitar la marca interna de género antes de responder
    foreach ($rows as &$row) { unset($row['_women']); }
    unset($row);

    echo json_encode(array_values($rows));
    exit;
}

// Acción: get_mlb_comparison — cruza MLB.com (statsapi) con ESPN
if ($action === 'get_mlb_comparison') {
    $date = cmp_dateParam();
    $dateYmd = str_replace('-', '', $date);

    cmp_cleanOldCaches();

    // Fuente 1: MLB StatsAPI con linescore (runs y hits)
    $mlbGames = [];
    $mlbJson = cmp_fetchJsonCached(
        "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={$date}&hydrate=linescore",
        "mlb_schedule_{$date}"
    );
    if ($mlbJson && isset($mlbJson['dates'][0]['games'])) {
        foreach ($mlbJson['dates'][0]['games'] as $g) {
            $homeName = isset($g['teams']['home']['team']['name']) ? $g['teams']['home']['team']['name'] : '?';
            $awayName = isset($g['teams']['away']['team']['name']) ? $g['teams']['away']['team']['name'] : '?';
            $ls = isset($g['linescore']['teams']) ? $g['linescore']['teams'] : [];
            $mlbGames[] = [
                'home' => $homeName,
                'away' => $awayName,
                'data' => [
                    'homeRuns' => isset($ls['home']['runs']) ? (string)$ls['home']['runs'] : '0',
                    'awayRuns' => isset($ls['away']['runs']) ? (string)$ls['away']['runs'] : '0',
                    'homeHits' => isset($ls['home']['hits']) ? (string)$ls['home']['hits'] : '0',
                    'awayHits' => isset($ls['away']['hits']) ? (string)$ls['away']['hits'] : '0',
                    'status' => isset($g['status']['abstractGameState']) ? $g['status']['abstractGameState'] : ''
                ]
            ];
        }
    }

    // Fuente 2: ESPN MLB
    $espnGames = [];
    $espnJson = cmp_fetchJsonCached(
        "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates={$dateYmd}",
        "espn_mlb_{$dateYmd}"
    );
    if ($espnJson && isset($espnJson['events'])) {
        foreach ($espnJson['events'] as $event) {
            if (!isset($event['competitions'][0]['competitors'])) continue;
            $comp = $event['competitions'][0];
            $home = null;
            $away = null;
            foreach ($comp['competitors'] as $c) {
                // Los hits pueden venir como campo directo o dentro de statistics
                $hits = isset($c['hits']) ? (string)$c['hits'] : '';
                if ($hits === '' && isset($c['statistics']) && is_array($c['statistics'])) {
                    foreach ($c['statistics'] as $st) {
                        if (isset($st['name']) && strtolower($st['name']) === 'hits') {
                            $hits = isset($st['displayValue']) ? (string)$st['displayValue'] : '';
                            break;
                        }
                    }
                }
                $entry = [
                    'name' => isset($c['team']['displayName']) ? $c['team']['displayName'] : '?',
                    'runs' => isset($c['score']) ? (string)$c['score'] : '0',
                    'hits' => $hits !== '' ? $hits : '0'
                ];
                $side = isset($c['homeAway']) ? $c['homeAway'] : '';
                if ($side === 'home') $home = $entry;
                if ($side === 'away') $away = $entry;
            }
            if (!$home || !$away) continue;

            $statusType = isset($comp['status']['type']) ? $comp['status']['type'] : [];
            $espnGames[] = [
                'home' => $home['name'],
                'away' => $away['name'],
                'data' => [
                    'homeRuns' => $home['runs'],
                    'awayRuns' => $away['runs'],
                    'homeHits' => $home['hits'],
                    'awayHits' => $away['hits'],
                    'status' => cmp_mapEspnStatus($statusType)
                ]
            ];
        }
    }

    // Fusionar por nombres de equipo
    $rows = [];
    foreach ($mlbGames as $g) {
        $rows[] = [
            'home' => $g['home'],
            'away' => $g['away'],
            'league' => 'MLB',
            'mlb' => $g['data'],
            'espn' => null
        ];
    }
    foreach ($espnGames as $g) {
        $matched = false;
        foreach ($rows as &$row) {
            if ($row['espn'] === null
                && cmp_teamsMatch($row['home'], $g['home'])
                && cmp_teamsMatch($row['away'], $g['away'])) {
                $row['espn'] = $g['data'];
                $matched = true;
                break;
            }
        }
        unset($row);
        if (!$matched) {
            $rows[] = [
                'home' => $g['home'],
                'away' => $g['away'],
                'league' => 'MLB',
                'mlb' => null,
                'espn' => $g['data']
            ];
        }
    }

    echo json_encode(array_values($rows));
    exit;
}

http_response_code(400);
echo json_encode(["status" => "error", "message" => "Acción no válida"]);

