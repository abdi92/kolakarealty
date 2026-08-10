<?php
$config = [
    'database' => [
        'host' => getenv('KBR_DB_HOST') ?: '127.0.0.1',
        'port' => getenv('KBR_DB_PORT') ?: '3306',
        'name' => getenv('KBR_DB_NAME') ?: 'kbr_office',
        'user' => getenv('KBR_DB_USER') ?: 'root',
        'password' => getenv('KBR_DB_PASSWORD') !== false ? getenv('KBR_DB_PASSWORD') : '',
    ],
    'session_ttl' => 8 * 60 * 60,
    'max_upload_bytes' => 8 * 1024 * 1024,
    'storage_path' => dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage',
    'uploads_path' => dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads',
];

$environmentKey = getenv('KBR_APP_KEY');
if ($environmentKey !== false && trim($environmentKey) !== '') {
    $config['app_key'] = trim($environmentKey);
} else {
    $secretFile = $config['storage_path'] . DIRECTORY_SEPARATOR . '.app-key';
    if (!is_dir($config['storage_path']) && !mkdir($config['storage_path'], 0775, true) && !is_dir($config['storage_path'])) {
        throw new RuntimeException('Folder storage tidak dapat dibuat untuk menyimpan kunci aplikasi.');
    }
    if (!is_file($secretFile)) {
        $generatedKey = bin2hex(random_bytes(32));
        if (file_put_contents($secretFile, $generatedKey, LOCK_EX) === false) {
            throw new RuntimeException('Kunci aplikasi tidak dapat disimpan.');
        }
    }
    $config['app_key'] = trim((string) file_get_contents($secretFile));
    if (strlen($config['app_key']) < 64) throw new RuntimeException('Kunci aplikasi lokal tidak valid.');
}

return $config;
