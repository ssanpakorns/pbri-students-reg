<?php
declare(strict_types=1);

final class HttpError extends Exception
{
    public int $status;
    public ?array $errors;

    public function __construct(int $status, string $message, ?array $errors = null)
    {
        parent::__construct($message);
        $this->status = $status;
        $this->errors = $errors;
    }
}

function json_response(int $status, $data = null): void
{
    http_response_code($status);
    if ($status === 204) {
        return;
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new HttpError(400, 'รูปแบบข้อมูลไม่ถูกต้อง (ต้องเป็น JSON)');
    }
    return $data;
}

function send_cors_headers(array $allowedOrigins): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 600');
    }
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? (function_exists('getallheaders') ? (array_change_key_case(getallheaders())['authorization'] ?? '') : '');
    if (preg_match('/^Bearer\s+([A-Fa-f0-9]{64})$/', trim((string) $header), $m)) {
        return strtolower($m[1]);
    }
    return null;
}

function client_ip(): string
{
    // อยู่หลัง Cloudflare: ใช้ IP จริงของผู้ใช้จาก header ของ Cloudflare
    return $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
}
