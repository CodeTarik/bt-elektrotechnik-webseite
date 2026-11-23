<?php
/**
 * Börsenstrompreis (Day-Ahead, Gebotszone DE-LU) für bt-elektrotech.de
 *
 * Holt die Preise von der Energy-Charts-API (Fraunhofer ISE) und speichert sie
 * zwischen. Besucher rufen nur diese Datei auf, nie die API direkt:
 *  - Energy-Charts erlaubt nur ca. 2 Abrufe pro Minute
 *  - keine Daten der Besucher gehen an Dritte (Datenschutz)
 *
 * Daten: Bundesnetzagentur | SMARD.de via Energy-Charts / Fraunhofer ISE (CC BY 4.0)
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Berlin');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const SOURCE_URL = 'https://api.energy-charts.info/v2/price';
const BIDDING_ZONE = 'DE-LU';
const CACHE_DIR = __DIR__ . '/cache';
const CACHE_FILE = CACHE_DIR . '/strompreis.json';
const LOCK_FILE = CACHE_DIR . '/strompreis.lock';
const HTTP_TIMEOUT = 8;
const USER_AGENT = 'bt-elektrotech.de Strompreis-Widget (+https://bt-elektrotech.de/)';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

/** Wie lange ein Cache-Eintrag gültig ist (Sekunden). */
function cache_ttl(array $payload): int
{
    if (!empty($payload['has_tomorrow'])) {
        return 6 * 3600;            // Morgen ist schon da: bis Mitternacht ändert sich nichts
    }
    if ((int)date('G') >= 12) {
        return 10 * 60;             // Ab Mittag alle 10 Minuten nach den Preisen für morgen schauen
    }
    return 60 * 60;
}

function cache_read(): ?array
{
    if (!is_file(CACHE_FILE)) {
        return null;
    }
    $data = json_decode((string)file_get_contents(CACHE_FILE), true);
    return is_array($data) ? $data : null;
}

function cache_is_fresh(?array $payload): bool
{
    return $payload !== null
        && ($payload['date'] ?? '') === date('Y-m-d')
        && (time() - (int)($payload['fetched_ts'] ?? 0)) < cache_ttl($payload);
}

function cache_write(array $payload): void
{
    $tmp = CACHE_FILE . '.' . getmypid() . '.tmp';
    if (file_put_contents($tmp, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) !== false) {
        rename($tmp, CACHE_FILE);
    }
}

function http_get(string $url): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => HTTP_TIMEOUT,
            CURLOPT_USERAGENT => USER_AGENT,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($body !== false && $status === 200) ? (string)$body : null;
    }

    $context = stream_context_create(['http' => [
        'method' => 'GET',
        'timeout' => HTTP_TIMEOUT,
        'ignore_errors' => true,
        'header' => "Accept: application/json\r\nUser-Agent: " . USER_AGENT . "\r\n",
    ]]);
    $body = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    return ($body !== false && strpos($statusLine, ' 200') !== false) ? $body : null;
}

/**
 * Antwort der Energy-Charts-API in eine einfache Liste umwandeln.
 * Versteht das v2-Format und zur Sicherheit auch das alte v1-Format.
 */
function parse_prices(string $body): ?array
{
    $json = json_decode($body, true);
    if (!is_array($json)) {
        return null;
    }

    $slots = [];

    if (isset($json['data']) && is_array($json['data'])) {           // v2
        foreach ($json['data'] as $row) {
            $value = $row['values']['day_ahead_price'] ?? null;
            $ts = isset($row['timestamp']) ? strtotime((string)$row['timestamp']) : false;
            if ($ts !== false && is_numeric($value)) {
                $slots[] = ['t' => $ts, 'p' => round(((float)$value) / 10, 3)]; // EUR/MWh -> ct/kWh
            }
        }
        $license = (string)($json['license'] ?? '');
    } elseif (isset($json['unix_seconds'], $json['price'])) {         // v1
        foreach ($json['unix_seconds'] as $i => $ts) {
            $value = $json['price'][$i] ?? null;
            if (is_numeric($ts) && is_numeric($value)) {
                $slots[] = ['t' => (int)$ts, 'p' => round(((float)$value) / 10, 3)];
            }
        }
        $license = (string)($json['license_info'] ?? '');
    } else {
        return null;
    }

    if (!$slots) {
        return null;
    }
    usort($slots, static fn($a, $b) => $a['t'] <=> $b['t']);
    return ['slots' => $slots, 'license' => $license];
}

function fetch_upstream(): ?array
{
    $today = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));

    // Erst heute + morgen versuchen; klappt das nicht (morgen noch nicht veröffentlicht), nur heute.
    foreach ([[$today, $tomorrow], [$today, $today]] as [$start, $end]) {
        $url = SOURCE_URL . '?' . http_build_query(['bzn' => BIDDING_ZONE, 'start' => $start, 'end' => $end]);
        $body = http_get($url);
        if ($body === null) {
            continue;
        }
        $parsed = parse_prices($body);
        if ($parsed === null) {
            continue;
        }

        $hasTomorrow = false;
        foreach ($parsed['slots'] as $slot) {
            if (date('Y-m-d', $slot['t']) === $tomorrow) {
                $hasTomorrow = true;
                break;
            }
        }

        return [
            'ok' => true,
            'date' => $today,
            'fetched_ts' => time(),
            'fetched_at' => date(DATE_ATOM),
            'has_tomorrow' => $hasTomorrow,
            'bidding_zone' => BIDDING_ZONE,
            'unit' => 'ct/kWh',
            'source' => 'Energy-Charts / Fraunhofer ISE',
            'license' => $parsed['license'] !== '' ? $parsed['license'] : 'CC BY 4.0, Bundesnetzagentur | SMARD.de',
            'slots' => $parsed['slots'],
        ];
    }
    return null;
}

function respond(array $payload, bool $stale = false): void
{
    $payload['stale'] = $stale;
    unset($payload['fetched_ts']);
    header('Cache-Control: public, max-age=' . ($stale ? 60 : 300));
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ---------------------------------------------------------------------------

if (!is_dir(CACHE_DIR)) {
    @mkdir(CACHE_DIR, 0755, true);
}

$cached = cache_read();
if (cache_is_fresh($cached)) {
    respond($cached);
}

// Nur ein Aufruf gleichzeitig darf bei Energy-Charts nachfragen.
$lock = @fopen(LOCK_FILE, 'c');
if ($lock !== false) {
    flock($lock, LOCK_EX);
    $cached = cache_read();                 // evtl. hat ein anderer Aufruf schon aktualisiert
    if (cache_is_fresh($cached)) {
        flock($lock, LOCK_UN);
        respond($cached);
    }
}

$fresh = fetch_upstream();

if ($fresh !== null) {
    cache_write($fresh);
}
if ($lock !== false) {
    flock($lock, LOCK_UN);
    fclose($lock);
}

if ($fresh !== null) {
    respond($fresh);
}
if ($cached !== null) {
    // Quelle gerade nicht erreichbar: letzten bekannten Stand ausliefern
    respond($cached, true);
}

http_response_code(503);
header('Cache-Control: no-store');
echo json_encode(['ok' => false, 'error' => 'source_unavailable']);
