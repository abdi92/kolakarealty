<?php

final class BusinessRules
{
    public static function apply(string $entity, array $record, ?array $existing, array $allData): array
    {
        switch ($entity) {
            case 'pph':
                $base = self::nonNegative($record, 'nilaiTransaksi');
                $rate = self::percentage($record, 'tarifPph');
                $record['nilaiPph'] = (int) round($base * $rate / 100);
                break;
            case 'bphtb':
                $base = self::nonNegative($record, 'nilaiTransaksi');
                $threshold = self::nonNegative($record, 'npoptkp');
                $rate = self::percentage($record, 'tarifBphtb');
                $record['nilaiBphtb'] = (int) round(max(0, $base - $threshold) * $rate / 100);
                break;
            case 'budgetcontrol':
                $plan = self::nonNegative($record, 'rencanaBudget');
                $realized = self::nonNegative($record, 'realisasi');
                $record['sisaBudget'] = $plan - $realized;
                $record['prosSisaBudget'] = $plan > 0 ? (int) round(($plan - $realized) / $plan * 100) : 0;
                break;
            case 'komisi':
                $transaction = self::nonNegative($record, 'nilaiTransaksi');
                $rate = self::percentage($record, 'persenKomisi');
                $tax = self::nonNegative($record, 'potonganPajak');
                $commission = (int) round($transaction * $rate / 100);
                if ($tax > $commission) {
                    throw new DomainException('Potongan pajak tidak boleh melebihi nominal komisi.');
                }
                $record['nominalKomisi'] = $commission;
                $record['komisiDiterima'] = $commission - $tax;
                break;
            case 'pengajuankpr':
                $house = self::nonNegative($record, 'nilaiRumah');
                $downPayment = self::nonNegative($record, 'uangMuka');
                if ($downPayment > $house) {
                    throw new DomainException('Uang muka tidak boleh melebihi nilai rumah.');
                }
                $record['plafondKPR'] = $house - $downPayment;
                break;
            case 'spkborong':
                $contract = self::nonNegative($record, 'nilaiBorongan');
                $vatRate = self::percentageDefault($record, 'ppnPersen', 11);
                $record['ppnPersen'] = $vatRate;
                $record['ppnNilai'] = (int) round($contract * $vatRate / 100);
                $record['totalNilai'] = $contract + $record['ppnNilai'];
                break;
            case 'pricelist':
                $basePrice = self::nonNegative($record, 'hargaDasar');
                $increaseRate = self::percentageDefault($record, 'kenaikanPersen', 0);
                $discount = self::nonNegative($record, 'diskonMaksimal');
                $record['hargaJual'] = (int) round($basePrice * (100 + $increaseRate) / 100);
                if ($discount > $record['hargaJual']) {
                    throw new DomainException('Diskon maksimal tidak boleh melebihi harga jual.');
                }
                $record['hargaMinimal'] = $record['hargaJual'] - $discount;
                break;
            case 'targetmarketing':
                $targetValue = self::nonNegative($record, 'targetNilai');
                $realizedValue = self::nonNegative($record, 'realisasiNilai');
                $targetUnits = self::nonNegative($record, 'targetUnit');
                $realizedUnits = self::nonNegative($record, 'realisasiUnit');
                $target = $targetValue > 0 ? $targetValue : $targetUnits;
                $achievement = $targetValue > 0 ? $realizedValue : $realizedUnits;
                $record['pencapaianPersen'] = $target > 0 ? (int) round($achievement / $target * 100) : 0;
                $record['status'] = $record['pencapaianPersen'] > 100 ? 'Melebihi Target' : ($record['pencapaianPersen'] === 100 ? 'Tercapai' : 'Belum Tercapai');
                break;
            case 'piutang':
                $total = self::nonNegative($record, 'hargaTransaksi');
                $paid = self::nonNegative($record, 'totalDibayarSebelumnya') + self::nonNegative($record, 'dibayarBulanIni');
                if ($paid > $total) {
                    throw new DomainException('Total pembayaran tidak boleh melebihi harga transaksi.');
                }
                $record['totalDibayar'] = $paid;
                $record['sisaPiutang'] = $total - $paid;
                if ($record['sisaPiutang'] == 0 && self::key($record['status'] ?? '') !== 'batal') {
                    $record['status'] = 'Lunas';
                }
                break;
            case 'hutang':
                $total = self::nonNegative($record, 'nilaiKontrak');
                $paid = self::nonNegative($record, 'totalDibayarSebelumnya') + self::nonNegative($record, 'dibayarBulanIni');
                if ($paid > $total) {
                    throw new DomainException('Total pembayaran tidak boleh melebihi nilai kontrak.');
                }
                $record['totalDibayar'] = $paid;
                $record['sisaHutang'] = $total - $paid;
                if ($record['sisaHutang'] == 0 && self::key($record['status'] ?? '') !== 'batal') {
                    $record['status'] = 'Lunas';
                }
                break;
            case 'transaksi':
                self::transactionTransition($record, $existing);
                break;
            case 'approval':
                self::approvalSequence($record);
                break;
            case 'tagihan':
                self::nonNegative($record, 'jumlah');
                if (self::key($record['status'] ?? '') !== 'lunas') {
                    $record['status'] = !empty($record['jatuhTempo']) && (string) $record['jatuhTempo'] < date('Y-m-d') ? 'Terlambat' : 'Belum Lunas';
                }
                break;
            case 'kartupiutang':
                self::receivableCard($record, $allData);
                break;
            case 'kartubarangmasuk':
                self::inventoryCard($record, $allData);
                break;
            case 'barangkeluar':
                self::outgoingStock($record, $allData);
                break;
        }
        return $record;
    }

