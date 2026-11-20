<?php
declare(strict_types=1);

if (PHP_VERSION_ID < 80000) {
    http_response_code(500);
    exit('ต้องใช้ PHP 8.0 ขึ้นไป');
}

require __DIR__ . '/Http.php';
require __DIR__ . '/Db.php';
require __DIR__ . '/Students.php';
require __DIR__ . '/Auth.php';

function load_config(): array
{
    $root = dirname(__DIR__);
    $file = is_file($root . '/config.php') ? $root . '/config.php' : $root . '/config.example.php';
    $config = require $file;
    $config += [
        'db_path' => $root . '/data/students.db',
        'allowed_origins' => [],
        'session_hours' => 12,
    ];
    if (getenv('STUDENTS_DB_PATH')) {
        $config['db_path'] = getenv('STUDENTS_DB_PATH'); // ใช้ตอนทดสอบ
    }
    $config['schema_paths'] = [$root . '/schema.sql', $root . '/../server/db/schema.sql'];
    return $config;
}
