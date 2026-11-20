import { DB_PATH, initSchema, seed } from './db.js';

initSchema();
console.log(`✔ สร้างตารางเรียบร้อย: ${DB_PATH}`);
if (process.argv.includes('--seed')) {
  seed();
  console.log('✔ เพิ่มข้อมูลตัวอย่างเรียบร้อย');
}
