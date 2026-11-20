<?php
declare(strict_types=1);

// พอร์ตจาก shared/students.js — ถ้าแก้กฎตรงนี้ ต้องแก้ที่นั่นด้วย (npm run test:api ตรวจให้ว่าตรงกัน)

const CONFIRM_STATUSES = ['ยืนยัน', 'รอยืนยัน', 'ไม่ยืนยัน'];
const FIELDS = [
    'student_code', 'application_no', 'national_id', 'prefix', 'first_name', 'last_name',
    'address', 'subdistrict', 'district', 'province', 'postal_code', 'phone',
    'faculty', 'college', 'project', 'curriculum', 'admission_round',
    'school_name', 'school_province', 'health_center', 'health_center_province',
    'confirm_status', 'status', 'notified_date', 'returned_date', 'note', 'details',
];
const DATE_FIELDS = ['notified_date', 'returned_date'];
const OPTION_FIELDS = ['faculty', 'college', 'project', 'curriculum', 'admission_round', 'province', 'status'];
const PREFIX_STRIP = [
    'subdistrict' => '/^(ตำบล|ต\.)\s*/u',
    'district' => '/^(อำเภอ|อ\.)\s*/u',
    'province' => '/^(จังหวัด|จ\.)\s*/u',
    'school_province' => '/^(จังหวัด|จ\.)\s*/u',
    'health_center_province' => '/^(จังหวัด|จ\.)\s*/u',
];

function to_iso_date($v): ?string
{
    if ($v === null) {
        return null;
    }
    $s = trim((string) $v);
    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})/', $s, $m)) {
        [, $y, $mo, $d] = $m;
    } elseif (preg_match('/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/', $s, $m)) {
        [, $d, $mo, $y] = $m;
    } else {
        return $s;
    }
    $y = (int) $y;
    if ($y > 2400) {
        $y -= 543; // พ.ศ. → ค.ศ.
    }
    if (!checkdate((int) $mo, (int) $d, $y)) {
        return $s;
    }
    return sprintf('%04d-%02d-%02d', $y, (int) $mo, (int) $d);
}

function clean_student(array $body): array
{
    $out = [];
    foreach (FIELDS as $k) {
        $v = $body[$k] ?? null;
        if (is_int($v) || is_float($v)) {
            $v = is_float($v) && floor($v) === $v ? sprintf('%.0f', $v) : (string) $v;
        }
        if (is_string($v)) {
            $v = trim((string) preg_replace('/\s+/u', ' ', $v));
        } elseif ($v !== null) {
            $v = null; // ไม่รับ array/boolean
        }
        if ($v === '' || $v === '-') {
            $v = null;
        }
        if ($v !== null && isset(PREFIX_STRIP[$k])) {
            $v = (string) preg_replace(PREFIX_STRIP[$k], '', $v);
            if ($v === '') {
                $v = null;
            }
        }
        $out[$k] = $v;
    }
    if ($out['national_id'] !== null) {
        $out['national_id'] = preg_replace('/\D/', '', $out['national_id']);
    }
    if ($out['phone'] !== null) {
        $out['phone'] = preg_replace('/\D/', '', $out['phone']);
        if (strlen($out['phone']) === 9 && $out['phone'][0] !== '0') {
            $out['phone'] = '0' . $out['phone']; // Excel ตัดเลข 0 หน้า
        }
    }
    if ($out['postal_code'] !== null) {
        $out['postal_code'] = preg_replace('/\D/', '', $out['postal_code']);
    }
    foreach (DATE_FIELDS as $k) {
        $out[$k] = to_iso_date($out[$k]);
    }
    if ($out['confirm_status'] !== null && strncmp($out['confirm_status'], 'ยืนยัน', strlen('ยืนยัน')) === 0) {
        $out['confirm_status'] = 'ยืนยัน';
    }
    $out['confirm_status'] = $out['confirm_status'] ?? 'รอยืนยัน';
    return $out;
}

function is_valid_national_id(string $id): bool
{
    if (!preg_match('/^\d{13}$/', $id)) {
        return false;
    }
    $sum = 0;
    for ($i = 0; $i < 12; $i++) {
        $sum += (int) $id[$i] * (13 - $i);
    }
    return (11 - ($sum % 11)) % 10 === (int) $id[12];
}

