<?php

$localConfig = __DIR__ . DIRECTORY_SEPARATOR . 'config.local.php';
if (!is_file($localConfig)) {
    throw new RuntimeException('Aplikasi belum dikonfigurasi. Jalankan setup.php terlebih dahulu.');
}

$config = require $localConfig;
if (!is_array($config) || empty($config['database']['name']) || empty($config['database']['user']) || empty($config['app_key'])) {
    throw new RuntimeException('Konfigurasi database tidak lengkap.');
}

$config['session_ttl'] = 8 * 60 * 60;
$config['max_upload_bytes'] = 8 * 1024 * 1024;
$config['storage_path'] = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage';
$config['uploads_path'] = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads';

return $config;
