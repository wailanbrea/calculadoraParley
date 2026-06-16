<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST");
header("Content-Type: application/json; charset=UTF-8");

$configFile = __DIR__ . '/server_config.json';

// Si el archivo no existe, lo inicializamos como nulo
if (!file_exists($configFile)) {
    file_put_contents($configFile, json_encode(null));
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'get') {
    $data = file_get_contents($configFile);
    echo $data;
    exit;
}

if ($action === 'save') {
    $input = file_get_contents('php://input');
    // Validar JSON
    $decoded = json_decode($input, true);
    if ($decoded !== null) {
        if (file_put_contents($configFile, json_encode($decoded, JSON_PRETTY_PRINT))) {
            echo json_encode(["status" => "success", "message" => "Configuración guardada en el servidor"]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "No se pudo escribir el archivo. Verifica permisos de escritura."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "JSON inválido"]);
    }
    exit;
}

echo json_encode(["status" => "error", "message" => "Acción no válida"]);