function validate_student(array $s): array
{
    $e = [];
    if (!$s['application_no']) {
        $e['application_no'] = 'กรุณากรอกเลขที่ใบสมัคร';
    } elseif (!preg_match('/^[0-9A-Za-z-]{1,20}$/', $s['application_no'])) {
        $e['application_no'] = 'เลขที่ใบสมัครไม่ถูกต้อง';
    }
    if ($s['student_code'] && !preg_match('/^[0-9A-Za-z-]{1,20}$/', $s['student_code'])) {
        $e['student_code'] = 'รหัสนักศึกษาไม่ถูกต้อง';
    }
    if ($s['national_id'] && !is_valid_national_id($s['national_id'])) {
        $e['national_id'] = 'เลขบัตรประชาชนไม่ถูกต้อง (13 หลัก)';
    }
    if (!$s['prefix']) {
        $e['prefix'] = 'กรุณาระบุคำนำหน้า';
    }
    if (!$s['first_name']) {
        $e['first_name'] = 'กรุณากรอกชื่อ';
    }
    if (!$s['last_name']) {
        $e['last_name'] = 'กรุณากรอกนามสกุล';
    }
    if ($s['phone'] && !preg_match('/^0\d{8,9}$/', $s['phone'])) {
        $e['phone'] = 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก';
    }
    if ($s['postal_code'] && !preg_match('/^\d{5}$/', $s['postal_code'])) {
        $e['postal_code'] = 'รหัสไปรษณีย์ต้องมี 5 หลัก';
    }
    if (!in_array($s['confirm_status'], CONFIRM_STATUSES, true)) {
        $e['confirm_status'] = 'สถานะยืนยันสิทธิ์ไม่ถูกต้อง';
    }
    foreach (DATE_FIELDS as $k) {
        if ($s[$k] && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $s[$k])) {
            $e[$k] = 'รูปแบบวันที่ไม่ถูกต้อง';
        }
    }
    if ($s['notified_date'] && $s['returned_date'] && $s['returned_date'] < $s['notified_date']) {
        $e['returned_date'] = 'วันที่กลับมาต้องไม่ก่อนวันที่แจ้ง';
    }
    return $e;
}

function translate_db_error(PDOException $err): ?HttpError
{
    $msg = $err->getMessage();
    if (strpos($msg, 'UNIQUE') !== false) {
        foreach ([
            'application_no' => 'เลขที่ใบสมัครนี้มีอยู่แล้ว',
            'national_id' => 'เลขบัตรประชาชนนี้มีอยู่แล้ว',
            'student_code' => 'รหัสนักศึกษานี้มีอยู่แล้ว',
        ] as $field => $text) {
            if (strpos($msg, $field) !== false) {
                return new HttpError(409, 'ข้อมูลซ้ำ', [$field => $text]);
            }
        }
    }
    return null;
}

