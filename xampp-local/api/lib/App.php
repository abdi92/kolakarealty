<?php

require_once __DIR__ . '/BusinessRules.php';

final class App
{
    private PDO $db;
    private array $config;
    private const ENTITIES = [
        'proyek','clusterproyek','progressunit','updateharian','materialrequest','budgetkonstruksi','blokkavling','unit','pricelist',
        'sertifikat','perizinan','dokumenlegal','ppjb','sppt','sengketa','progressproyek','timelinerencana','berkaskpr','prosesbank',
        'appraisal','pencairankpr','akadajb','masterunit','baliknama','royaht','pajakpbb','generateSurat','generatesurat','pph','bphtb',
        'pembayaran','pembeli','penjual','prosesbanknotaris','transaksi','jualicicilan','pengajuankpr','kprsubsidi','kprkomersil',
        'kprsyariah','jadwalcicilan','masterpihak','unitpihak','tagihan','marketing','prospek','followup','targetmarketing','komisi',
        'booking','skemapembayaran','arsipdokumen','templatesurat','pettycash','bukubank','voucher','kartuanggaran','piutang','hutang','budgetcontrol',
        'kartupiutang','kartubarangmasuk','spkborong','kuitansi','approval','supplier','masterbarang','barangkeluar','stokgudang',
        'laporankeuangan','dashboardowner','laporan','pengguna'
    ];

