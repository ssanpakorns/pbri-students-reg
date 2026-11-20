# ระบบจัดการข้อมูลนักศึกษา (PBRI Students Reg)

เว็บแอปจัดการข้อมูลรายงานตัวนักศึกษาใหม่: เพิ่ม / ค้นหา / กรอง / แก้ไข / ลบ และ**นำเข้า–ส่งออก Excel**

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

## นำเข้า / ส่งออก Excel
- ไฟล์ `.xlsx` แถวแรกเป็นหัวตาราง ใช้ชื่อคอลัมน์ตามไฟล์ข้อมูลรายงานตัว:
  ลำดับ, รหัสนักศึกษา, เลขที่ใบสมัคร, เลขบัตรประชาชน, คำนำหน้า, ชื่อ, นามสกุล, ที่อยู่, ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์, เบอร์โทร,
  คณะ, วิทยาลัย, โครงการ, หลักสูตร, รอบ, ชื่อโรงเรียน, จังหวัดโรงเรียน, รพ.สต. (9 หมอ), จังหวัด รพ.สต. (9 หมอ),
  สถานะยืนยันสิทธิ์, สถานะ, วันที่แจ้ง, วันที่กลับมา, หมายเหตุ, รายละเอียดเพิ่มเติม
- จำเป็นต้องมี: เลขที่ใบสมัคร, ชื่อ, นามสกุล — คอลัมน์อื่นมีหรือไม่มีก็ได้ เรียงลำดับอย่างไรก็ได้
- **เลขที่ใบสมัครเป็นตัวระบุ:** ถ้ามีอยู่แล้วจะอัปเดต ถ้ายังไม่มีจะเพิ่มใหม่ แถวที่ข้อมูลผิดจะถูกข้ามและแจ้งเลขแถวพร้อมสาเหตุ
- ทำความสะอาดข้อมูลให้อัตโนมัติ: `-` และช่องว่าง = ไม่มีข้อมูล, ตัดคำว่า "ตำบล/อำเภอ/จังหวัด" นำหน้า, เติมเลข 0 หน้าเบอร์โทรที่ Excel ตัดหาย,
  แปลงวันที่ `วว/ดด/ปปปป` (พ.ศ. หรือ ค.ศ.) เป็น ค.ศ., ตรวจเลขบัตรประชาชนด้วย checksum
- ส่งออกจะได้ไฟล์รูปแบบเดียวกัน (ใช้ตัวกรองที่เลือกอยู่) จึงนำกลับมานำเข้าได้

> ⚠️ ไฟล์ Excel จริงมีข้อมูลส่วนบุคคล (เลขบัตรประชาชน ที่อยู่ เบอร์โทร) — อย่า commit ขึ้น repo (`.gitignore` กันไฟล์ `*.xlsx` ไว้แล้ว)
> และ `server/db/seed.sql` ต้องเป็นข้อมูลสมมติเท่านั้น

## GitHub Pages (โหมดสาธิต)
เว็บสาธิต: https://ssanpakorns.github.io/pbri-students-reg/

GitHub Pages รันได้แค่ไฟล์ static จึงไม่มี Express server — เวอร์ชันบน Pages จะรัน SQLite ในเบราว์เซอร์ด้วย [sql.js](https://sql.js.org)
โดยใช้ `schema.sql` / `seed.sql` ชุดเดียวกับ server และเก็บไฟล์ฐานข้อมูลไว้ใน IndexedDB ของแต่ละเบราว์เซอร์
(ข้อมูลที่นำเข้าไม่ถูกส่งออกจากเครื่อง และไม่แชร์กันระหว่างผู้ใช้)

- Deploy อัตโนมัติทุกครั้งที่ push ขึ้น `main`: workflow `.github/workflows/deploy-pages.yml` จะ build แล้ว push ขึ้น branch `gh-pages` (ตั้ง Settings → Pages → Source เป็น branch `gh-pages` / root)
- Build เองในเครื่อง: `npm run build:pages` (ได้ผลลัพธ์ที่ `client/dist`)
- Logic ตรวจข้อมูล การแปลงข้อมูล Excel และคำสั่ง SQL อยู่ที่ `shared/students.js` ใช้ร่วมกันทั้ง server และโหมดเบราว์เซอร์

## โครงสร้างฐานข้อมูล (`server/db/schema.sql`, schema v2)
ตาราง `students` หนึ่งแถวต่อผู้สมัคร/นักศึกษา หนึ่งคน:

| กลุ่ม | คอลัมน์ |
|---|---|
| ตัวระบุ | `application_no` เลขที่ใบสมัคร (จำเป็น, ไม่ซ้ำ), `student_code` รหัสนักศึกษา (ไม่ซ้ำ, ยังไม่มีได้), `national_id` เลขบัตรประชาชน (ไม่ซ้ำ) |
| ข้อมูลส่วนตัว | `prefix`, `first_name`, `last_name`, `phone` |
| ที่อยู่ | `address`, `subdistrict`, `district`, `province`, `postal_code` |
| การรับเข้า | `faculty`, `college`, `project`, `curriculum`, `admission_round`, `school_name`, `school_province`, `health_center`, `health_center_province` |
| สถานะ | `confirm_status` (ยืนยัน / รอยืนยัน / ไม่ยืนยัน), `status` (เช่น สละสิทธิ์ ลาออก พักการศึกษา — ว่าง = ปกติ), `notified_date`, `returned_date`, `note`, `details` |

ฐานข้อมูลเดิม (schema v1) จะถูกย้ายให้อัตโนมัติตอนเปิด server — ข้อมูลเดิมเก็บไว้ในตาราง `students_v1_backup`

## API
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/students?q=&college=&admission_round=&province=&confirm_status=&status=&page=&pageSize=` | รายการ (ค้นหา + กรอง + แบ่งหน้า); `status=__none` = ไม่มีการเปลี่ยนสถานะ |
| GET | `/api/students/export?…ตัวกรองเดียวกัน` | ทุกแถวที่ตรงตัวกรอง (ใช้ส่งออก Excel) |
| POST | `/api/students/import` | นำเข้า `{ rows: [{ rowNumber, data }] }` → `{ inserted, updated, failed }` |
| GET | `/api/students/:id` | ข้อมูล 1 คน |
| POST | `/api/students` | เพิ่ม |
| PUT | `/api/students/:id` | แก้ไข |
| DELETE | `/api/students/:id` | ลบ |
| GET | `/api/options` | ค่าที่มีในระบบ (วิทยาลัย รอบ จังหวัด ฯลฯ) สำหรับตัวกรองและตัวเลือกในฟอร์ม |
| GET | `/api/stats` | สถิติสรุป |

ตั้งพอร์ต API ได้ด้วยตัวแปร `API_PORT` และย้ายไฟล์ฐานข้อมูลด้วย `DB_PATH`