final class StudentRepo
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    private static function insertSql(): string
    {
        return 'INSERT INTO students (' . implode(', ', FIELDS) . ') VALUES (:' . implode(', :', FIELDS) . ')';
    }

    private static function updateSql(): string
    {
        return 'UPDATE students SET ' . implode(', ', array_map(fn ($f) => "$f = :$f", FIELDS)) . ' WHERE id = :id';
    }

    private static function checked(array $body): array
    {
        $s = clean_student($body);
        $errors = validate_student($s);
        if ($errors) {
            throw new HttpError(400, 'ข้อมูลไม่ถูกต้อง', $errors);
        }
        return $s;
    }

    private static function buildWhere(array $f): array
    {
        $where = [];
        $params = [];
        $q = trim((string) ($f['q'] ?? ''));
        if ($q !== '') {
            $where[] = "(first_name LIKE :q OR last_name LIKE :q OR (first_name || ' ' || last_name) LIKE :q
                OR application_no LIKE :q OR student_code LIKE :q OR national_id LIKE :q
                OR phone LIKE :q OR school_name LIKE :q)";
            $params['q'] = "%$q%";
        }
        foreach (['confirm_status', 'college', 'admission_round', 'province'] as $k) {
            $v = (string) ($f[$k] ?? '');
            if ($v !== '') {
                $where[] = "$k = :$k";
                $params[$k] = $v;
            }
        }
        $status = (string) ($f['status'] ?? '');
        if ($status === '__none') {
            $where[] = 'status IS NULL';
        } elseif ($status !== '') {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
        return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $params];
    }

    private const ORDER = 'ORDER BY first_name COLLATE NOCASE, last_name, id';

    private static function row(?array $r): ?array
    {
        if ($r) {
            $r['id'] = (int) $r['id'];
        }
        return $r ?: null;
    }

    public function getById(int $id): ?array
    {
        return self::row(db_run($this->pdo, 'SELECT * FROM students WHERE id = :id', ['id' => $id])->fetch() ?: null);
    }

    public function options(): array
    {
        $out = [];
        foreach (OPTION_FIELDS as $f) {
            $out[$f] = db_run($this->pdo, "SELECT DISTINCT $f AS v FROM students WHERE $f IS NOT NULL ORDER BY $f")
                ->fetchAll(PDO::FETCH_COLUMN);
        }
        return $out;
    }

    public function stats(): array
    {
        $r = db_run($this->pdo, "SELECT COUNT(*) AS total,
            SUM(confirm_status = 'ยืนยัน') AS confirmed,
            SUM(confirm_status = 'รอยืนยัน') AS pending,
            SUM(confirm_status = 'ไม่ยืนยัน') AS declined,
            SUM(status IS NOT NULL) AS with_status,
            COUNT(DISTINCT province) AS provinces
            FROM students")->fetch();
        return array_map(fn ($v) => (int) ($v ?? 0), $r);
    }

    public function list(array $query): array
    {
        [$where, $params] = self::buildWhere($query);
        $size = min(max((int) ($query['pageSize'] ?? 10) ?: 10, 1), 100);
        $page = max((int) ($query['page'] ?? 1), 1);
        $total = (int) db_run($this->pdo, "SELECT COUNT(*) FROM students $where", $params)->fetchColumn();
        $rows = db_run($this->pdo, "SELECT * FROM students $where " . self::ORDER . ' LIMIT :limit OFFSET :offset',
            $params + ['limit' => $size, 'offset' => ($page - 1) * $size])->fetchAll();
        return ['data' => array_map([self::class, 'row'], $rows), 'total' => $total, 'page' => $page, 'pageSize' => $size];
    }

    public function exportRows(array $query): array
    {
        [$where, $params] = self::buildWhere($query);
        return array_map([self::class, 'row'], db_run($this->pdo, "SELECT * FROM students $where " . self::ORDER, $params)->fetchAll());
    }

    public function get(int $id): array
    {
        $row = $this->getById($id);
        if (!$row) {
            throw new HttpError(404, 'ไม่พบข้อมูลนักศึกษา');
        }
        return $row;
    }

    public function create(array $body): array
    {
        $s = self::checked($body);
        try {
            db_run($this->pdo, self::insertSql(), $s);
        } catch (PDOException $e) {
            throw translate_db_error($e) ?? $e;
        }
        return $this->getById((int) $this->pdo->lastInsertId());
    }

    public function update(int $id, array $body): array
    {
        $s = self::checked($body);
        try {
            $n = db_run($this->pdo, self::updateSql(), $s + ['id' => $id])->rowCount();
        } catch (PDOException $e) {
            throw translate_db_error($e) ?? $e;
        }
        if (!$n) {
            throw new HttpError(404, 'ไม่พบข้อมูลนักศึกษา');
        }
        return $this->getById($id);
    }

    public function remove(int $id): void
    {
        if (!db_run($this->pdo, 'DELETE FROM students WHERE id = :id', ['id' => $id])->rowCount()) {
            throw new HttpError(404, 'ไม่พบข้อมูลนักศึกษา');
        }
    }

    // มีเลขที่ใบสมัครอยู่แล้ว → แก้ไขเฉพาะคอลัมน์ที่มีในไฟล์ (คอลัมน์อื่นคงค่าเดิม),
    // ไม่มี → เพิ่มใหม่; แถวที่ผิดจะถูกข้ามและรายงานกลับ
    public function importRows($rows): array
    {
        if (!is_array($rows) || count($rows) === 0) {
            throw new HttpError(400, 'ไม่พบข้อมูลที่จะนำเข้า');
        }
        if (count($rows) > 5000) {
            throw new HttpError(400, 'นำเข้าได้ครั้งละไม่เกิน 5,000 แถว');
        }
        $result = ['inserted' => 0, 'updated' => 0, 'failed' => []];
        $this->pdo->beginTransaction();
        try {
            foreach ($rows as $item) {
                $rowNumber = (int) ($item['rowNumber'] ?? 0);
                $data = is_array($item['data'] ?? null) ? $item['data'] : [];
                $appNo = clean_student($data)['application_no'];
                $existing = $appNo
                    ? db_run($this->pdo, 'SELECT * FROM students WHERE application_no = :a', ['a' => $appNo])->fetch()
                    : false;
                $s = clean_student($existing ? array_merge($existing, $data) : $data);
                $errors = validate_student($s);
                if ($errors) {
                    $result['failed'][] = ['rowNumber' => $rowNumber, 'errors' => $errors];
                    continue;
                }
                try {
                    if ($existing) {
                        db_run($this->pdo, self::updateSql(), $s + ['id' => (int) $existing['id']]);
                        $result['updated']++;
                    } else {
                        db_run($this->pdo, self::insertSql(), $s);
                        $result['inserted']++;
                    }
                } catch (PDOException $e) {
                    $http = translate_db_error($e);
                    if (!$http) {
                        throw $e;
                    }
                    $result['failed'][] = ['rowNumber' => $rowNumber, 'errors' => $http->errors];
                }
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
        return $result;
    }
}
