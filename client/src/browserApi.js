// โหมดเบราว์เซอร์: รัน SQLite ในเบราว์เซอร์ด้วย sql.js (WebAssembly)
// ใช้ schema.sql / seed.sql ชุดเดียวกับ server และเก็บไฟล์ฐานข้อมูลไว้ใน localStorage
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import schemaSql from '../../server/db/schema.sql?raw';
import seedSql from '../../server/db/seed.sql?raw';
import { createRepo } from '../../shared/students.js';

const STORAGE_KEY = 'pbri-students-db';

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function loadSaved() {
  try {
    const b64 = localStorage.getItem(STORAGE_KEY);
    return b64 ? fromBase64(b64) : null;
  } catch {
    return null;
  }
}

// ทำให้ sql.js มี interface แบบเดียวกับ node:sqlite (prepare().all/get/run)
function adapt(sqlDb) {
  const bindParams = (params) => {
    if (!params) return undefined;
    const out = {};
    for (const [k, v] of Object.entries(params)) out[`:${k}`] = v === undefined ? null : v;
    return out;
  };
  return {
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
  state = initSqlJs({ locateFile: () => wasmUrl }).then((SQL) => {
    const saved = fresh ? null : loadSaved();
    const sqlDb = saved ? new SQL.Database(saved) : new SQL.Database();
    sqlDb.exec(schemaSql);
    if (!saved) sqlDb.exec(seedSql);
    sqlDb.exec('PRAGMA foreign_keys = ON;');
    return { sqlDb, repo: createRepo(adapt(sqlDb)) };
  });
  if (fresh) state.then(persist);
  return state;
}

function persist({ sqlDb }) {
  try {
    localStorage.setItem(STORAGE_KEY, toBase64(sqlDb.export()));
  } catch {
    // localStorage อาจถูกปิดหรือเต็ม — ข้อมูลยังใช้ได้จนกว่าจะปิดหน้า
  }
  sqlDb.exec('PRAGMA foreign_keys = ON;'); // export() เปิดฐานข้อมูลใหม่ ต้องตั้งค่าซ้ำ
}

async function call(fn, write = false) {
  const s = await (state || open());
  try {
    const result = fn(s.repo);
    if (write) persist(s);
    return result ?? null;
  } catch (err) {
    err.errors ||= {};
    throw err;
  }
}

export const browserApi = {
  faculties: () => call((r) => r.faculties()),
  stats: () => call((r) => r.stats()),
  listStudents: (params) => call((r) => r.list(params)),
  createStudent: (data) => call((r) => r.create(data), true),
  updateStudent: (id, data) => call((r) => r.update(id, data), true),
  deleteStudent: (id) => call((r) => r.remove(id), true),
  reset: async () => {
    const old = await state;
    old?.sqlDb.close();
    await open(true);
  },
};
