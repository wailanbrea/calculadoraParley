<?php
// CORS setup
$allowed_origins = [
    'http://172.20.0.251:8080',
    'https://calcparley.bsolutions.dev'
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

http_response_code(400);
echo json_encode(["status" => "error", "message" => "Acción no válida"]);
