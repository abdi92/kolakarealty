<?php

declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

try {
    $config = require __DIR__ . '/config.php';
    $type = (string) ($_GET['type'] ?? '');
    $id = basename((string) ($_GET['id'] ?? ''));
    $signature = (string) ($_GET['sig'] ?? '');
    if (!in_array($type, ['upload', 'backup'], true) || $id === '') {
        throw new DomainException('Tautan unduhan tidak valid.');
    }
    $expected = hash_hmac('sha256', $type . '|' . $id, (string) $config['app_key']);
    if (!hash_equals($expected, $signature)) throw new DomainException('Tanda tangan unduhan tidak valid.');

    if ($type === 'upload') {
        $path = $config['uploads_path'] . DIRECTORY_SEPARATOR . $id;
        $displayName = preg_replace('/^[a-f0-9]{32}-/', '', $id);
    } else {
        $database = $config['database'];
        $dsn = "mysql:host={$database['host']};port={$database['port']};dbname={$database['name']};charset=utf8mb4";
        $db = new PDO($dsn, $database['user'], $database['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
        $stmt = $db->prepare('SELECT file_name,file_path FROM backups WHERE id = ?');
        $stmt->execute([$id]);
        $backup = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$backup) throw new DomainException('Backup tidak ditemukan.');
        $path = (string) $backup['file_path'];
        $displayName = (string) $backup['file_name'];
    }

    if (!is_file($path) || !is_readable($path)) throw new DomainException('File tidak ditemukan.');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path) ?: 'application/octet-stream';
    $safeName = str_replace(['"', "\r", "\n"], '', basename($displayName));
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: attachment; filename="' . $safeName . '"');
    header('Cache-Control: private, no-store, max-age=0');
    readfile($path);
} catch (Throwable $error) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo $error->getMessage() ?: 'Unduhan ditolak.';
}
