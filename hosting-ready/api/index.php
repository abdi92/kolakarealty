<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");

require_once __DIR__ . '/lib/App.php';
$config = require __DIR__ . '/config.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode(['success' => true, 'data' => ['service' => 'KBR Office PHP API', 'status' => 'ok', 'timestamp' => gmdate('c')]]);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        throw new DomainException('Metode request tidak diizinkan.');
    }
    $request = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    $action = trim((string) ($request['action'] ?? ''));
    $token = trim((string) ($request['token'] ?? ''));
    $args = is_array($request['args'] ?? null) ? $request['args'] : [];
    $result = (new App($config))->route($action, $token, $args);
    echo json_encode(['success' => true, 'data' => $result], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $error) {
    http_response_code($error instanceof JsonException ? 400 : 200);
    echo json_encode(['success' => false, 'message' => $error->getMessage() ?: 'Terjadi kesalahan pada server.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
