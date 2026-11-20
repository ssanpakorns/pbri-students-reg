<?php
// คัดลอกไฟล์นี้เป็น config.php แล้วแก้ค่าตามเครื่องจริง (config.php ไม่ถูก commit)
return [
    // ไฟล์ฐานข้อมูล SQLite — ต้องอยู่นอกโฟลเดอร์ที่เว็บเปิดให้เข้าถึง (นอก public/)
    // และ user ที่รัน PHP ต้องเขียนได้ทั้งไฟล์และโฟลเดอร์
    'db_path' => __DIR__ . '/data/students.db',

    // เว็บที่อนุญาตให้เรียก API นี้จากเบราว์เซอร์ (CORS) — ใส่ให้ตรงทุกตัวอักษร ไม่มี / ท้าย
    'allowed_origins' => [
        'https://ssanpakorns.github.io',
        'http://localhost:5173',
    ],

    // อายุการ login (ชั่วโมง)
    'session_hours' => 12,
];
