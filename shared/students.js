// Logic ที่ใช้ร่วมกันระหว่าง server (node:sqlite) และโหมดเบราว์เซอร์ (sql.js)
// db ต้องมีรูปแบบ: db.exec(sql) และ db.prepare(sql) -> { all(params), get(params), run(params) }

export const SCHEMA_VERSION = 2;

export const CONFIRM_STATUSES = ['ยืนยัน', 'รอยืนยัน', 'ไม่ยืนยัน'];
export const PREFIXES = ['นางสาว', 'นาย', 'นาง'];
export const STATUS_SUGGESTIONS = ['สละสิทธิ์', 'ลาออก', 'พักการศึกษา', 'พ้นสภาพ'];

// คอลัมน์ในไฟล์ Excel (เรียงตามไฟล์ตัวอย่าง) — ใช้ทั้งนำเข้าและส่งออก
export const EXCEL_COLUMNS = [
  { header: 'ลำดับ', key: null },
  { header: 'รหัสนักศึกษา', key: 'student_code' },
  { header: 'เลขที่ใบสมัคร', key: 'application_no' },
  { header: 'เลขบัตรประชาชน', key: 'national_id' },
  { header: 'คำนำหน้า', key: 'prefix' },
  { header: 'ชื่อ', key: 'first_name' },
  { header: 'นามสกุล', key: 'last_name' },
  { header: 'ที่อยู่', key: 'address' },
  { header: 'ตำบล', key: 'subdistrict' },
  { header: 'อำเภอ', key: 'district' },
  { header: 'จังหวัด', key: 'province' },
  { header: 'รหัสไปรษณีย์', key: 'postal_code' },
  { header: 'เบอร์โทร', key: 'phone' },
  { header: 'คณะ', key: 'faculty' },
  { header: 'วิทยาลัย', key: 'college' },
  { header: 'โครงการ', key: 'project' },
  { header: 'หลักสูตร', key: 'curriculum' },
  { header: 'รอบ', key: 'admission_round' },
  { header: 'ชื่อโรงเรียน', key: 'school_name' },
  { header: 'จังหวัดโรงเรียน', key: 'school_province' },
  { header: 'รพ.สต. (9 หมอ)', key: 'health_center' },
  { header: 'จังหวัด รพ.สต. (9 หมอ)', key: 'health_center_province' },
  { header: 'สถานะยืนยันสิทธิ์', key: 'confirm_status' },
  { header: 'สถานะ', key: 'status' },
  { header: 'วันที่แจ้ง', key: 'notified_date' },
  { header: 'วันที่กลับมา', key: 'returned_date' },
  { header: 'หมายเหตุ', key: 'note' },
  { header: 'รายละเอียดเพิ่มเติม', key: 'details' },
];

export const FIELDS = EXCEL_COLUMNS.map((c) => c.key).filter(Boolean);
export const DATE_FIELDS = ['notified_date', 'returned_date'];
// ฟิลด์ข้อความที่มีค่าซ้ำกันบ่อย — ใช้ทำตัวเลือกในฟอร์ม/ตัวกรอง
export const OPTION_FIELDS = ['faculty', 'college', 'project', 'curriculum', 'admission_round', 'province', 'status'];

const normHeader = (h) => String(h ?? '').replace(/\s+/g, ' ').trim();
const HEADER_TO_KEY = new Map(EXCEL_COLUMNS.filter((c) => c.key).map((c) => [normHeader(c.header), c.key]));

export class HttpError extends Error {
  constructor(status, message, errors) {
    super(message || 'เกิดข้อผิดพลาด');
    this.status = status;
    this.errors = errors;
  }
}

// ---------- การแปลง/ทำความสะอาดข้อมูล ----------
const PREFIX_STRIP = {
  subdistrict: /^(ตำบล|ต\.)\s*/,
  district: /^(อำเภอ|อ\.)\s*/,
  province: /^(จังหวัด|จ\.)\s*/,
  school_province: /^(จังหวัด|จ\.)\s*/,
  health_center_province: /^(จังหวัด|จ\.)\s*/,
};

const pad = (n) => String(n).padStart(2, '0');