    public static function assertNoDoubleBooking(string $entity, array $record, array $allData): void
    {
        if (!in_array($entity, ['transaksi', 'booking'], true) || !in_array(self::key($record['status'] ?? ''), ['booking', 'ppjb', 'akad kredit', 'lunas'], true)) {
            return;
        }
        $project = self::key($record['proyek'] ?? '');
        $unit = self::key($record['nomorUnit'] ?? ($record['unit'] ?? ''));
        if ($project === '' || $unit === '') {
            return;
        }
        foreach (['transaksi', 'booking'] as $sourceEntity) {
            foreach ($allData[$sourceEntity] ?? [] as $other) {
                if (($other['id'] ?? '') === ($record['id'] ?? '') || !in_array(self::key($other['status'] ?? ''), ['booking', 'ppjb', 'akad kredit', 'lunas'], true)) {
                    continue;
                }
                if (self::key($other['proyek'] ?? '') === $project && self::key($other['nomorUnit'] ?? ($other['unit'] ?? '')) === $unit) {
                    throw new DomainException('Unit tersebut sudah memiliki transaksi aktif.');
                }
            }
        }
    }

    private static function transactionTransition(array $record, ?array $existing): void
    {
        $next = (string) ($record['status'] ?? 'Booking');
        if ($existing === null && $next !== 'Booking') {
            throw new DomainException('Transaksi baru harus dimulai dari status Booking.');
        }
        if ($existing === null) {
            return;
        }
        $current = (string) ($existing['status'] ?? 'Booking');
        $allowed = [
            'Booking' => ['Booking', 'PPJB', 'Batal'],
            'PPJB' => ['PPJB', 'Akad Kredit', 'Batal'],
            'Akad Kredit' => ['Akad Kredit', 'Lunas', 'Batal'],
            'Lunas' => ['Lunas'],
            'Batal' => ['Batal'],
        ];
        if (!in_array($next, $allowed[$current] ?? [$current], true)) {
            throw new DomainException("Perubahan status {$current} ke {$next} tidak diizinkan.");
        }
    }

    private static function approvalSequence(array &$record): void
    {
        $level1 = (string) ($record['level1Status'] ?? 'Menunggu');
        $level2 = (string) ($record['level2Status'] ?? 'Menunggu');
        if ($level2 !== 'Menunggu' && $level1 !== 'Disetujui') {
            throw new DomainException('Approval level 2 hanya dapat diproses setelah level 1 disetujui.');
        }
        $record['status'] = ($level1 === 'Ditolak' || $level2 === 'Ditolak') ? 'Ditolak' : (($level1 === 'Disetujui' && $level2 === 'Disetujui') ? 'Disetujui' : ($level1 === 'Disetujui' ? 'Disetujui Sebagian' : 'Menunggu'));
    }

    private static function receivableCard(array &$record, array $allData): void
    {
        $officialPrice = self::nonNegative($record, 'hargaResmi');
        $discount = self::nonNegative($record, 'diskon');
        if ($discount > $officialPrice) {
            throw new DomainException('Diskon tidak boleh melebihi harga resmi.');
        }
        $record['hargaSetelahDiskon'] = $officialPrice - $discount;
        $balance = $record['hargaSetelahDiskon'];
        foreach ($allData['kartupiutang'] ?? [] as $other) {
            if (($other['id'] ?? '') === ($record['id'] ?? '') || !self::sameReceivableScope($other, $record)) {
                continue;
            }
            if (!empty($record['tanggal']) && !empty($other['tanggal']) && (string) $other['tanggal'] > (string) $record['tanggal']) {
                continue;
            }
            $balance -= self::number($other, 'debet');
            $balance += self::number($other, 'kredit');
        }
        $balance -= self::nonNegative($record, 'debet');
        $balance += self::nonNegative($record, 'kredit');
        if ($balance < 0) {
            throw new DomainException('Pembayaran kartu piutang melebihi saldo unit.');
        }
        $record['saldo'] = $balance;
    }

