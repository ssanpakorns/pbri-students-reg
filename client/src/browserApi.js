// โหมดเบราว์เซอร์: รัน SQLite ในเบราว์เซอร์ด้วย sql.js (WebAssembly)
// ใช้ schema.sql / seed.sql ชุดเดียวกับ server และเก็บไฟล์ฐานข้อมูลไว้ใน IndexedDB ของเบราว์เซอร์
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import schemaSql from '../../server/db/schema.sql?raw';
import seedSql from '../../server/db/seed.sql?raw';
import { createRepo, migrate, SCHEMA_VERSION } from '../../shared/students.js';

// ---------- ที่เก็บไฟล์ฐานข้อมูล (IndexedDB) ----------
const IDB_NAME = 'pbri-students';
const IDB_STORE = 'files';
const IDB_KEY = 'students.db';

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(IDB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(IDB_STORE, mode);
      const req = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => { open.result.close(); resolve(req.result); };
      tx.onerror = () => { open.result.close(); reject(tx.error); };
    };
  });
}

async function loadSaved() {
  try {
    return (await idb('readonly', (s) => s.get(IDB_KEY))) ?? null;
  } catch {
    return null; // IndexedDB ถูกปิด (เช่น private mode บางเบราว์เซอร์) → เริ่มจากข้อมูลตัวอย่าง
  }
}

async function save(bytes) {
  try {
    await idb('readwrite', (s) => s.put(bytes, IDB_KEY));
  } catch {
    // บันทึกไม่ได้ — ข้อมูลยังใช้ได้จนกว่าจะปิดหน้า
  }
}

// ---------- ทำให้ sql.js มี interface แบบเดียวกับ node:sqlite ----------
function adapt(sqlDb) {
  const bindParams = (params) => {
    if (!params) return undefined;
    const out = {};
    for (const [k, v] of Object.entries(params)) out[`:${k}`] = v === undefined ? null : v;
    return out;
  };
  return {
    exec: (sql) => sqlDb.exec(sql),
    prepare(sql) {
      const all = (params) => {
        const stmt = sqlDb.prepare(sql);
        try {
          const p = bindParams(params);
          if (p) stmt.bind(p);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          return rows;
        } finally {
          stmt.free();
        }
      };
      return {
        all,
        get: (params) => all(params)[0],
        run(params) {
          sqlDb.run(sql, bindParams(params));
          const changes = sqlDb.getRowsModified();
          const lastInsertRowid = sqlDb.exec('SELECT last_insert_rowid()')[0].values[0][0];
          return { changes, lastInsertRowid };
        },
      };
    },
  };
}

let state; // Promise<{ sqlDb, repo }>

function open(fresh = false) {
  state = Promise.all([initSqlJs({ locateFile: () => wasmUrl }), fresh ? null : loadSaved()]).then(([SQL, saved]) => {
    let sqlDb = saved ? new SQL.Database(saved) : null;
    // ไฟล์ที่บันทึกไว้เป็น schema เก่า → เริ่มใหม่ด้วยข้อมูลตัวอย่าง (โหมดสาธิต)
    if (sqlDb && sqlDb.exec('PRAGMA user_version')[0].values[0][0] < SCHEMA_VERSION) {
      sqlDb.close();
      sqlDb = null;
    }
    const isNew = !sqlDb;
    sqlDb ??= new SQL.Database();
    const db = adapt(sqlDb);
    migrate(db, schemaSql);
    if (isNew) sqlDb.exec(seedSql);
    sqlDb.exec('PRAGMA foreign_keys = ON;');
    const s = { sqlDb, repo: createRepo(db) };
    if (isNew) persist(s);
    return s;
  });
  try { localStorage.removeItem('pbri-students-db'); } catch { /* ที่เก็บเดิมของเวอร์ชันก่อน */ }
  return state;
}

function persist({ sqlDb }) {
  const bytes = sqlDb.export();
  sqlDb.exec('PRAGMA foreign_keys = ON;'); // export() เปิดฐานข้อมูลใหม่ ต้องตั้งค่าซ้ำ
  return save(bytes);
}

async function call(fn, write = false) {
  const s = await (state || open());
  try {
    const result = fn(s.repo);
    if (write) await persist(s);
    return result ?? null;
  } catch (err) {
    err.errors ||= {};
    throw err;
  }
}

export const browserApi = {
  me: async () => ({ role: 'admin', display_name: null, noAuth: true }),
  options: () => call((r) => r.options()),
  stats: () => call((r) => r.stats()),
  listStudents: (params) => call((r) => r.list(params)),
  exportStudents: (params) => call((r) => r.exportRows(params)),
  importStudents: (rows) => call((r) => r.importRows(rows), true),
  createStudent: (data) => call((r) => r.create(data), true),
  updateStudent: (id, data) => call((r) => r.update(id, data), true),
  deleteStudent: (id) => call((r) => r.remove(id), true),
  reset: async () => {
    const old = await state;
    old?.sqlDb.close();
    await open(true);
  },
};
