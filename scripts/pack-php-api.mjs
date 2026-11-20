// รวมไฟล์ PHP API เป็นโฟลเดอร์พร้อมอัปโหลดขึ้น server: dist-php-api/students-api/
//   npm run pack:php-api
import { cpSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-php-api', 'students-api');
const src = path.join(root, 'api-php');

rmSync(path.join(root, 'dist-php-api'), { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of ['public', 'src', 'bin', 'auth.sql', 'config.example.php', 'DEPLOY.md']) {
  cpSync(path.join(src, item), path.join(out, item), { recursive: true });
}
copyFileSync(path.join(root, 'server', 'db', 'schema.sql'), path.join(out, 'schema.sql'));

// กันไว้อีกชั้น: ถ้าวางทั้งโฟลเดอร์ไว้ใต้ web root (Apache) ให้เข้าถึงได้เฉพาะ public/
writeFileSync(path.join(out, '.htaccess'), '# อนุญาตเฉพาะโฟลเดอร์ public/ เท่านั้น\nRequire all denied\n');
mkdirSync(path.join(out, 'data'));
writeFileSync(path.join(out, 'data', '.htaccess'), 'Require all denied\n');

console.log(`✔ สร้างแล้ว: ${path.relative(root, out)}`);
console.log('  อัปโหลดทั้งโฟลเดอร์นี้ขึ้น server แล้วทำตาม DEPLOY.md');
