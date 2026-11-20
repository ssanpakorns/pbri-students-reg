-- ฐานข้อมูลนักศึกษา (SQLite) — schema version 2
-- โครงสร้างอิงตามไฟล์ Excel ข้อมูลรายงานตัวนักศึกษาใหม่
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  student_code           TEXT UNIQUE,                     -- รหัสนักศึกษา (ยังไม่มีได้)
  application_no         TEXT NOT NULL UNIQUE,            -- เลขที่ใบสมัคร
  national_id            TEXT UNIQUE,                     -- เลขบัตรประชาชน 13 หลัก
  prefix                 TEXT NOT NULL,                   -- คำนำหน้า
  first_name             TEXT NOT NULL,                   -- ชื่อ
  last_name              TEXT NOT NULL,                   -- นามสกุล

  address                TEXT,                            -- ที่อยู่ (บ้านเลขที่ / หมู่)
  subdistrict            TEXT,                            -- ตำบล
  district               TEXT,                            -- อำเภอ
  province               TEXT,                            -- จังหวัด
  postal_code            TEXT,                            -- รหัสไปรษณีย์
  phone                  TEXT,                            -- เบอร์โทร

  faculty                TEXT,                            -- คณะ
  college                TEXT,                            -- วิทยาลัย
  project                TEXT,                            -- โครงการ
  curriculum             TEXT,                            -- หลักสูตร
  admission_round        TEXT,                            -- รอบ

  school_name            TEXT,                            -- ชื่อโรงเรียน
  school_province        TEXT,                            -- จังหวัดโรงเรียน
  health_center          TEXT,                            -- รพ.สต. (9 หมอ)
  health_center_province TEXT,                            -- จังหวัด รพ.สต. (9 หมอ)

  confirm_status         TEXT NOT NULL DEFAULT 'รอยืนยัน'  -- สถานะยืนยันสิทธิ์
                         CHECK (confirm_status IN ('ยืนยัน', 'รอยืนยัน', 'ไม่ยืนยัน')),
  status                 TEXT,                            -- สถานะ (เช่น สละสิทธิ์ / ลาออก)
  notified_date          TEXT,                            -- วันที่แจ้ง (YYYY-MM-DD)
  returned_date          TEXT,                            -- วันที่กลับมา (YYYY-MM-DD)
  note                   TEXT,                            -- หมายเหตุ
  details                TEXT,                            -- รายละเอียดเพิ่มเติม

  created_at             TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_students_name     ON students(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_students_college  ON students(college);
CREATE INDEX IF NOT EXISTS idx_students_round    ON students(admission_round);
CREATE INDEX IF NOT EXISTS idx_students_province ON students(province);
CREATE INDEX IF NOT EXISTS idx_students_confirm  ON students(confirm_status);

CREATE TRIGGER IF NOT EXISTS trg_students_updated
AFTER UPDATE ON students
FOR EACH ROW
BEGIN
  UPDATE students SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
END;
