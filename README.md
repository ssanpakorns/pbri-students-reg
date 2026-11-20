# ระบบจัดการข้อมูลนักศึกษา (PBRI Students Reg)

เว็บแอปสำหรับเพิ่ม / ค้นหา / แก้ไข / ลบ ข้อมูลนักศึกษา

- **Frontend:** React 19 + Vite + Tailwind CSS 4 + DaisyUI 5 (`client/`)
- **Backend:** Node.js + Express 5 (`server/`)
- **Database:** SQLite ผ่าน `node:sqlite` ที่มากับ Node.js (ไม่ต้องติดตั้งฐานข้อมูลเพิ่ม) — ไฟล์อยู่ที่ `server/db/students.db`

## ความต้องการ
- Node.js 22.13 ขึ้นไป

## เริ่มใช้งาน
```powershell
npm install
npm run db:seed   # สร้างตาราง + ข้อมูลตัวอย่าง (ใช้ npm run db:init ถ้าต้องการแค่ตารางเปล่า)
npm run dev       # เปิด API (พอร์ต 3001) และหน้าเว็บ (http://localhost:5173) พร้อมกัน
```

## GitHub Pages (โหมดสาธิต)
เว็บสาธิต: https://ssanpakorns.github.io/pbri-students-reg/

GitHub Pages รันได้แค่ไฟล์ static จึงไม่มี Express server — เวอร์ชันบน Pages จะรัน SQLite ในเบราว์เซอร์ด้วย [sql.js](https://sql.js.org)
โดยใช้ `schema.sql` / `seed.sql` ชุดเดียวกับ server และเก็บข้อมูลไว้ใน localStorage ของแต่ละเบราว์เซอร์ (ไม่แชร์กันระหว่างผู้ใช้)

- Deploy อัตโนมัติทุกครั้งที่ push ขึ้น `main`: workflow `.github/workflows/deploy-pages.yml` จะ build แล้ว push ขึ้น branch `gh-pages` (ตั้ง Settings → Pages → Source เป็น branch `gh-pages` / root)
- Build เองในเครื่อง: `npm run build:pages` (ได้ผลลัพธ์ที่ `client/dist`)
- Logic ตรวจข้อมูลและคำสั่ง SQL อยู่ที่ `shared/students.js` ใช้ร่วมกันทั้ง server และโหมดเบราว์เซอร์

## โครงสร้างฐานข้อมูล (`server/db/schema.sql`)
| ตาราง | คำอธิบาย |
|---|---|
| `faculties` | คณะ |
| `majors` | สาขาวิชา (อ้างอิง `faculties`) |
| `students` | นักศึกษา: รหัส (unique), คำนำหน้า, ชื่อ, นามสกุล, เพศ, วันเกิด, อีเมล (unique), เบอร์โทร, ที่อยู่, สาขา, ชั้นปี, GPA, สถานะ, เวลาสร้าง/แก้ไข |

สถานะนักศึกษา: `studying` กำลังศึกษา, `on_leave` พักการศึกษา, `graduated` สำเร็จการศึกษา, `withdrawn` พ้นสภาพ

## API
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/students?q=&status=&faculty_id=&page=&pageSize=` | รายการนักศึกษา (ค้นหา + กรอง + แบ่งหน้า) |
| GET | `/api/students/:id` | ข้อมูลนักศึกษา 1 คน |
| POST | `/api/students` | เพิ่มนักศึกษา |
| PUT | `/api/students/:id` | แก้ไขข้อมูล |
| DELETE | `/api/students/:id` | ลบข้อมูล |
| GET | `/api/faculties` | คณะพร้อมสาขาวิชา |
| GET | `/api/stats` | สถิติสรุป |

ตั้งพอร์ต API ได้ด้วยตัวแปร `API_PORT` และย้ายไฟล์ฐานข้อมูลด้วย `DB_PATH`
