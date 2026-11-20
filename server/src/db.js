import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate } from '../../shared/students.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(here, '..', 'db');
export const DB_PATH = process.env.DB_PATH || path.join(dbDir, 'students.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export function initSchema() {
  const r = migrate(db, readFileSync(path.join(dbDir, 'schema.sql'), 'utf8'));
  if (r.migratedFrom) console.log(`ย้ายฐานข้อมูลจาก schema v${r.migratedFrom} → ข้อมูลเดิมเก็บไว้ที่ตาราง ${r.backup}`);
  return r;
}

export function seed() {
  db.exec(readFileSync(path.join(dbDir, 'seed.sql'), 'utf8'));
}
