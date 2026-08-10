<?php

declare(strict_types=1);

session_start();
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

$root = __DIR__;
$lockFile = $root . '/storage/installed.lock';
$configFile = $root . '/api/config.local.php';
$errors = [];
$success = false;

function escapeHtml(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function requiredChecks(string $root): array
{
    return [
        'PHP 7.4 atau lebih baru' => version_compare(PHP_VERSION, '7.4.0', '>='),
        'Extension PDO MySQL' => extension_loaded('pdo_mysql'),
        'Extension JSON' => extension_loaded('json'),
        'Extension OpenSSL' => extension_loaded('openssl'),
        'Extension Fileinfo' => extension_loaded('fileinfo'),
        'Extension Mbstring' => extension_loaded('mbstring'),
        'Folder api dapat ditulis' => is_writable($root . '/api'),
        'Folder storage dapat ditulis' => is_writable($root . '/storage'),
        'Folder uploads dapat ditulis' => is_writable($root . '/uploads'),
    ];
}

function executeSchema(PDO $db, string $schemaFile): void
{
    $schema = (string) file_get_contents($schemaFile);
    $statements = array_filter(array_map('trim', preg_split('/;\s*(?:\r?\n|$)/', $schema)));
    foreach ($statements as $statement) {
        $db->exec($statement);
    }
}

if (is_file($lockFile)) {
    http_response_code(403);
    exit('<!doctype html><html lang="id"><meta charset="utf-8"><title>Sudah terpasang</title><body><h1>Aplikasi sudah terpasang</h1><p>Hapus <code>setup.php</code> dari hosting, lalu buka aplikasi.</p></body></html>');
}

if (empty($_SESSION['kbr_setup_token'])) {
    $_SESSION['kbr_setup_token'] = bin2hex(random_bytes(32));
}
$checks = requiredChecks($root);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['kbr_setup_token'], (string) ($_POST['csrf_token'] ?? ''))) {
        $errors[] = 'Sesi setup tidak valid. Muat ulang halaman dan coba lagi.';
    }
    foreach ($checks as $label => $passed) {
        if (!$passed) $errors[] = "Prasyarat belum terpenuhi: {$label}.";
    }

    $host = trim((string) ($_POST['db_host'] ?? 'localhost'));
    $port = trim((string) ($_POST['db_port'] ?? '3306'));
    $database = trim((string) ($_POST['db_name'] ?? ''));
    $dbUser = trim((string) ($_POST['db_user'] ?? ''));
    $dbPassword = (string) ($_POST['db_password'] ?? '');
    $superUsername = trim((string) ($_POST['super_username'] ?? 'Superadmin'));
    $superPassword = (string) ($_POST['super_password'] ?? '');
    $adminUsername = trim((string) ($_POST['admin_username'] ?? 'Admkolaka'));
    $adminPassword = (string) ($_POST['admin_password'] ?? '');

    if ($host === '' || $database === '' || $dbUser === '') $errors[] = 'Host, nama database, dan user database wajib diisi.';
    if (!ctype_digit($port) || (int) $port < 1 || (int) $port > 65535) $errors[] = 'Port database tidak valid.';
    if ($superUsername === '' || $adminUsername === '') $errors[] = 'Username awal wajib diisi.';
    if (mb_strtolower($superUsername, 'UTF-8') === mb_strtolower($adminUsername, 'UTF-8')) $errors[] = 'Username Superadmin dan Admin harus berbeda.';
    if (strlen($superPassword) < 10 || strlen($adminPassword) < 10) $errors[] = 'Password awal minimal 10 karakter.';

    if (!$errors) {
        try {
            $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
            $db = new PDO($dsn, $dbUser, $dbPassword, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            executeSchema($db, $root . '/database/schema.sql');

            $users = [
                ['id' => 'superadmin', 'nama' => 'Super Admin', 'username' => mb_strtolower($superUsername, 'UTF-8'), 'email' => '', 'role' => 'Superadmin', 'status' => 'Aktif', 'passwordHash' => password_hash($superPassword, PASSWORD_DEFAULT)],
                ['id' => 'admin-default', 'nama' => 'Admin Kolaka', 'username' => mb_strtolower($adminUsername, 'UTF-8'), 'email' => '', 'role' => 'Admin', 'status' => 'Aktif', 'passwordHash' => password_hash($adminPassword, PASSWORD_DEFAULT)],
            ];
            $insert = $db->prepare("INSERT INTO records (entity,record_id,value_json) VALUES ('pengguna',?,?) ON DUPLICATE KEY UPDATE record_id=record_id");
            foreach ($users as $user) {
                $insert->execute([$user['id'], json_encode($user, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
            }

            $config = [
                'database' => ['host' => $host, 'port' => $port, 'name' => $database, 'user' => $dbUser, 'password' => $dbPassword],
                'app_key' => bin2hex(random_bytes(32)),
            ];
            $configContent = "<?php\n// Dibuat otomatis oleh setup.php. Jangan publikasikan file ini.\nreturn " . var_export($config, true) . ";\n";
            $temporaryConfig = $configFile . '.tmp';
            if (file_put_contents($temporaryConfig, $configContent, LOCK_EX) === false || !rename($temporaryConfig, $configFile)) {
                throw new RuntimeException('Gagal menulis konfigurasi. Pastikan folder api dapat ditulis.');
            }
            @chmod($configFile, 0600);
            if (file_put_contents($lockFile, 'Installed at ' . gmdate('c') . PHP_EOL, LOCK_EX) === false) {
                @unlink($configFile);
                throw new RuntimeException('Gagal membuat installation lock.');
            }
            @chmod($lockFile, 0600);
            unset($_SESSION['kbr_setup_token']);
            $success = true;
        } catch (Throwable $error) {
            $errors[] = 'Instalasi gagal: ' . $error->getMessage();
        }
    }
}
?><!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Setup KBR Office</title>
  <style>
    :root { color-scheme: light; font-family: "Segoe UI", sans-serif; color: #14243a; background: #edf1f5; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px 16px; }
    main { width: min(860px, 100%); margin: auto; background: white; border: 1px solid #d9e0e8; border-radius: 8px; box-shadow: 0 16px 48px rgba(20,36,58,.12); overflow: hidden; }
    header { padding: 26px 30px; background: #0a1930; color: white; }
    header h1 { margin: 0 0 6px; font-size: 24px; }
    header p, section p { margin: 0; line-height: 1.55; }
    section { padding: 26px 30px; border-top: 1px solid #e4e9ef; }
    h2 { margin: 0 0 16px; font-size: 17px; }
    .checks { display: grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap: 8px; padding: 0; list-style: none; }
    .checks li { padding: 9px 11px; background: #f5f7fa; border-left: 3px solid #16804c; font-size: 13px; }
    .checks li.fail { border-color: #b83232; color: #8d2020; }
    .grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 15px; }
    label { display: grid; gap: 6px; font-size: 13px; font-weight: 650; }
    input { width: 100%; border: 1px solid #bdc8d5; border-radius: 5px; padding: 11px 12px; font: inherit; }
    input:focus { outline: 2px solid #2870b8; outline-offset: 1px; }
    .full { grid-column: 1 / -1; }
    .message { padding: 13px 15px; margin-bottom: 16px; border-radius: 5px; background: #fff1f0; color: #8d2020; }
    .success { padding: 24px; background: #e9f7ef; border-left: 4px solid #16804c; }
    button { border: 0; border-radius: 5px; padding: 12px 18px; background: #0f68a8; color: white; font: inherit; font-weight: 700; cursor: pointer; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    small { color: #5b6878; font-weight: 400; }
    @media (max-width: 640px) { body { padding: 0; } main { border: 0; border-radius: 0; } section, header { padding: 22px 18px; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body><main>
<header><h1>Setup KBR Office</h1><p>Hubungkan aplikasi ke database hosting dan buat akun awal.</p></header>
<?php if ($success): ?>
<section><div class="success"><h2>Instalasi berhasil</h2><p>Hapus file <strong>setup.php</strong> melalui File Manager, kemudian <a href="./">buka aplikasi</a> dan login menggunakan akun yang baru dibuat.</p></div></section>
<?php else: ?>
<section><h2>Pemeriksaan server</h2><ul class="checks"><?php foreach ($checks as $label => $passed): ?><li class="<?= $passed ? '' : 'fail' ?>"><?= $passed ? 'Lulus' : 'Gagal' ?>: <?= escapeHtml($label) ?></li><?php endforeach; ?></ul></section>
<section>
<?php if ($errors): ?><div class="message"><?php foreach ($errors as $error): ?><div><?= escapeHtml($error) ?></div><?php endforeach; ?></div><?php endif; ?>
<form method="post" autocomplete="off"><input type="hidden" name="csrf_token" value="<?= escapeHtml($_SESSION['kbr_setup_token']) ?>">
<h2>Database hosting</h2><div class="grid">
<label>Host database<input name="db_host" value="<?= escapeHtml((string) ($_POST['db_host'] ?? 'localhost')) ?>" required></label>
<label>Port<input name="db_port" inputmode="numeric" value="<?= escapeHtml((string) ($_POST['db_port'] ?? '3306')) ?>" required></label>
<label>Nama database <small>Termasuk prefix akun hosting</small><input name="db_name" value="<?= escapeHtml((string) ($_POST['db_name'] ?? '')) ?>" required></label>
<label>User database <small>Termasuk prefix akun hosting</small><input name="db_user" value="<?= escapeHtml((string) ($_POST['db_user'] ?? '')) ?>" required></label>
<label class="full">Password database<input type="password" name="db_password" required></label>
</div></section><section><h2>Akun awal aplikasi</h2><div class="grid">
<label>Username Superadmin<input name="super_username" value="<?= escapeHtml((string) ($_POST['super_username'] ?? 'Superadmin')) ?>" required></label>
<label>Password Superadmin <small>Minimal 10 karakter</small><input type="password" name="super_password" minlength="10" required></label>
<label>Username Admin<input name="admin_username" value="<?= escapeHtml((string) ($_POST['admin_username'] ?? 'Admkolaka')) ?>" required></label>
<label>Password Admin <small>Minimal 10 karakter</small><input type="password" name="admin_password" minlength="10" required></label>
<div class="full"><button type="submit" <?= in_array(false, $checks, true) ? 'disabled' : '' ?>>Pasang aplikasi</button></div>
</div></form></section>
<?php endif; ?>
</main></body></html>