    private static function inventoryCard(array &$record, array $allData): void
    {
        $incoming = self::nonNegative($record, 'jumlahMasuk');
        $outgoing = self::nonNegative($record, 'jumlahKeluar');
        $unitPrice = self::nonNegative($record, 'hargaSatuan');
        $record['totalNilai'] = (int) round(($incoming > 0 ? $incoming : $outgoing) * $unitPrice);
        $balance = $incoming - $outgoing;
        foreach ($allData['kartubarangmasuk'] ?? [] as $other) {
            if (($other['id'] ?? '') === ($record['id'] ?? '') || !self::sameStockScope($other, $record) || self::key($other['proyek'] ?? '') !== self::key($record['proyek'] ?? '')) {
                continue;
            }
            if (!empty($record['tanggal']) && !empty($other['tanggal']) && (string) $other['tanggal'] > (string) $record['tanggal']) {
                continue;
            }
            $balance += self::number($other, 'jumlahMasuk') - self::number($other, 'jumlahKeluar');
        }
        if ($balance < 0) {
            throw new DomainException('Saldo stok tidak boleh negatif.');
        }
        $record['saldoStok'] = $balance;
    }

    private static function outgoingStock(array &$record, array $allData): void
    {
        $quantity = self::nonNegative($record, 'jumlahKeluar');
        $unitPrice = self::nonNegative($record, 'hargaSatuan');
        $available = 0.0;
        foreach ($allData['kartubarangmasuk'] ?? [] as $other) {
            if (self::sameStockScope($other, $record)) {
                $available += self::number($other, 'jumlahMasuk') - self::number($other, 'jumlahKeluar');
            }
        }
        foreach ($allData['barangkeluar'] ?? [] as $other) {
            if (($other['id'] ?? '') !== ($record['id'] ?? '') && self::sameStockScope($other, $record) && self::key($other['status'] ?? '') !== 'batal') {
                $available -= self::number($other, 'jumlahKeluar');
            }
        }
        if (self::key($record['status'] ?? '') !== 'batal' && $quantity > $available) {
            throw new DomainException("Stok tidak cukup. Tersedia {$available}, diminta {$quantity}.");
        }
        $record['totalNilai'] = (int) round($quantity * $unitPrice);
        $record['sisaStok'] = self::key($record['status'] ?? '') === 'batal' ? $available : $available - $quantity;
    }

    private static function sameReceivableScope(array $left, array $right): bool
    {
        return self::key($left['namaPembeli'] ?? '') === self::key($right['namaPembeli'] ?? '')
            && self::key($left['blokUnit'] ?? '') === self::key($right['blokUnit'] ?? '')
            && self::key($left['proyek'] ?? '') === self::key($right['proyek'] ?? '');
    }

    private static function sameStockScope(array $left, array $right): bool
    {
        return self::key($left['namaBarang'] ?? '') === self::key($right['namaBarang'] ?? '')
            && self::key($left['gudang'] ?? '') === self::key($right['gudang'] ?? '');
    }

    private static function percentage(array $record, string $field): float
    {
        $value = self::number($record, $field);
        if ($value < 0 || $value > 100) {
            throw new DomainException("{$field} harus berada di antara 0 dan 100.");
        }
        return $value;
    }

    private static function percentageDefault(array $record, string $field, float $default): float
    {
        if (!isset($record[$field]) || trim((string) $record[$field]) === '') {
            $record[$field] = $default;
        }
        return self::percentage($record, $field);
    }

    private static function nonNegative(array $record, string $field): float
    {
        $value = self::number($record, $field);
        if ($value < 0) {
            throw new DomainException("{$field} tidak boleh negatif.");
        }
        return $value;
    }

    private static function number(array $record, string $field): float
    {
        $value = $record[$field] ?? 0;
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        $text = trim((string) $value);
        if ($text === '') {
            return 0.0;
        }
        $text = preg_replace('/[^0-9,.-]/', '', $text);
        if (strpos($text, ',') !== false) {
            $text = str_replace('.', '', $text);
            $text = str_replace(',', '.', $text);
        } elseif (substr_count($text, '.') > 1 || preg_match('/^-?\d{1,3}(\.\d{3})+$/', $text)) {
            $text = str_replace('.', '', $text);
        }
        if (!is_numeric($text)) {
            throw new DomainException("{$field} harus berupa angka yang valid.");
        }
        return (float) $text;
    }

    private static function key($value): string
    {
        return mb_strtolower(trim((string) $value), 'UTF-8');
    }
}
