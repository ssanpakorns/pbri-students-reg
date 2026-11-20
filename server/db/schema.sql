-- ฐานข้อมูลนักศึกษา (SQLite)
PRAGMA foreign_keys = ON;

-- คณะ
CREATE TABLE IF NOT EXISTS faculties (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE
);

-- สาขาวิชา
CREATE TABLE IF NOT EXISTS majors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id  INTEGER NOT NULL REFERENCES faculties(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  UNIQUE (faculty_id, name)
);

-- นักศึกษา
CREATE TABLE IF NOT EXISTS students (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  student_code TEXT NOT NULL UNIQUE,                 -- รหัสนักศึกษา
  prefix       TEXT NOT NULL CHECK (prefix IN ('นาย','นางสาว','นาง')),
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  gender       TEXT CHECK (gender IN ('M','F','O')),
  birth_date   TEXT,                                 -- YYYY-MM-DD
  email        TEXT UNIQUE,
  phone        TEXT,
  address      TEXT,
  major_id     INTEGER REFERENCES majors(id) ON DELETE SET NULL,
  year_level   INTEGER NOT NULL DEFAULT 1 CHECK (year_level BETWEEN 1 AND 8),
  gpa          REAL CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 4)),
  status       TEXT NOT NULL DEFAULT 'studying'
               CHECK (status IN ('studying','on_leave','graduated','withdrawn')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_students_name   ON students(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_students_major  ON students(major_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

CREATE TRIGGER IF NOT EXISTS trg_students_updated
AFTER UPDATE ON students
FOR EACH ROW
BEGIN
  UPDATE students SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
END;
