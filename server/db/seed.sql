-- ข้อมูลตัวอย่าง
INSERT OR IGNORE INTO faculties (id, name) VALUES
  (1, 'คณะวิทยาศาสตร์และเทคโนโลยี'),
  (2, 'คณะบริหารธุรกิจ'),
  (3, 'คณะครุศาสตร์'),
  (4, 'คณะมนุษยศาสตร์และสังคมศาสตร์');

INSERT OR IGNORE INTO majors (id, faculty_id, name) VALUES
  (1, 1, 'วิทยาการคอมพิวเตอร์'),
  (2, 1, 'เทคโนโลยีสารสนเทศ'),
  (3, 1, 'คณิตศาสตร์'),
  (4, 2, 'การบัญชี'),
  (5, 2, 'การตลาด'),
  (6, 3, 'การศึกษาปฐมวัย'),
  (7, 3, 'ภาษาอังกฤษ'),
  (8, 4, 'นิติศาสตร์'),
  (9, 4, 'รัฐประศาสนศาสตร์');

INSERT OR IGNORE INTO students
  (student_code, prefix, first_name, last_name, gender, birth_date, email, phone, major_id, year_level, gpa, status) VALUES
  ('6601001', 'นาย',    'สมชาย',    'ใจดี',     'M', '2005-03-14', 'somchai@example.com',     '0812345678', 1, 2, 3.25, 'studying'),
  ('6601002', 'นางสาว', 'สมหญิง',   'รักเรียน', 'F', '2005-07-02', 'somying@example.com',     '0898765432', 2, 2, 3.71, 'studying'),
  ('6502015', 'นาย',    'ธนากร',    'ศรีสุข',   'M', '2004-11-21', 'thanakorn@example.com',   '0861112222', 4, 3, 2.88, 'studying'),
  ('6403007', 'นางสาว', 'พิมพ์ชนก', 'วงศ์ไทย',  'F', '2003-01-09', 'pimchanok@example.com',   '0853334444', 6, 4, 3.45, 'on_leave'),
  ('6304022', 'นาย',    'วีรภัทร',  'ทองคำ',    'M', '2002-05-30', 'weerapat@example.com',    '0825556666', 8, 4, 3.02, 'graduated'),
  ('6701033', 'นางสาว', 'กมลชนก',   'แสงทอง',   'F', '2006-09-17', 'kamonchanok@example.com', '0847778888', 9, 1, NULL, 'studying');
