<?php
declare(strict_types=1);

const ROLES_EDIT = ['admin', 'editor'];
const MAX_FAILED_LOGINS = 10;     // ต่อชื่อผู้ใช้
const LOCKOUT_MINUTES = 15;

final class Auth
{
    private PDO $pdo;
    private array $config;

    public function __construct(PDO $pdo, array $config)
    {
        $this->pdo = $pdo;
        $this->config = $config;
    }

    public static function publicUser(array $u): array
    {
        return [
            'id' => (int) $u['id'],
            'username' => $u['username'],
            'display_name' => $u['display_name'] ?: $u['username'],
            'role' => $u['role'],
        ];
    }

    public function login(string $username, string $password): array
    {
        $username = trim($username);
        if ($username === '' || $password === '') {
            throw new HttpError(400, 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
        }
        $failed = (int) db_run($this->pdo,
            "SELECT COUNT(*) FROM login_attempts WHERE username = :u AND created_at > datetime('now','localtime', :w)",
            ['u' => $username, 'w' => '-' . LOCKOUT_MINUTES . ' minutes'])->fetchColumn();
        if ($failed >= MAX_FAILED_LOGINS) {
            throw new HttpError(429, 'เข้าสู่ระบบผิดหลายครั้งเกินไป กรุณารอ ' . LOCKOUT_MINUTES . ' นาที');
        }

        $user = db_run($this->pdo, 'SELECT * FROM users WHERE username = :u AND active = 1', ['u' => $username])->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            db_run($this->pdo, 'INSERT INTO login_attempts (username, ip) VALUES (:u, :ip)', ['u' => $username, 'ip' => client_ip()]);
            usleep(400000); // ชะลอการเดารหัสผ่าน
            throw new HttpError(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }

        db_run($this->pdo, 'DELETE FROM login_attempts WHERE username = :u', ['u' => $username]);
        db_run($this->pdo, "DELETE FROM sessions WHERE expires_at < datetime('now','localtime')");
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            db_run($this->pdo, 'UPDATE users SET password_hash = :h WHERE id = :id',
                ['h' => password_hash($password, PASSWORD_DEFAULT), 'id' => (int) $user['id']]);
        }

        $token = bin2hex(random_bytes(32));
        db_run($this->pdo, "INSERT INTO sessions (token_hash, user_id, expires_at)
            VALUES (:h, :uid, datetime('now','localtime', :ttl))", [
            'h' => hash('sha256', $token),
            'uid' => (int) $user['id'],
            'ttl' => '+' . (int) $this->config['session_hours'] . ' hours',
        ]);
        audit($this->pdo, (int) $user['id'], 'login');
        return ['token' => $token, 'user' => self::publicUser($user)];
    }

    public function current(): ?array
    {
        $token = bearer_token();
        if (!$token) {
            return null;
        }
        $user = db_run($this->pdo, "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = :h AND s.expires_at > datetime('now','localtime') AND u.active = 1",
            ['h' => hash('sha256', $token)])->fetch();
        return $user ?: null;
    }

    public function require(array $roles = ['admin', 'editor', 'viewer']): array
    {
        $user = $this->current();
        if (!$user) {
            throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
        }
        if (!in_array($user['role'], $roles, true)) {
            throw new HttpError(403, 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้');
        }
        return $user;
    }

    public function logout(): void
    {
        $token = bearer_token();
        if ($token) {
            db_run($this->pdo, 'DELETE FROM sessions WHERE token_hash = :h', ['h' => hash('sha256', $token)]);
        }
    }
}

function audit(PDO $pdo, ?int $userId, string $action, ?int $targetId = null, ?array $detail = null): void
{
    db_run($pdo, 'INSERT INTO audit_log (user_id, action, target_id, detail, ip) VALUES (:u, :a, :t, :d, :ip)', [
        'u' => $userId,
        'a' => $action,
        't' => $targetId,
        'd' => $detail ? json_encode($detail, JSON_UNESCAPED_UNICODE) : null,
        'ip' => client_ip(),
    ]);
}

// ผู้ใช้สิทธิ์ viewer เห็นเลขบัตรประชาชนแค่ 4 หลักท้าย
function mask_for_role(array $row, string $role): array
{
    if ($role === 'viewer' && !empty($row['national_id'])) {
        $row['national_id'] = str_repeat('x', 9) . substr($row['national_id'], -4);
    }
    return $row;
}