    public function __construct(array $config)
    {
        $this->config = $config;
        $database = $config['database'];
        $dsn = "mysql:host={$database['host']};port={$database['port']};dbname={$database['name']};charset=utf8mb4";
        $this->db = new PDO($dsn, $database['user'], $database['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    public function route(string $action, string $token, array $args)
    {
        switch ($action) {
            case 'authenticateUser': return $this->authenticate((string) ($args[0] ?? ''), (string) ($args[1] ?? ''));
            case 'getSession': return $this->publicSession($this->requireSession($token, true));
            case 'logout': return $this->logout($token);
            case 'listAllData': return $this->listAllData($this->requireSession($token));
            case 'saveRecord': return $this->saveRecord($this->requireSession($token), (string) ($args[0] ?? ''), (array) ($args[1] ?? []));
            case 'deleteRecord': return $this->deleteRecord($this->requireSession($token), (string) ($args[0] ?? ''), (string) ($args[1] ?? ''));
            case 'uploadFile': return $this->uploadFile($this->requireSession($token), (string) ($args[0] ?? ''), (string) ($args[1] ?? ''), (string) ($args[2] ?? ''), (string) ($args[3] ?? ''));
            case 'deleteFile': return $this->deleteFile($this->requireSession($token), (string) ($args[0] ?? ''), (string) ($args[1] ?? ''));
            case 'backupData': return $this->backupData($this->requireSession($token));
            case 'listBackups': return $this->listBackups($this->requireSession($token));
            case 'restoreBackup': return $this->restoreBackup($this->requireSession($token), (string) ($args[0] ?? ''));
            case 'listAuditLog': return $this->listAuditLog($this->requireSession($token), (int) ($args[0] ?? 200));
            case 'changeOwnPassword': return $this->changeOwnPassword($this->requireSession($token), (string) ($args[0] ?? ''), (string) ($args[1] ?? ''));
            case 'resetUserPassword': return $this->resetUserPassword($this->requireSession($token), (string) ($args[0] ?? ''), (string) ($args[1] ?? ''));
            case 'searchAll': return $this->searchAll($this->requireSession($token), (string) ($args[0] ?? ''));
            case 'getFinanceSummary': return $this->financeSummary($this->requireSession($token), (array) ($args[0] ?? []));
            case 'runPaymentReminders': $this->assertWrite($this->requireSession($token), 'tagihan'); return ['sent' => 0, 'skipped' => true, 'message' => 'Pengingat email tidak dikirim dari instalasi lokal.'];
            default: throw new DomainException('Aksi API tidak dikenal atau tidak diizinkan.');
        }
    }

    private function authenticate(string $username, string $password): array
    {
        $username = mb_strtolower(trim($username), 'UTF-8');
        if ($username === '' || $password === '') {
            throw new DomainException($username === '' ? 'Username wajib diisi.' : 'Password wajib diisi.');
        }
        $this->assertLoginAllowed($username);
        $stmt = $this->db->prepare("SELECT value_json FROM records WHERE entity = 'pengguna'");
        $stmt->execute();
        $matched = null;
        foreach ($stmt as $row) {
            $user = json_decode($row['value_json'], true);
            if (is_array($user) && mb_strtolower(trim((string) ($user['username'] ?? '')), 'UTF-8') === $username && mb_strtolower((string) ($user['status'] ?? ''), 'UTF-8') === 'aktif') {
                $matched = $user;
                break;
            }
        }
        if (!$matched) {
            $this->recordLoginFailure($username);
            throw new DomainException('Username tidak terdaftar atau pengguna nonaktif.');
        }
        $hash = (string) ($matched['passwordHash'] ?? '');
        if (!password_verify($password, $hash)) {
            $this->recordLoginFailure($username);
            throw new DomainException('Password salah.');
        }
        $this->db->prepare('DELETE FROM login_attempts WHERE username = ?')->execute([$username]);
        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            $matched['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
            $this->writeRaw('pengguna', (string) $matched['id'], $matched);
        }
        $session = [
            'user' => [
                'id' => (string) $matched['id'],
                'nama' => (string) ($matched['nama'] ?? $matched['username']),
                'username' => (string) $matched['username'],
                'email' => mb_strtolower(trim((string) ($matched['email'] ?? '')), 'UTF-8'),
                'role' => $this->normalizeRole((string) ($matched['role'] ?? 'Manager')),
            ],
            'permissions' => $this->permissions((string) ($matched['role'] ?? 'Manager')),
            'bootstrapMode' => false,
            'issuedAt' => gmdate('c'),
        ];
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + (int) $this->config['session_ttl']);
        $this->db->prepare('INSERT INTO auth_sessions (token_hash, session_json, expires_at) VALUES (?, ?, ?)')->execute([hash('sha256', $token), $this->encode($session), $expires]);
        $this->audit($session, 'LOGIN', 'auth', (string) $matched['id'], ['username' => $matched['username']]);
        return ['token' => $token, 'session' => $this->publicSession($session)];
    }

    private function requireSession(string $token, bool $refresh = false): array
    {
        if (trim($token) === '') {
            throw new DomainException('Anda belum login.');
        }
        $stmt = $this->db->prepare('SELECT session_json FROM auth_sessions WHERE token_hash = ? AND expires_at > NOW()');
        $stmt->execute([hash('sha256', $token)]);
        $session = json_decode((string) $stmt->fetchColumn(), true);
        if (!is_array($session)) {
            throw new DomainException('Sesi login tidak valid atau sudah berakhir. Silakan login ulang.');
        }
        if ($refresh) {
            $expires = date('Y-m-d H:i:s', time() + (int) $this->config['session_ttl']);
            $this->db->prepare('UPDATE auth_sessions SET expires_at = ? WHERE token_hash = ?')->execute([$expires, hash('sha256', $token)]);
        }
        return $session;
    }

    private function logout(string $token): bool
    {
        if ($token !== '') {
            try { $this->audit($this->requireSession($token), 'LOGOUT', 'auth', '', []); } catch (Throwable $ignore) {}
            $this->db->prepare('DELETE FROM auth_sessions WHERE token_hash = ?')->execute([hash('sha256', $token)]);
        }
        return true;
    }

    private function publicSession(array $session): array
    {
        return ['user' => $session['user'], 'permissions' => $session['permissions'], 'bootstrapMode' => (bool) ($session['bootstrapMode'] ?? false)];
    }

    private function permissions(string $role): array
    {
        $role = $this->normalizeRole($role);
        $readable = self::ENTITIES;
        $writable = in_array($role, ['Superadmin', 'Admin'], true) ? self::ENTITIES : [];
        if ($role !== 'Superadmin') {
            $readable = array_values(array_diff($readable, ['pengguna']));
            $writable = array_values(array_diff($writable, ['pengguna']));
        }
        sort($readable);
        sort($writable);
        return ['role' => $role, 'readableEntities' => $readable, 'writableEntities' => $writable, 'canBackup' => $role === 'Superadmin', 'canManageUsers' => $role === 'Superadmin'];
    }

    private function normalizeRole(string $role): string
    {
        $value = mb_strtolower(trim($role), 'UTF-8');
        if (in_array($value, ['superadmin', 'super admin'], true)) return 'Superadmin';
        if ($value === 'admin') return 'Admin';
        if ($value === 'direktur') return 'Direktur';
        if (in_array($value, ['pengawas proyek', 'pengawasproyek'], true)) return 'Pengawas Proyek';
        return 'Manager';
    }

    private function assertRead(array $session, string $entity): void
    {
        if (!in_array($entity, $session['permissions']['readableEntities'] ?? [], true)) throw new DomainException('Akses ditolak untuk melihat data ini.');
    }

    private function assertWrite(array $session, string $entity): void
    {
        if (!in_array($entity, $session['permissions']['writableEntities'] ?? [], true)) throw new DomainException('Akses ditolak untuk menyimpan data ini.');
        if ($entity === 'pengguna' && empty($session['permissions']['canManageUsers'])) throw new DomainException('Hanya Superadmin yang boleh mengelola pengguna.');
    }

    private function listAllRaw(bool $lock = false): array
    {
        $sql = 'SELECT entity, value_json FROM records ORDER BY updated_at, record_id' . ($lock ? ' FOR UPDATE' : '');
        $result = [];
        foreach ($this->db->query($sql) as $row) {
            $record = json_decode($row['value_json'], true);
            if (is_array($record)) $result[$row['entity']][] = $record;
        }
        return $result;
    }

    private function listAllData(array $session): array
    {
        $result = [];
        foreach ($this->listAllRaw() as $entity => $rows) {
            if (in_array($entity, $session['permissions']['readableEntities'] ?? [], true)) {
                $result[$entity] = array_map(function ($record) use ($entity) { return $this->sanitize($entity, $record); }, $rows);
            }
        }
        return $result;
    }

    private function saveRecord(array $session, string $entity, array $record): array
    {
        $this->validateEntity($entity);
        $this->assertWrite($session, $entity);
        if (empty($record['id'])) throw new DomainException('record.id wajib diisi');
        $this->db->beginTransaction();
        try {
            $allData = $this->listAllRaw(true);
            $existing = null;
            foreach ($allData[$entity] ?? [] as $candidate) if (($candidate['id'] ?? '') === $record['id']) $existing = $candidate;
            if ($entity === 'pengguna') $record = $this->prepareUser($record, $existing, $allData['pengguna'] ?? []);
            $record = BusinessRules::apply($entity, $record, $existing, $allData);
            BusinessRules::assertNoDoubleBooking($entity, $record, $allData);
            $action = $existing ? 'UPDATE' : 'CREATE';
            $this->writeRaw($entity, (string) $record['id'], $record);
            $this->audit($session, $action, $entity, (string) $record['id'], $this->sanitize($entity, $record));
            $this->db->commit();
            return $this->sanitize($entity, $record);
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    private function deleteRecord(array $session, string $entity, string $id): bool
    {
        $this->validateEntity($entity); $this->assertWrite($session, $entity);
        if ($id === '') throw new DomainException('entity dan id wajib diisi');
        $this->db->beginTransaction();
        try {
            $this->db->prepare('DELETE FROM records WHERE entity = ? AND record_id = ?')->execute([$entity, $id]);
            $this->audit($session, 'DELETE', $entity, $id, []);
            $this->db->commit();
            return true;
        } catch (Throwable $error) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $error; }
    }

    private function prepareUser(array $record, ?array $existing, array $users): array
    {
        $record['username'] = mb_strtolower(trim((string) ($record['username'] ?? '')), 'UTF-8');
        $record['email'] = mb_strtolower(trim((string) ($record['email'] ?? '')), 'UTF-8');
        if ($record['username'] === '') throw new DomainException('Username pengguna wajib diisi.');
        foreach ($users as $user) {
            if (($user['id'] ?? '') === ($record['id'] ?? '')) continue;
            if (mb_strtolower((string) ($user['username'] ?? ''), 'UTF-8') === $record['username']) throw new DomainException('Username pengguna sudah dipakai oleh akun lain.');
            if ($record['email'] !== '' && mb_strtolower((string) ($user['email'] ?? ''), 'UTF-8') === $record['email']) throw new DomainException('Email pengguna sudah dipakai oleh akun lain.');
        }
        $password = (string) ($record['password'] ?? '');
        if ($password !== '' && strlen($password) < 8) throw new DomainException('Password minimal 8 karakter.');
        $record['passwordHash'] = $password !== '' ? password_hash($password, PASSWORD_DEFAULT) : (string) ($existing['passwordHash'] ?? ($record['passwordHash'] ?? ''));
        unset($record['password'], $record['pin'], $record['pinHash']);
        if ($record['passwordHash'] === '') throw new DomainException('Password login wajib diisi (minimal 8 karakter).');
        return $record;
    }

    private function changeOwnPassword(array $session, string $current, string $next): bool
    {
        if (strlen($next) < 8) throw new DomainException('Password baru minimal 8 karakter.');
        $user = $this->findRaw('pengguna', (string) $session['user']['id']);
        if (!$user || !password_verify($current, (string) ($user['passwordHash'] ?? ''))) throw new DomainException('Password lama salah.');
        $user['passwordHash'] = password_hash($next, PASSWORD_DEFAULT);
        $this->writeRaw('pengguna', (string) $user['id'], $user);
        $this->audit($session, 'CHANGE_PASSWORD_SELF', 'pengguna', (string) $user['id'], []);
        return true;
    }

    private function resetUserPassword(array $session, string $userId, string $next): bool
    {
        if (empty($session['permissions']['canManageUsers'])) throw new DomainException('Hanya Superadmin yang boleh mereset password pengguna.');
        if (strlen($next) < 8) throw new DomainException('Password baru minimal 8 karakter.');
        $user = $this->findRaw('pengguna', $userId);
        if (!$user) throw new DomainException('Pengguna tidak ditemukan.');
        $user['passwordHash'] = password_hash($next, PASSWORD_DEFAULT);
        $this->writeRaw('pengguna', $userId, $user);
        $this->audit($session, 'RESET_PASSWORD', 'pengguna', $userId, ['username' => $user['username'] ?? '']);
        return true;
    }

    private function uploadFile(array $session, string $entity, string $fileName, string $mimeType, string $base64): array
    {
        $this->validateEntity($entity); $this->assertWrite($session, $entity);
        $data = base64_decode($base64, true);
        if ($fileName === '' || $data === false) throw new DomainException('fileName dan base64Data wajib diisi');
        if (strlen($data) > $this->config['max_upload_bytes']) throw new DomainException('Ukuran file maksimal 8 MB.');
        $detectedMime = (new finfo(FILEINFO_MIME_TYPE))->buffer($data) ?: 'application/octet-stream';
        if ($entity === 'templatesurat') {
            if (strtolower(pathinfo($fileName, PATHINFO_EXTENSION)) !== 'docx') throw new DomainException('Template surat wajib berupa file DOCX.');
            if (!in_array($detectedMime, ['application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document'], true)) throw new DomainException('Isi file bukan paket DOCX yang valid.');
            $this->validateDocxPackage($data);
            $detectedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        $allowedMimes = ['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!in_array($detectedMime, $allowedMimes, true)) throw new DomainException('Tipe file tidak diizinkan. Gunakan PDF, JPG, PNG, WebP, DOC, DOCX, XLS, atau XLSX.');
        $id = bin2hex(random_bytes(16));
        $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($fileName));
        if (!is_dir($this->config['uploads_path'])) mkdir($this->config['uploads_path'], 0775, true);
        $stored = $id . '-' . $safeName;
        file_put_contents($this->config['uploads_path'] . DIRECTORY_SEPARATOR . $stored, $data, LOCK_EX);
        return ['id' => $stored, 'name' => $fileName, 'url' => $this->signedDownloadUrl('upload', $stored), 'mimeType' => $detectedMime, 'size' => strlen($data), 'uploadedAt' => gmdate('c')];
    }

    private function validateDocxPackage(string $data): void
    {
        if (!class_exists('ZipArchive')) throw new DomainException('Ekstensi PHP ZIP diperlukan untuk memvalidasi template DOCX.');
        $temporary = tempnam(sys_get_temp_dir(), 'kbr-docx-');
        if ($temporary === false || file_put_contents($temporary, $data, LOCK_EX) === false) throw new DomainException('Template DOCX tidak dapat divalidasi.');
        $zip = new ZipArchive();
        $opened = false;
        try {
            if ($zip->open($temporary, ZipArchive::RDONLY | ZipArchive::CHECKCONS) !== true) throw new DomainException('Paket DOCX rusak atau tidak konsisten.');
            $opened = true;
            foreach (['[Content_Types].xml','_rels/.rels','word/document.xml'] as $required) {
                if ($zip->locateName($required, ZipArchive::FL_NOCASE) === false) throw new DomainException('Struktur dokumen Word tidak lengkap.');
            }
            if ($zip->numFiles > 512) throw new DomainException('Template DOCX memiliki terlalu banyak komponen.');
            $totalSize = 0;
            for ($index = 0; $index < $zip->numFiles; $index++) {
                $entry = $zip->statIndex($index);
                if ($entry === false) throw new DomainException('Komponen DOCX tidak dapat dibaca.');
                $totalSize += (int) ($entry['size'] ?? 0);
                if ($totalSize > 32 * 1024 * 1024) throw new DomainException('Isi template DOCX terlalu besar setelah dekompresi.');
            }
        } finally {
            if ($opened) $zip->close();
            @unlink($temporary);
        }
    }

    private function deleteFile(array $session, string $entity, string $fileId): bool
    {
        $this->validateEntity($entity); $this->assertWrite($session, $entity);
        $path = $this->config['uploads_path'] . DIRECTORY_SEPARATOR . basename($fileId);
        if (is_file($path)) unlink($path);
        return true;
    }

    private function backupData(array $session): array
    {
        if (empty($session['permissions']['canBackup'])) throw new DomainException('Akses ditolak untuk membuat backup.');
        $directory = $this->config['storage_path'] . DIRECTORY_SEPARATOR . 'backups';
        if (!is_dir($directory)) mkdir($directory, 0775, true);
        $id = $this->uuid(); $name = 'backup-kbr-office-' . date('Ymd-His') . '.json'; $path = $directory . DIRECTORY_SEPARATOR . $name;
        file_put_contents($path, json_encode($this->listAllRaw(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        $this->db->prepare('INSERT INTO backups (id,file_name,file_path,file_size,created_by) VALUES (?,?,?,?,?)')->execute([$id, $name, $path, filesize($path), $session['user']['username']]);
        return ['id' => $id, 'name' => $name, 'url' => $this->signedDownloadUrl('backup', $id), 'size' => filesize($path), 'createdAt' => gmdate('c')];
    }

    private function listBackups(array $session): array
    {
        if (empty($session['permissions']['canBackup'])) throw new DomainException('Akses ditolak untuk melihat daftar backup.');
        return array_map(function ($row) { return ['id' => $row['id'], 'name' => $row['file_name'], 'url' => $this->signedDownloadUrl('backup', $row['id']), 'size' => (int) $row['file_size'], 'createdAt' => gmdate('c', strtotime($row['created_at']))]; }, $this->db->query('SELECT * FROM backups ORDER BY created_at DESC')->fetchAll());
    }

    private function restoreBackup(array $session, string $id): bool
    {
        if (empty($session['permissions']['canBackup'])) throw new DomainException('Akses ditolak untuk memulihkan backup.');
        $stmt = $this->db->prepare('SELECT file_path,file_name FROM backups WHERE id = ?'); $stmt->execute([$id]); $backup = $stmt->fetch();
        if (!$backup || !is_file($backup['file_path'])) throw new DomainException('File backup tidak ditemukan.');
        $data = json_decode((string) file_get_contents($backup['file_path']), true);
        if (!is_array($data)) throw new DomainException('Isi backup tidak valid.');
        $this->db->beginTransaction();
        try {
            $this->db->exec('DELETE FROM records');
            foreach ($data as $entity => $rows) foreach ((array) $rows as $record) if (!empty($record['id'])) $this->writeRaw($entity, (string) $record['id'], $record);
            $this->audit($session, 'RESTORE_BACKUP', 'system', $id, ['fileName' => $backup['file_name']]);
            $this->db->commit(); return true;
        } catch (Throwable $error) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $error; }
    }

    private function listAuditLog(array $session, int $limit): array
    {
        if (empty($session['permissions']['canManageUsers'])) throw new DomainException('Akses ditolak untuk melihat audit log.');
        $limit = max(1, min(1000, $limit ?: 200));
        $rows = $this->db->query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT {$limit}")->fetchAll();
        return array_map(function ($row) { return ['timestamp' => gmdate('c', strtotime($row['created_at'])), 'userId' => $row['user_id'], 'username' => $row['username'], 'role' => $row['role_name'], 'action' => $row['action_name'], 'entity' => $row['entity'], 'recordId' => $row['record_id'], 'details' => json_decode($row['details_json'], true) ?: []]; }, $rows);
    }

    private function searchAll(array $session, string $query): array
    {
        $query = mb_strtolower(trim($query), 'UTF-8'); if (mb_strlen($query, 'UTF-8') < 2) return [];
        $hits = [];
        foreach ($this->listAllData($session) as $entity => $rows) foreach ($rows as $record) {
            if (mb_strpos(mb_strtolower($this->encode($record), 'UTF-8'), $query) !== false) {
                $hits[] = ['entity' => $entity, 'id' => $record['id'] ?? '', 'label' => $this->pick($record, ['nomorSurat','nomorSertifikat','nomorIzin','nomorPPJB','judulDokumen','namaProyek','nomorUnit','namaPembeli','nama','periode'], (string) ($record['id'] ?? $entity)), 'subtitle' => implode(' · ', array_filter(array_map(function ($key) use ($record) { return (string) ($record[$key] ?? ''); }, ['proyek','unit','nomorUnit','bank','status','jenisSurat'])))];
                if (count($hits) >= 60) return $hits;
            }
        }
        return $hits;
    }

    private function financeSummary(array $session, array $options): array
    {
        $this->assertRead($session, 'laporankeuangan'); $data = $this->listAllRaw(); $from = $options['from'] ?? null; $to = $options['to'] ?? null;
        $inside = function ($date) use ($from, $to) { return (!$from || $date >= $from) && (!$to || $date <= $to); };
        $totalIn = 0.0; $totalOut = 0.0; $accounts = []; $categories = [];
        foreach ([['pettycash','namaKas','Petty Cash'],['bukubank','bank','Bank']] as $definition) foreach ($data[$definition[0]] ?? [] as $row) if ($inside($row['tanggal'] ?? '')) {
            $incoming = $this->num($row['kredit'] ?? 0); $outgoing = $this->num($row['debet'] ?? 0); $totalIn += $incoming; $totalOut += $outgoing; $account = (string) ($row[$definition[1]] ?? $definition[2]); $accounts[$account] = ($accounts[$account] ?? 0) + $incoming - $outgoing;
        }
        foreach ($data['kartuanggaran'] ?? [] as $row) if ($inside($row['tanggal'] ?? '') && ($value = $this->num($row['debet'] ?? 0)) > 0) { $category = (string) ($row['kelompokBiaya'] ?? 'Lainnya'); $categories[$category] = ($categories[$category] ?? 0) + $value; }
        $receivables = 0.0; foreach ($data['piutang'] ?? [] as $row) $receivables += max(0, isset($row['sisaPiutang']) && $row['sisaPiutang'] !== '' ? $this->num($row['sisaPiutang']) : $this->num($row['hargaTransaksi'] ?? 0) - $this->num($row['totalDibayar'] ?? 0));
        $debts = 0.0; foreach ($data['hutang'] ?? [] as $row) $debts += max(0, isset($row['sisaHutang']) && $row['sisaHutang'] !== '' ? $this->num($row['sisaHutang']) : $this->num($row['nilaiKontrak'] ?? 0) - $this->num($row['totalDibayar'] ?? 0));
        $budget = 0.0; $realized = 0.0; foreach ($data['budgetcontrol'] ?? [] as $row) { $budget += $this->num($row['rencanaBudget'] ?? 0); $realized += $this->num($row['realisasi'] ?? 0); }
        arsort($accounts); arsort($categories);
        return ['range' => ['from' => $from, 'to' => $to], 'totalMasuk' => $totalIn, 'totalKeluar' => $totalOut, 'netCashflow' => $totalIn - $totalOut, 'totalPiutangOpen' => $receivables, 'totalHutangOpen' => $debts, 'totalBudgetRencana' => $budget, 'totalBudgetRealisasi' => $realized, 'sisaBudget' => $budget - $realized, 'perAkun' => array_map(function ($name, $balance) { return ['akun' => $name, 'saldo' => $balance]; }, array_keys($accounts), array_values($accounts)), 'perKategoriKeluar' => array_map(function ($name, $value) { return ['kategori' => $name, 'jumlah' => $value]; }, array_keys($categories), array_values($categories))];
    }

    private function assertLoginAllowed(string $username): void
    {
        $stmt = $this->db->prepare('SELECT attempt_count,last_attempt_at FROM login_attempts WHERE username = ?'); $stmt->execute([$username]); $row = $stmt->fetch();
        if ($row && strtotime($row['last_attempt_at']) >= time() - 900 && (int) $row['attempt_count'] >= 5) throw new DomainException('Terlalu banyak percobaan login gagal. Coba lagi setelah beberapa menit.');
        if ($row && strtotime($row['last_attempt_at']) < time() - 900) $this->db->prepare('DELETE FROM login_attempts WHERE username = ?')->execute([$username]);
    }

    private function recordLoginFailure(string $username): void
    {
        $this->db->prepare('INSERT INTO login_attempts (username,attempt_count,first_attempt_at,last_attempt_at) VALUES (?,1,NOW(),NOW()) ON DUPLICATE KEY UPDATE attempt_count = attempt_count + 1,last_attempt_at = NOW()')->execute([$username]);
    }

    private function writeRaw(string $entity, string $id, array $record): void
    {
        $this->db->prepare('INSERT INTO records (entity,record_id,value_json) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json),updated_at=CURRENT_TIMESTAMP')->execute([$entity, $id, $this->encode($record)]);
    }

    private function findRaw(string $entity, string $id): ?array
    {
        $stmt = $this->db->prepare('SELECT value_json FROM records WHERE entity=? AND record_id=?'); $stmt->execute([$entity, $id]); $record = json_decode((string) $stmt->fetchColumn(), true); return is_array($record) ? $record : null;
    }

    private function sanitize(string $entity, array $record): array
    {
        if ($entity === 'pengguna') unset($record['password'], $record['passwordHash'], $record['pin'], $record['pinHash']);
        if (isset($record['lampiran']) && is_array($record['lampiran'])) {
            $record['lampiran'] = array_map(function ($file) {
                if (!is_array($file) || empty($file['id'])) return $file;
                $file['url'] = $this->signedDownloadUrl('upload', basename((string) $file['id']));
                return $file;
            }, $record['lampiran']);
        }
        return $record;
    }

    private function audit(array $session, string $action, string $entity, string $recordId, array $details): void
    {
        $user = $session['user'] ?? [];
        $this->db->prepare('INSERT INTO audit_logs (user_id,username,role_name,action_name,entity,record_id,details_json) VALUES (?,?,?,?,?,?,?)')->execute([(string) ($user['id'] ?? ''), (string) ($user['username'] ?? ''), (string) ($user['role'] ?? ''), $action, $entity, $recordId, $this->encode($details)]);
    }

    private function validateEntity(string $entity): void { if (!in_array($entity, self::ENTITIES, true)) throw new DomainException('Entity tidak dikenal atau tidak diizinkan.'); }
    private function signedDownloadUrl(string $type, string $id): string { $signature = hash_hmac('sha256', $type . '|' . $id, (string) $this->config['app_key']); return './api/download.php?type=' . rawurlencode($type) . '&id=' . rawurlencode($id) . '&sig=' . $signature; }
    private function encode($value): string { $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); if ($json === false) throw new RuntimeException('Data JSON tidak valid.'); return $json; }
    private function uuid(): string { $data = random_bytes(16); $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4)); }
    private function pick(array $record, array $keys, string $fallback): string { foreach ($keys as $key) if (!empty($record[$key])) return (string) $record[$key]; return $fallback; }
    private function num($value): float { if (is_numeric($value)) return (float) $value; $text = preg_replace('/[^0-9,.-]/', '', (string) $value); if (strpos($text, ',') !== false) $text = str_replace(',', '.', str_replace('.', '', $text)); elseif (preg_match('/^-?\d{1,3}(\.\d{3})+$/', $text)) $text = str_replace('.', '', $text); return is_numeric($text) ? (float) $text : 0.0; }
}
