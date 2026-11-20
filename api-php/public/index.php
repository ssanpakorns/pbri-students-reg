<?php
declare(strict_types=1);

// จุดเข้าเดียวของ API — ทุก request ถูกส่งมาที่ไฟล์นี้ (ดู .htaccess)
require dirname(__DIR__) . '/src/bootstrap.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');

$config = load_config();
send_cors_headers($config['allowed_origins']);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    json_response(204);
    exit;
}

// path หลังโฟลเดอร์ที่วาง API เช่น /students-api/students/5 → /students/5
$path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
if ($base !== '' && strpos($path, $base) === 0) {
    $path = substr($path, strlen($base));
}
$path = '/' . trim(preg_replace('#^/index\.php#', '', $path), '/');

try {
    if ($method === 'GET' && $path === '/health') {
        json_response(200, ['ok' => true]);
        exit;
    }

    $pdo = open_db($config);
    $auth = new Auth($pdo, $config);
    $repo = new StudentRepo($pdo);
    $id = preg_match('#^/students/(\d+)$#', $path, $m) ? (int) $m[1] : null;

    switch (true) {
        case $method === 'POST' && $path === '/auth/login':
            $body = read_json_body();
            json_response(200, $auth->login((string) ($body['username'] ?? ''), (string) ($body['password'] ?? '')));
            break;

        case $method === 'GET' && $path === '/auth/me':
            json_response(200, Auth::publicUser($auth->require()));
            break;

        case $method === 'POST' && $path === '/auth/logout':
            $auth->logout();
            json_response(204);
            break;

        case $method === 'GET' && $path === '/options':
            $auth->require();
            json_response(200, $repo->options());
            break;

        case $method === 'GET' && $path === '/stats':
            $auth->require();
            json_response(200, $repo->stats());
            break;

        case $method === 'GET' && $path === '/students':
            $user = $auth->require();
            $result = $repo->list($_GET);
            $result['data'] = array_map(fn ($r) => mask_for_role($r, $user['role']), $result['data']);
            json_response(200, $result);
            break;

        case $method === 'GET' && $path === '/students/export':
            $user = $auth->require(ROLES_EDIT);
            $rows = $repo->exportRows($_GET);
            audit($pdo, (int) $user['id'], 'export', null, ['rows' => count($rows), 'filters' => array_filter($_GET)]);
            json_response(200, $rows);
            break;

        case $method === 'POST' && $path === '/students/import':
            $user = $auth->require(ROLES_EDIT);
            $result = $repo->importRows(read_json_body()['rows'] ?? null);
            audit($pdo, (int) $user['id'], 'import', null,
                ['inserted' => $result['inserted'], 'updated' => $result['updated'], 'failed' => count($result['failed'])]);
            json_response(200, $result);
            break;

        case $method === 'GET' && $id !== null:
            $user = $auth->require();
            json_response(200, mask_for_role($repo->get($id), $user['role']));
            break;

        case $method === 'POST' && $path === '/students':
            $user = $auth->require(ROLES_EDIT);
            $row = $repo->create(read_json_body());
            audit($pdo, (int) $user['id'], 'create', $row['id']);
            json_response(201, $row);
            break;

        case $method === 'PUT' && $id !== null:
            $user = $auth->require(ROLES_EDIT);
            $row = $repo->update($id, read_json_body());
            audit($pdo, (int) $user['id'], 'update', $id);
            json_response(200, $row);
            break;

        case $method === 'DELETE' && $id !== null:
            $user = $auth->require(ROLES_EDIT);
            $repo->remove($id);
            audit($pdo, (int) $user['id'], 'delete', $id);
            json_response(204);
            break;

        default:
            json_response(404, ['message' => 'ไม่พบเส้น API นี้']);
    }
} catch (HttpError $e) {
    json_response($e->status, ['message' => $e->getMessage(), 'errors' => $e->errors]);
} catch (Throwable $e) {
    error_log('[students-api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_response(500, ['message' => 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์']);
}
