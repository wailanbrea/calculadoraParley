<?php
// verificacion.php — Módulo de Verificación de Resultados.
//
// Fuente principal = api-basketball (mismo caché que api.php). Fuente secundaria = ESPN
// (endpoint JSON público, SIN scraping de HTML). Es aditivo: no toca el flujo de
// marcadores. Si no hay match en la 2da fuente, degrada a SIN_2DA_FUENTE sin romper nada.
//
// Para BASKETBALL compara SOLO estas líneas (regla del negocio de CalcParley):
//   1Q  = puntos del 1er cuarto
//   2Q  = puntos del 2do cuarto
//   H   = medio tiempo (Q1 + Q2)
//   Final = marcador final del juego completo
//
// Uso:  ./verificacion.php?sport=basketball&date=YYYY-MM-DD&eids=123,456
//       (sin eids verifica todos los juegos finalizados del caché de esa fecha)

header('Content-Type: application/json; charset=utf-8');

$root      = dirname(__DIR__);                 // raíz del proyecto (fuera de public/)
$cacheDir  = $root;                            // los cache_apibasket_*.json viven aquí
$storeFile = $root . '/verificacion_resultados.json';

$sport = isset($_GET['sport']) ? $_GET['sport'] : 'basketball';
$date  = (isset($_GET['date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['date'])) ? $_GET['date'] : date('Y-m-d');
$eidsRaw = isset($_GET['eids']) ? $_GET['eids'] : (isset($_GET['eid']) ? $_GET['eid'] : '');
$eids = array_filter(array_map('trim', explode(',', $eidsRaw)), 'strlen');

if ($sport !== 'basketball') {
    echo json_encode(['error' => 'Por ahora solo se verifica basketball']);
    exit;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function httpGetJson($url) {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_ENCODING => '',
        CURLOPT_USERAGENT => 'Mozilla/5.0 CalcParley/1.0',
    ]);
    $res = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($res === false || $code < 200 || $code >= 300) return null;
    $j = json_decode($res, true);
    return is_array($j) ? $j : null;
}

function toIntOrNull($v) { return is_numeric($v) ? (int) $v : null; }

// Nombre de equipo normalizado para emparejar entre fuentes distintas
function normNombre($s) {
    $s = function_exists('mb_strtolower') ? mb_strtolower((string)$s, 'UTF-8') : strtolower((string)$s);
    $s = strtr($s, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n']);
    $s = preg_replace('/\b(bc|sc|fc|basketball|club|team|deportivo)\b/u', '', $s);
    $s = preg_replace('/[^a-z0-9]/', '', $s);
    return $s;
}

function nombresCoinciden($a, $b) {
    $a = normNombre($a); $b = normNombre($b);
    if ($a === '' || $b === '') return false;
    if ($a === $b) return true;
    return strpos($a, $b) !== false || strpos($b, $a) !== false;
}

// ---------------------------------------------------------------------------
// Fuente principal: api-basketball (desde el caché que ya escribe api.php)
// ---------------------------------------------------------------------------
function cargarApiBasket($cacheDir, $date) {
    $cf = $cacheDir . "/cache_apibasket_{$date}.json";
    if (!file_exists($cf)) return [];
    $data = json_decode(file_get_contents($cf), true);
    if (!isset($data['Stages'])) return [];
    $out = [];
    foreach ($data['Stages'] as $st) {
        foreach ((isset($st['Events']) ? $st['Events'] : []) as $e) {
            $eid = (string)(isset($e['Eid']) ? $e['Eid'] : '');
            if ($eid === '') continue;
            $out[$eid] = [
                'eid'   => $eid,
                'home'  => isset($e['T1'][0]['Nm']) ? $e['T1'][0]['Nm'] : '?',
                'away'  => isset($e['T2'][0]['Nm']) ? $e['T2'][0]['Nm'] : '?',
                'q1h'   => toIntOrNull(isset($e['Tr1Q1']) ? $e['Tr1Q1'] : null),
                'q1a'   => toIntOrNull(isset($e['Tr2Q1']) ? $e['Tr2Q1'] : null),
                'q2h'   => toIntOrNull(isset($e['Tr1Q2']) ? $e['Tr1Q2'] : null),
                'q2a'   => toIntOrNull(isset($e['Tr2Q2']) ? $e['Tr2Q2'] : null),
                'th'    => toIntOrNull(isset($e['Tr1']) ? $e['Tr1'] : null),
                'ta'    => toIntOrNull(isset($e['Tr2']) ? $e['Tr2'] : null),
                'final' => (isset($e['Eps']) && $e['Eps'] === 'FT'),
                'eps'   => isset($e['Eps']) ? $e['Eps'] : 'NS',
            ];
        }
    }
    return $out;
}

// ---------------------------------------------------------------------------
// Fuente secundaria: ESPN (JSON público, varias ligas de básquet)
// ---------------------------------------------------------------------------
function cargarEspnBasket($date, $cacheDir) {
    $ymd = str_replace('-', '', $date);
    // Mismas ligas que el Comparador (cmp_espnGamesRaw): NBA, summer league, college, etc.
    // Reutiliza su mismo caché en disco (cache_cmp_espn_basketball_*) para NO duplicar
    // llamadas a ESPN; si falta o está viejo, lo descarga y lo deja cacheado para ambos.
    $ligas = ['nba', 'wnba', 'mens-college-basketball', 'womens-college-basketball',
              'nba-summer-las-vegas', 'nba-summer-utah', 'nba-summer-california', 'nba-development'];
    $juegos = [];
    foreach ($ligas as $lg) {
        $cacheFile = $cacheDir . "/cache_cmp_espn_basketball_{$lg}_{$ymd}.json";
        $j = null;
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 300) {
            $j = json_decode(file_get_contents($cacheFile), true);
        }
        if (!$j) {
            $url = "https://site.api.espn.com/apis/site/v2/sports/basketball/{$lg}/scoreboard?dates={$ymd}";
            $j = httpGetJson($url);
            if ($j) @file_put_contents($cacheFile, json_encode($j), LOCK_EX);
        }
        if (!$j || !isset($j['events'])) continue;
        foreach ($j['events'] as $ev) {
            $comp = isset($ev['competitions'][0]) ? $ev['competitions'][0] : null;
            if (!$comp) continue;
            $home = null; $away = null;
            foreach ((isset($comp['competitors']) ? $comp['competitors'] : []) as $c) {
                $ls = [];
                foreach ((isset($c['linescores']) ? $c['linescores'] : []) as $l) {
                    $ls[] = toIntOrNull(isset($l['value']) ? $l['value'] : null);
                }
                $side = [
                    'name'  => isset($c['team']['displayName']) ? $c['team']['displayName'] : '?',
                    'total' => toIntOrNull(isset($c['score']) ? $c['score'] : null),
                    'q'     => $ls,
                ];
                if ((isset($c['homeAway']) ? $c['homeAway'] : '') === 'home') $home = $side;
                else $away = $side;
            }
            if (!$home || !$away) continue;
            $st = isset($ev['status']['type']) ? $ev['status']['type'] : [];
            $juegos[] = [
                'home'  => $home['name'], 'away' => $away['name'],
                'q1h'   => isset($home['q'][0]) ? $home['q'][0] : null,
                'q1a'   => isset($away['q'][0]) ? $away['q'][0] : null,
                'q2h'   => isset($home['q'][1]) ? $home['q'][1] : null,
                'q2a'   => isset($away['q'][1]) ? $away['q'][1] : null,
                'th'    => $home['total'], 'ta' => $away['total'],
                'final' => !empty($st['completed']),
            ];
        }
    }
    return $juegos;
}

// Empareja un juego de api-basketball con uno de ESPN (tolera lados invertidos)
function buscarMatchEspn($api, $espnJuegos) {
    foreach ($espnJuegos as $e) {
        if (nombresCoinciden($api['home'], $e['home']) && nombresCoinciden($api['away'], $e['away'])) {
            return $e; // mismos lados
        }
        if (nombresCoinciden($api['home'], $e['away']) && nombresCoinciden($api['away'], $e['home'])) {
            // lados invertidos: intercambiar para comparar home-con-home
            return [
                'home'=>$e['away'], 'away'=>$e['home'],
                'q1h'=>$e['q1a'], 'q1a'=>$e['q1h'],
                'q2h'=>$e['q2a'], 'q2a'=>$e['q2h'],
                'th'=>$e['ta'], 'ta'=>$e['th'], 'final'=>$e['final'],
            ];
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Comparación: SOLO 1Q, 2Q, H (medio tiempo) y Final
// ---------------------------------------------------------------------------
function compararBasket($a, $e) {
    $lineas = [];
    $conflicto = false;
    $comparadas = 0;

    $cmp = function ($clave, $ah, $aa, $eh, $ea) use (&$lineas, &$conflicto, &$comparadas) {
        if ($ah === null || $aa === null || $eh === null || $ea === null) {
            $lineas[$clave] = ['estado' => 'sin_datos'];
            return;
        }
        $ok = ($ah == $eh && $aa == $ea);
        $lineas[$clave] = ['estado' => $ok ? 'ok' : 'conflicto', 'api' => "$ah-$aa", 'espn' => "$eh-$ea"];
        $comparadas++;
        if (!$ok) $conflicto = true;
    };

    $cmp('1Q', $a['q1h'], $a['q1a'], $e['q1h'], $e['q1a']);
    $cmp('2Q', $a['q2h'], $a['q2a'], $e['q2h'], $e['q2a']);

    // H = medio tiempo = Q1 + Q2
    $sum = function ($x, $y) { return ($x !== null && $y !== null) ? $x + $y : null; };
    $cmp('H',
        $sum($a['q1h'], $a['q2h']), $sum($a['q1a'], $a['q2a']),
        $sum($e['q1h'], $e['q2h']), $sum($e['q1a'], $e['q2a'])
    );

    $cmp('Final', $a['th'], $a['ta'], $e['th'], $e['ta']);

    if ($comparadas === 0) {
        $veredicto = 'SIN_DATOS';
    } elseif ($conflicto) {
        $veredicto = 'CONFLICTO';
    } elseif ((isset($lineas['Final']['estado']) && $lineas['Final']['estado'] === 'ok') && $a['final'] && $e['final']) {
        $veredicto = 'VERIFICADO';
    } else {
        $veredicto = 'PENDIENTE';
    }

    return ['veredicto' => $veredicto, 'lineas' => $lineas];
}

// ---------------------------------------------------------------------------
// Flujo principal
// ---------------------------------------------------------------------------
// Permite cargar solo las funciones (para tests): define VERIF_LIB_ONLY e incluye.
if (defined('VERIF_LIB_ONLY')) { return; }

$apiJuegos = cargarApiBasket($cacheDir, $date);
if (!$apiJuegos) {
    echo json_encode(['date' => $date, 'error' => 'sin_cache_apibasket', 'resultados' => []]);
    exit;
}

// Qué juegos verificar: los eids pedidos, o todos los que estén finalizados
$objetivo = [];
foreach ($apiJuegos as $eid => $g) {
    if ($eids) { if (in_array((string)$eid, $eids, true)) $objetivo[$eid] = $g; }
    elseif ($g['final']) { $objetivo[$eid] = $g; }
}

if (!$objetivo) {
    echo json_encode(['date' => $date, 'resultados' => [], 'nota' => 'ningún juego objetivo (finalizado) en esta fecha']);
    exit;
}

// Persistencia de veredictos (idempotente: se reusa lo ya verificado como VERIFICADO/CONFLICTO)
$store = file_exists($storeFile) ? json_decode(file_get_contents($storeFile), true) : [];
if (!is_array($store)) $store = [];

$espnJuegos = null; // se carga perezosamente solo si hace falta
$resultados = [];

foreach ($objetivo as $eid => $g) {
    $clave = "bk_{$date}_{$eid}";

    // Si ya hay un veredicto firme guardado, reusarlo (no gastar red)
    if (isset($store[$clave]['veredicto']) && in_array($store[$clave]['veredicto'], ['VERIFICADO', 'CONFLICTO'], true)) {
        $resultados[$eid] = $store[$clave];
        continue;
    }

    if ($espnJuegos === null) $espnJuegos = cargarEspnBasket($date, $cacheDir);
    $match = buscarMatchEspn($g, $espnJuegos);

    if (!$match) {
        $res = [
            'veredicto' => 'SIN_2DA_FUENTE',
            'partido'   => $g['home'] . ' vs ' . $g['away'],
            'api'       => ['final' => "{$g['th']}-{$g['ta']}", 'eps' => $g['eps']],
            'checked_at'=> gmdate('c'),
        ];
    } else {
        $comp = compararBasket($g, $match);
        $res = [
            'veredicto' => $comp['veredicto'],
            'partido'   => $g['home'] . ' vs ' . $g['away'],
            'lineas'    => $comp['lineas'],
            'checked_at'=> gmdate('c'),
        ];
    }

    $store[$clave] = $res;
    $resultados[$eid] = $res;
}

file_put_contents($storeFile, json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

echo json_encode(['date' => $date, 'resultados' => $resultados], JSON_UNESCAPED_UNICODE);
