# คู่มือติดตั้ง Students API (PHP) บน server

API สำหรับระบบจัดการข้อมูลนักศึกษา เขียนด้วย PHP + SQLite ไม่ต้องติดตั้งฐานข้อมูลเพิ่ม

## ความต้องการ
- PHP **8.0 ขึ้นไป** พร้อม extension `pdo_sqlite` (ตรวจด้วย `php -m | grep -i sqlite`)
- Apache (มี `mod_rewrite`) หรือ Nginx + PHP-FPM
- HTTPS (ผ่าน Cloudflare อยู่แล้ว)

## โครงสร้างไฟล์
```
students-api/
├── public/          ← โฟลเดอร์เดียวที่เปิดให้เว็บเข้าถึง (document root)
│   ├── index.php
│   └── .htaccess
├── src/             ← โค้ด (ห้ามเปิดให้เว็บเข้าถึง)
├── bin/create-user.php
├── data/            ← ไฟล์ฐานข้อมูล students.db (ห้ามเปิดให้เว็บเข้าถึง, PHP ต้องเขียนได้)
├── schema.sql, auth.sql
├── config.example.php → คัดลอกเป็น config.php
└── DEPLOY.md
```

## ขั้นตอน

### 1. อัปโหลดไฟล์
บนเครื่องพัฒนา รัน `npm run pack:php-api` จะได้โฟลเดอร์ `dist-php-api/students-api/`
อัปโหลดไปไว้บน server **นอก** document root ของเว็บหลัก เช่น `/var/www/students-api`

### 2. ตั้งค่า
```bash
cd /var/www/students-api
cp config.example.php config.php
nano config.php            # แก้ allowed_origins ให้เป็นเว็บที่จะเรียก API
chown -R www-data:www-data data   # ให้ user ที่รัน PHP เขียนโฟลเดอร์ data ได้ (ชื่อ user อาจต่างกันตามเครื่อง)
chmod 750 data
```

### 3. ชี้ URL มาที่ `public/` — เลือกแบบใดแบบหนึ่ง

**แบบ A — subdomain แยก (แนะนำ)** เช่น `https://students-api.pi.ac.th`

Apache:
```apache
<VirtualHost *:80>
    ServerName students-api.pi.ac.th
    DocumentRoot /var/www/students-api/public
    <Directory /var/www/students-api/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```
Nginx:
```nginx
server {
    server_name students-api.pi.ac.th;
    root /var/www/students-api/public;
    location / { try_files $uri /index.php$is_args$args; }
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param HTTP_AUTHORIZATION $http_authorization;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;   # แก้ตามเวอร์ชัน PHP-FPM ของเครื่อง
    }
}
```
แล้วเพิ่ม DNS record ของ subdomain ใน Cloudflare (Proxied)

**แบบ B — path ย่อยบน domain เดิม** เช่น `https://pi-admission.pi.ac.th/students-api`

Apache (เพิ่มใน VirtualHost เดิม):
```apache
Alias /students-api /var/www/students-api/public
<Directory /var/www/students-api/public>
    AllowOverride All
    Require all granted
</Directory>
```
Nginx (เพิ่มใน server block เดิม):
```nginx
location ^~ /students-api/ {
    alias /var/www/students-api/public/;
    try_files $uri /students-api/index.php$is_args$args;
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/students-api/public/index.php;
        fastcgi_param SCRIPT_NAME /students-api/index.php;
        fastcgi_param HTTP_AUTHORIZATION $http_authorization;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    }
}
```

> ถ้า server เป็นโฮสต์ที่วางไฟล์ได้เฉพาะใต้ web root: วางทั้งโฟลเดอร์ได้ —
> `students-api/.htaccess` จะปิดการเข้าถึงทุกอย่าง ยกเว้น `public/` (URL จะเป็น `/students-api/public/...`)
> แต่ควรใช้แบบ A หรือ B ถ้าทำได้

### 4. ตรวจว่าทำงาน
```bash
curl https://students-api.pi.ac.th/health        # ต้องได้ {"ok":true}
curl https://students-api.pi.ac.th/students      # ต้องได้ 401 กรุณาเข้าสู่ระบบ
curl https://students-api.pi.ac.th/../config.php # ต้องเข้าไม่ได้ (404/403)
```
และตรวจว่าเปิด `https://…/data/students.db` หรือ `https://…/src/Auth.php` **ไม่ได้**

### 5. สร้างบัญชีผู้ใช้ (บน server)
```bash
php bin/create-user.php admin1 admin "ชื่อผู้ดูแล"
php bin/create-user.php staff1 editor "ชื่อเจ้าหน้าที่"
php bin/create-user.php boss1 viewer "ชื่อผู้บริหาร"
```
ระบบสุ่มรหัสผ่านและแสดง**ครั้งเดียว** — ส่งให้เจ้าของบัญชีทางช่องทางที่ปลอดภัย
- รีเซ็ตรหัสผ่าน/เปลี่ยนสิทธิ์: รันคำสั่งเดิมซ้ำ
- ปิดบัญชี: `php bin/create-user.php --deactivate staff1`

| สิทธิ์ | ทำอะไรได้ |
|---|---|
| `admin`, `editor` | ดู เพิ่ม แก้ไข ลบ นำเข้า ส่งออก |
| `viewer` | ดูอย่างเดียว เลขบัตรประชาชนแสดงแค่ 4 หลักท้าย ส่งออกไม่ได้ |

### 6. ให้หน้าเว็บเรียก API นี้
ในโปรเจกต์ แก้ `client/.env.pages` เป็น
```
VITE_API_URL=https://students-api.pi.ac.th
```
(ลบบรรทัด `VITE_STORAGE=browser`) แล้ว push ขึ้น `main` — GitHub Pages จะ build ใหม่และใช้ API นี้
ตรวจว่า `allowed_origins` ใน `config.php` มี `https://ssanpakorns.github.io`

### 7. นำเข้าข้อมูลจริง
login ด้วยบัญชี admin/editor → ปุ่ม "นำเข้า Excel" → เลือกไฟล์ข้อมูลรายงานตัว

## การดูแลต่อเนื่อง
- **Backup ทุกวัน** — ใช้คำสั่งของ SQLite (ปลอดภัยแม้มีคนใช้งานอยู่):
  ```bash
  sqlite3 /var/www/students-api/data/students.db ".backup '/backup/students-$(date +%F).db'"
  ```
  เก็บไฟล์ backup ไว้นอก server ด้วย และลองกู้คืนดูอย่างน้อยหนึ่งครั้ง
- **บันทึกการใช้งาน** อยู่ในตาราง `audit_log` (ใคร login / เพิ่ม / แก้ / ลบ / นำเข้า / ส่งออก เมื่อไร จาก IP ไหน)
  ```bash
  sqlite3 data/students.db "SELECT a.created_at, u.username, a.action, a.target_id, a.detail FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 50;"
  ```
- login ผิดเกิน 10 ครั้งใน 15 นาที บัญชีนั้นจะถูกล็อกชั่วคราว
- แนะนำเพิ่ม **Cloudflare Access** ให้เข้าได้เฉพาะอีเมล `@pi.ac.th` เป็นการป้องกันอีกชั้น
- อัปเดตโค้ด: รัน `npm run pack:php-api` ใหม่ แล้วอัปโหลดทับ `public/`, `src/`, `bin/`, `schema.sql`, `auth.sql`
  (ห้ามทับ `config.php` และ `data/`) — โครงสร้างฐานข้อมูลจะอัปเกรดให้อัตโนมัติ