// รับ Date, 'YYYY-MM-DD', 'D/M/YYYY' (พ.ศ. หรือ ค.ศ.) → 'YYYY-MM-DD'; รูปแบบอื่นคืนค่าเดิมให้ validate แจ้ง
export function toIsoDate(v) {
  if (v == null) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return String(v);
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let y, mo, d;
  if (m) [, y, mo, d] = m;
  else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [, d, mo, y] = m;
  else return s;
  y = Number(y);
  if (y > 2400) y -= 543; // พ.ศ. → ค.ศ.
  const date = new Date(y, Number(mo) - 1, Number(d));
  if (date.getMonth() !== Number(mo) - 1) return s; // วันที่ไม่มีจริง
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function clean(body = {}) {
  const out = {};
  for (const k of FIELDS) {
    let v = body[k];
    if (v instanceof Date && DATE_FIELDS.includes(k)) { out[k] = toIsoDate(v); continue; }
    if (typeof v === 'number') v = String(v);
    if (typeof v === 'string') v = v.replace(/\s+/g, ' ').trim();
    if (v === '' || v === '-' || v === undefined) v = null;
    if (v != null && PREFIX_STRIP[k]) v = v.replace(PREFIX_STRIP[k], '') || null;
    out[k] = v;
  }
  if (out.national_id) out.national_id = out.national_id.replace(/\D/g, '');
  if (out.phone) {
    out.phone = out.phone.replace(/\D/g, '');
    if (out.phone.length === 9 && !out.phone.startsWith('0')) out.phone = `0${out.phone}`; // Excel ตัดเลข 0 หน้า
  }
  if (out.postal_code) out.postal_code = out.postal_code.replace(/\D/g, '');
  for (const k of DATE_FIELDS) out[k] = toIsoDate(out[k]);
  if (out.confirm_status?.startsWith('ยืนยัน')) out.confirm_status = 'ยืนยัน';
  out.confirm_status ??= 'รอยืนยัน';
  return out;
}

export function isValidNationalId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

export function validate(s) {
  const errors = {};
  if (!s.application_no) errors.application_no = 'กรุณากรอกเลขที่ใบสมัคร';
  else if (!/^[0-9A-Za-z-]{1,20}$/.test(s.application_no)) errors.application_no = 'เลขที่ใบสมัครไม่ถูกต้อง';
  if (s.student_code && !/^[0-9A-Za-z-]{1,20}$/.test(s.student_code)) errors.student_code = 'รหัสนักศึกษาไม่ถูกต้อง';
  if (s.national_id && !isValidNationalId(s.national_id)) errors.national_id = 'เลขบัตรประชาชนไม่ถูกต้อง (13 หลัก)';
  if (!s.prefix) errors.prefix = 'กรุณาระบุคำนำหน้า';
  if (!s.first_name) errors.first_name = 'กรุณากรอกชื่อ';
  if (!s.last_name) errors.last_name = 'กรุณากรอกนามสกุล';
  if (s.phone && !/^0\d{8,9}$/.test(s.phone)) errors.phone = 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก';
  if (s.postal_code && !/^\d{5}$/.test(s.postal_code)) errors.postal_code = 'รหัสไปรษณีย์ต้องมี 5 หลัก';
  if (!CONFIRM_STATUSES.includes(s.confirm_status)) errors.confirm_status = 'สถานะยืนยันสิทธิ์ไม่ถูกต้อง';
  for (const k of DATE_FIELDS) {
    if (s[k] && !/^\d{4}-\d{2}-\d{2}$/.test(s[k])) errors[k] = 'รูปแบบวันที่ไม่ถูกต้อง';
  }
  if (s.notified_date && s.returned_date && s.returned_date < s.notified_date) {
    errors.returned_date = 'วันที่กลับมาต้องไม่ก่อนวันที่แจ้ง';
  }
  return errors;
}

// แปลงแถวจาก Excel (แถวแรกเป็นหัวตาราง) → { rows: [{ rowNumber, data }], unknownHeaders, missingHeaders }
export function rowsFromSheet(sheet) {
  const [headerRow = [], ...body] = sheet;
  const keys = headerRow.map((h) => HEADER_TO_KEY.get(normHeader(h)) ?? null);
  const unknownHeaders = headerRow.filter((h, i) => h != null && !keys[i] && normHeader(h) !== 'ลำดับ').map(normHeader);
  const missingHeaders = ['application_no', 'first_name', 'last_name']
    .filter((k) => !keys.includes(k))
    .map((k) => EXCEL_COLUMNS.find((c) => c.key === k).header);
  const rows = [];
  body.forEach((cells, i) => {
    if (!cells || cells.every((c) => c == null || String(c).trim() === '')) return;
    const data = {};
    keys.forEach((k, j) => {
      if (!k) return;
      const v = cells[j] ?? null;
      // วันที่ใน Excel ไม่มี timezone — ไลบรารีอ่านเป็นเวลา UTC เที่ยงคืน จึงใช้ค่า UTC
      data[k] = v instanceof Date && !Number.isNaN(v.getTime())
        ? `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
        : v;
    });
    rows.push({ rowNumber: i + 2, data });
  });
  return { rows, unknownHeaders, missingHeaders };
}

// ---------- Migration ----------
export function migrate(db, schemaSql) {
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version >= SCHEMA_VERSION) {
    db.exec(schemaSql);
    return { migratedFrom: null };
  }
  const oldTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'students'").get();
  let backup = null;
  if (oldTable) {
    // schema v1: เก็บตารางเดิมไว้เป็น backup แทนการลบ
    backup = `students_v${version || 1}_backup`;
    db.exec(`
      DROP TRIGGER IF EXISTS trg_students_updated;
      DROP INDEX IF EXISTS idx_students_name;
      DROP INDEX IF EXISTS idx_students_major;
      DROP INDEX IF EXISTS idx_students_status;
      DROP TABLE IF EXISTS ${backup};
      ALTER TABLE students RENAME TO ${backup};`);
  }
  db.exec(schemaSql);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  return { migratedFrom: oldTable ? version || 1 : null, backup };
}

// ---------- Repository ----------
function translateDbError(err) {
  const msg = String(err.message);
  if (msg.includes('UNIQUE') && msg.includes('application_no'))
    return new HttpError(409, 'ข้อมูลซ้ำ', { application_no: 'เลขที่ใบสมัครนี้มีอยู่แล้ว' });
  if (msg.includes('UNIQUE') && msg.includes('national_id'))
    return new HttpError(409, 'ข้อมูลซ้ำ', { national_id: 'เลขบัตรประชาชนนี้มีอยู่แล้ว' });
  if (msg.includes('UNIQUE') && msg.includes('student_code'))
    return new HttpError(409, 'ข้อมูลซ้ำ', { student_code: 'รหัสนักศึกษานี้มีอยู่แล้ว' });
  return err;
}

function checked(body) {
  const s = clean(body);
  const errors = validate(s);
  if (Object.keys(errors).length) throw new HttpError(400, 'ข้อมูลไม่ถูกต้อง', errors);
  return s;
}

const notFound = () => new HttpError(404, 'ไม่พบข้อมูลนักศึกษา');

function buildWhere({ q = '', confirm_status = '', college = '', admission_round = '', province = '', status = '' } = {}) {
  const where = [];
  const params = {};
  if (q) {
    where.push(`(first_name LIKE :q OR last_name LIKE :q OR (first_name || ' ' || last_name) LIKE :q
                 OR application_no LIKE :q OR student_code LIKE :q OR national_id LIKE :q
                 OR phone LIKE :q OR school_name LIKE :q)`);
    params.q = `%${String(q).trim()}%`;
  }
  const eq = { confirm_status, college, admission_round, province };
  for (const [k, v] of Object.entries(eq)) if (v) { where.push(`${k} = :${k}`); params[k] = v; }
  if (status === '__none') where.push('status IS NULL');
  else if (status) { where.push('status = :status'); params.status = status; }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const ORDER = 'ORDER BY first_name COLLATE NOCASE, last_name, id';
const INSERT_SQL = `INSERT INTO students (${FIELDS.join(', ')}) VALUES (${FIELDS.map((f) => `:${f}`).join(', ')})`;
const UPDATE_SQL = `UPDATE students SET ${FIELDS.map((f) => `${f} = :${f}`).join(', ')} WHERE id = :id`;

export function createRepo(db) {
  const getById = (id) => db.prepare('SELECT * FROM students WHERE id = :id').get({ id }) ?? null;

  return {
    options() {
      const out = {};
      for (const f of OPTION_FIELDS) {
        out[f] = db.prepare(`SELECT DISTINCT ${f} AS v FROM students WHERE ${f} IS NOT NULL ORDER BY ${f}`).all().map((r) => r.v);
      }
      return out;
    },

    stats() {
      const r = db.prepare(`SELECT COUNT(*) AS total,
        SUM(confirm_status = 'ยืนยัน') AS confirmed,
        SUM(confirm_status = 'รอยืนยัน') AS pending,
        SUM(confirm_status = 'ไม่ยืนยัน') AS declined,
        SUM(status IS NOT NULL) AS with_status,
        COUNT(DISTINCT province) AS provinces
        FROM students`).get();
      return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? 0]));
    },

    list({ page = '1', pageSize = '10', ...filters } = {}) {
      const w = buildWhere(filters);
      const size = Math.min(Math.max(parseInt(pageSize) || 10, 1), 100);
      const pg = Math.max(parseInt(page) || 1, 1);
      const total = db.prepare(`SELECT COUNT(*) AS n FROM students ${w.sql}`).get(w.params).n;
      const data = db.prepare(`SELECT * FROM students ${w.sql} ${ORDER} LIMIT :limit OFFSET :offset`)
        .all({ ...w.params, limit: size, offset: (pg - 1) * size });
      return { data, total, page: pg, pageSize: size };
    },

    exportRows(filters = {}) {
      const w = buildWhere(filters);
      return db.prepare(`SELECT * FROM students ${w.sql} ${ORDER}`).all(w.params);
    },

    get(id) {
      const row = getById(Number(id));
      if (!row) throw notFound();
      return row;
    },

    create(body) {
      const s = checked(body);
      try {
        return getById(Number(db.prepare(INSERT_SQL).run(s).lastInsertRowid));
      } catch (err) { throw translateDbError(err); }
    },

    update(id, body) {
      const s = checked(body);
      try {
        const r = db.prepare(UPDATE_SQL).run({ ...s, id: Number(id) });
        if (!r.changes) throw notFound();
        return getById(Number(id));
      } catch (err) { throw translateDbError(err); }
    },

    remove(id) {
      const r = db.prepare('DELETE FROM students WHERE id = :id').run({ id: Number(id) });
      if (!r.changes) throw notFound();
    },

    // นำเข้าหลายแถว: มีเลขที่ใบสมัครอยู่แล้ว → แก้ไขเฉพาะคอลัมน์ที่มีในไฟล์ (คอลัมน์อื่นคงค่าเดิม),
    // ไม่มี → เพิ่มใหม่; แถวที่ผิดจะถูกข้ามและรายงานกลับ
    importRows(rows) {
      if (!Array.isArray(rows) || rows.length === 0) throw new HttpError(400, 'ไม่พบข้อมูลที่จะนำเข้า');
      if (rows.length > 5000) throw new HttpError(400, 'นำเข้าได้ครั้งละไม่เกิน 5,000 แถว');
      const findByApp = db.prepare('SELECT * FROM students WHERE application_no = :application_no');
      const insert = db.prepare(INSERT_SQL);
      const update = db.prepare(UPDATE_SQL);
      const result = { inserted: 0, updated: 0, failed: [] };
      db.exec('BEGIN');
      try {
        for (const { rowNumber, data = {} } of rows) {
          const appNo = clean(data).application_no;
          const existing = appNo ? findByApp.get({ application_no: appNo }) : null;
          const s = clean(existing ? { ...existing, ...data } : data);
          const errors = validate(s);
          if (Object.keys(errors).length) { result.failed.push({ rowNumber, errors }); continue; }
          try {
            if (existing) { update.run({ ...s, id: existing.id }); result.updated++; }
            else { insert.run(s); result.inserted++; }
          } catch (err) {
            const e = translateDbError(err);
            if (!(e instanceof HttpError)) throw err;
            result.failed.push({ rowNumber, errors: e.errors });
          }
        }
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      return result;
    },
  };
}
