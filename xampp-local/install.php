<?php

declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');
$config = require __DIR__ . '/api/config.php';
$database = $config['database'];

try {
    $serverDsn = "mysql:host={$database['host']};port={$database['port']};charset=utf8mb4";
    $db = new PDO($serverDsn, $database['user'], $database['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $schema = (string) file_get_contents(__DIR__ . '/database/schema.sql');
    foreach (array_filter(array_map('trim', preg_split('/;\s*(?:\r?\n|$)/', $schema))) as $statement) {
        $db->exec($statement);
    }
    $db->exec('USE `' . str_replace('`', '``', $database['name']) . '`');

    $users = [
        [
            'id' => 'superadmin', 'nama' => 'Super Admin', 'username' => 'superadmin', 'email' => '',
            'role' => 'Superadmin', 'status' => 'Aktif', 'passwordHash' => password_hash('Kolakarealty@2026', PASSWORD_DEFAULT),
        ],
        [
            'id' => 'admin-default', 'nama' => 'Admin Kolaka', 'username' => 'admkolaka', 'email' => '',
            'role' => 'Admin', 'status' => 'Aktif', 'passwordHash' => password_hash('Kolaka@2026', PASSWORD_DEFAULT),
        ],
    ];
    $insert = $db->prepare("INSERT INTO records (entity,record_id,value_json) VALUES ('pengguna',?,?) ON DUPLICATE KEY UPDATE record_id=record_id");
    foreach ($users as $user) {
        $insert->execute([$user['id'], json_encode($user, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    }

    foreach ([$config['storage_path'] . DIRECTORY_SEPARATOR . 'backups', $config['uploads_path']] as $directory) {
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) throw new RuntimeException("Gagal membuat {$directory}");
    }

    echo "Instalasi KBR Office berhasil.\nDatabase: {$database['name']}\nURL: http://localhost/kbr-office/\n";
} catch (Throwable $error) {
    http_response_code(500);
    echo "Instalasi gagal: {$error->getMessage()}\n";
    exit(1);
}
