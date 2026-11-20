<?php
declare(strict_types=1);

// สร้างหรือรีเซ็ตบัญชีผู้ใช้ (รันบน server ผ่าน command line เท่านั้น)
//   php bin/create-user.php <username> <admin|editor|viewer> ["ชื่อที่แสดง"]
// ถ้ามีชื่อผู้ใช้นี้แล้ว จะรีเซ็ตรหัสผ่าน/สิทธิ์และเปิดใช้งานบัญชี
// ระบบสุ่มรหัสผ่านให้และแสดงครั้งเดียว — หรือส่งรหัสเองทาง stdin ด้วย --password-stdin
//   php bin/create-user.php --deactivate <username>   ปิดบัญชี (และ logout ทุกเครื่อง)

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/src/bootstrap.php';

$args = array_values(array_filter(array_slice($argv, 1), fn ($a) => $a !== '--password-stdin'));
$fromStdin = in_array('--password-stdin', $argv, true);
$pdo = open_db(load_config());

if (($args[0] ?? '') === '--deactivate') {
    $username = $args[1] ?? '';
    $id = db_run($pdo, 'SELECT id FROM users WHERE username = :u', ['u' => $username])->fetchColumn();
    if (!$id) {
        fwrite(STDERR, "ไม่พบผู้ใช้ $username\n");
        exit(1);
    }
    db_run($pdo, 'UPDATE users SET active = 0 WHERE id = :id', ['id' => (int) $id]);
    db_run($pdo, 'DELETE FROM sessions WHERE user_id = :id', ['id' => (int) $id]);
    echo "ปิดบัญชี $username แล้ว\n";
    exit(0);
}

[$username, $role, $display] = $args + [null, null, null];
if (!$username || !in_array($role, ['admin', 'editor', 'viewer'], true)) {
    fwrite(STDERR, "วิธีใช้: php bin/create-user.php <username> <admin|editor|viewer> [\"ชื่อที่แสดง\"] [--password-stdin]\n");
    exit(1);
}

if ($fromStdin) {
    $password = rtrim((string) fgets(STDIN), "\r\n");
    if (strlen($password) < 10) {
        fwrite(STDERR, "รหัสผ่านต้องยาวอย่างน้อย 10 ตัวอักษร\n");
        exit(1);
    }
} else {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    $password = '';
    for ($i = 0; $i < 16; $i++) {
        $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$existing = db_run($pdo, 'SELECT id FROM users WHERE username = :u', ['u' => $username])->fetchColumn();
if ($existing) {
    db_run($pdo, 'UPDATE users SET password_hash = :h, role = :r, active = 1, display_name = COALESCE(:d, display_name) WHERE id = :id',
        ['h' => $hash, 'r' => $role, 'd' => $display, 'id' => (int) $existing]);
    db_run($pdo, 'DELETE FROM sessions WHERE user_id = :id', ['id' => (int) $existing]);
    echo "อัปเดตผู้ใช้ $username (สิทธิ์ $role) แล้ว\n";
} else {
    db_run($pdo, 'INSERT INTO users (username, password_hash, display_name, role) VALUES (:u, :h, :d, :r)',
        ['u' => $username, 'h' => $hash, 'd' => $display, 'r' => $role]);
    echo "สร้างผู้ใช้ $username (สิทธิ์ $role) แล้ว\n";
}
if (!$fromStdin) {
    echo "รหัสผ่าน (แสดงครั้งเดียว): $password\n";
}
