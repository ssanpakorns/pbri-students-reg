<?php
declare(strict_types=1);

const SCHEMA_VERSION = 2;

function open_db(array $config): PDO
{
    $dir = dirname($config['db_path']);
    if (!is_dir($dir) && !mkdir($dir, 0750, true)) {
        throw new RuntimeException('สร้างโฟลเดอร์ฐานข้อมูลไม่ได้: ' . $dir);
    }
    $pdo = new PDO('sqlite:' . $config['db_path'], null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    $pdo->exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    migrate($pdo, $config);
    return $pdo;
}

function schema_sql(array $config): string
{
    foreach ($config['schema_paths'] as $path) {
        if (is_file($path)) {
            return (string) file_get_contents($path);
        }
    }
    throw new RuntimeException('ไม่พบไฟล์ schema.sql');
}

// โครงสร้างเดียวกับ shared/students.js → migrate() และเพิ่มตารางของระบบ login
function migrate(PDO $pdo, array $config): void
{
    $version = (int) $pdo->query('PRAGMA user_version')->fetchColumn();
    if ($version < SCHEMA_VERSION) {
        $old = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'students'")->fetchColumn();
        if ($old) {
            $backup = 'students_v' . max($version, 1) . '_backup';
            $pdo->exec("DROP TRIGGER IF EXISTS trg_students_updated;
                DROP INDEX IF EXISTS idx_students_name;
                DROP INDEX IF EXISTS idx_students_major;
                DROP INDEX IF EXISTS idx_students_status;
                DROP TABLE IF EXISTS {$backup};
                ALTER TABLE students RENAME TO {$backup};");
        }
        $pdo->exec(schema_sql($config));
        $pdo->exec('PRAGMA user_version = ' . SCHEMA_VERSION);
    } else {
        $pdo->exec(schema_sql($config));
    }
    $pdo->exec((string) file_get_contents(__DIR__ . '/../auth.sql'));
}

// bind ค่าพร้อมชนิดข้อมูล (LIMIT/OFFSET ต้องเป็น integer)
function db_run(PDO $pdo, string $sql, array $params = []): PDOStatement
{
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $type = PDO::PARAM_STR;
        if ($value === null) {
            $type = PDO::PARAM_NULL;
        } elseif (is_int($value)) {
            $type = PDO::PARAM_INT;
        }
        $stmt->bindValue(':' . $key, $value, $type);
    }
    $stmt->execute();
    return $stmt;
}
