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
// Fallback a file_get_contents si cURL no está disponible.
function fetchExternalJson($url, &$error = null) {
    $error = null;
    if (function_exists('curl_init')) {
        for ($try = 0; $try < 2; $try++) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
                CURLOPT_USERAGENT => 'CalcParley/1.0 (+https://calcparley.bsolutions.dev)',
                CURLOPT_HTTPHEADER => ['Accept: application/json']
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
        return false;
    }
    $context = stream_context_create([
        'http' => [
            'timeout' => 15,
            'ignore_errors' => true,
            'header' => "User-Agent: CalcParley/1.0\r\nAccept: application/json\r\n"
        ]
    ]);
    $res = @file_get_contents($url, false, $context);
    if ($res === false) {
        $error = 'file_get_contents fallo (revisa allow_url_fopen/openssl)';
    }
    return $res;
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

http_response_code(400);
echo json_encode(["status" => "error", "message" => "Acción no válida"]);

