import express from 'express';
import cors from 'cors';
import { db, initSchema } from './db.js';

initSchema();

const app = express();
app.use(cors());
app.use(express.json());

const STATUSES = ['studying', 'on_leave', 'graduated', 'withdrawn'];
const PREFIXES = ['นาย', 'นางสาว', 'นาง'];
const FIELDS = ['student_code', 'prefix', 'first_name', 'last_name', 'gender', 'birth_date',
  'email', 'phone', 'address', 'major_id', 'year_level', 'gpa', 'status'];

const FROM_JOIN = `
  FROM students s
  LEFT JOIN majors m ON m.id = s.major_id
  LEFT JOIN faculties f ON f.id = m.faculty_id`;
const SELECT_STUDENT = `SELECT s.*, m.name AS major_name, f.id AS faculty_id, f.name AS faculty_name ${FROM_JOIN}`;

function clean(body = {}) {
  const out = {};
  for (const k of FIELDS) {
    let v = body[k];
    if (typeof v === 'string') v = v.trim();
    out[k] = v === '' || v === undefined ? null : v;
  }
  if (out.major_id != null) out.major_id = Number(out.major_id);
  if (out.year_level != null) out.year_level = Number(out.year_level);
  if (out.gpa != null) out.gpa = Number(out.gpa);
  out.status ??= 'studying';
  out.year_level ??= 1;
  return out;
}

function validate(s) {
  const errors = {};
  if (!s.student_code || !/^\d{5,13}$/.test(s.student_code)) errors.student_code = 'รหัสนักศึกษาต้องเป็นตัวเลข 5-13 หลัก';
  if (!PREFIXES.includes(s.prefix)) errors.prefix = 'กรุณาเลือกคำนำหน้า';
  if (!s.first_name) errors.first_name = 'กรุณากรอกชื่อ';
  if (!s.last_name) errors.last_name = 'กรุณากรอกนามสกุล';
  if (s.gender && !['M', 'F', 'O'].includes(s.gender)) errors.gender = 'เพศไม่ถูกต้อง';
  if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  if (s.phone && !/^0\d{8,9}$/.test(s.phone)) errors.phone = 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก';
  if (!Number.isInteger(s.year_level) || s.year_level < 1 || s.year_level > 8) errors.year_level = 'ชั้นปีต้องอยู่ระหว่าง 1-8';
  if (s.gpa != null && (Number.isNaN(s.gpa) || s.gpa < 0 || s.gpa > 4)) errors.gpa = 'เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00-4.00';
  if (!STATUSES.includes(s.status)) errors.status = 'สถานะไม่ถูกต้อง';
  return errors;
}

function dbError(res, err) {
  const msg = String(err.message);
  if (msg.includes('UNIQUE') && msg.includes('student_code'))
    return res.status(409).json({ errors: { student_code: 'รหัสนักศึกษานี้มีอยู่แล้ว' } });
  if (msg.includes('UNIQUE') && msg.includes('email'))
    return res.status(409).json({ errors: { email: 'อีเมลนี้ถูกใช้แล้ว' } });
  if (msg.includes('FOREIGN KEY'))
    return res.status(400).json({ errors: { major_id: 'ไม่พบสาขาวิชาที่เลือก' } });
  console.error(err);
  return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
}

const getById = (id) => db.prepare(`${SELECT_STUDENT} WHERE s.id = ?`).get(id);

// ---------- ข้อมูลอ้างอิง ----------
app.get('/api/faculties', (_req, res) => {
  const faculties = db.prepare('SELECT * FROM faculties ORDER BY id').all();
  const majors = db.prepare('SELECT * FROM majors ORDER BY id').all();
  res.json(faculties.map((f) => ({ ...f, majors: majors.filter((m) => m.faculty_id === f.id) })));
});

app.get('/api/stats', (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n FROM students').get().n;
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM students GROUP BY status').all()) byStatus[r.status] = r.n;
  const avgGpa = db.prepare('SELECT ROUND(AVG(gpa), 2) AS g FROM students WHERE gpa IS NOT NULL').get().g;
  res.json({ total, byStatus, avgGpa });
});

// ---------- CRUD นักศึกษา ----------
app.get('/api/students', (req, res) => {
  const { q = '', status = '', faculty_id = '', page = '1', pageSize = '10' } = req.query;
  const where = [];
  const params = {};
  if (q) {
    where.push(`(s.student_code LIKE :q OR s.first_name LIKE :q OR s.last_name LIKE :q
                 OR s.email LIKE :q OR (s.first_name || ' ' || s.last_name) LIKE :q)`);
    params.q = `%${q}%`;
  }
  if (status) { where.push('s.status = :status'); params.status = status; }
  if (faculty_id) { where.push('f.id = :faculty_id'); params.faculty_id = Number(faculty_id); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const size = Math.min(Math.max(parseInt(pageSize) || 10, 1), 100);
  const pg = Math.max(parseInt(page) || 1, 1);
  const total = db.prepare(`SELECT COUNT(*) AS n ${FROM_JOIN} ${whereSql}`).get(params).n;
  const rows = db.prepare(`${SELECT_STUDENT} ${whereSql} ORDER BY s.student_code LIMIT :limit OFFSET :offset`)
    .all({ ...params, limit: size, offset: (pg - 1) * size });
  res.json({ data: rows, total, page: pg, pageSize: size });
});

app.get('/api/students/:id', (req, res) => {
  const row = getById(Number(req.params.id));
  if (!row) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
  res.json(row);
});

app.post('/api/students', (req, res) => {
  const s = clean(req.body);
  const errors = validate(s);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  try {
    const r = db.prepare(`INSERT INTO students (${FIELDS.join(', ')}) VALUES (${FIELDS.map((f) => `:${f}`).join(', ')})`).run(s);
    res.status(201).json(getById(Number(r.lastInsertRowid)));
  } catch (err) { dbError(res, err); }
});

app.put('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);
  const s = clean(req.body);
  const errors = validate(s);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  try {
    const r = db.prepare(`UPDATE students SET ${FIELDS.map((f) => `${f} = :${f}`).join(', ')} WHERE id = :id`).run({ ...s, id });
    if (!r.changes) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    res.json(getById(id));
  } catch (err) { dbError(res, err); }
});

app.delete('/api/students/:id', (req, res) => {
  const r = db.prepare('DELETE FROM students WHERE id = ?').run(Number(req.params.id));
  if (!r.changes) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
  res.status(204).end();
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`API พร้อมใช้งานที่ http://localhost:${PORT}`));
