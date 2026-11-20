// ตรวจว่า API ทำงานตรงตามข้อตกลงเดียวกัน (ใช้ได้ทั้ง Express และ PHP)
//   node scripts/api-contract-test.mjs <baseUrl> [editorUser editorPass] [viewerUser viewerPass]
// ตัวอย่าง: node scripts/api-contract-test.mjs http://localhost:3001/api
//          node scripts/api-contract-test.mjs http://127.0.0.1:8081 editor1 xxxx viewer1 yyyy
// สร้างข้อมูลทดสอบด้วยเลขใบสมัคร 6999xxxxxxx และลบทิ้งเมื่อจบ

const [base, editorUser, editorPass, viewerUser, viewerPass] = process.argv.slice(2);
if (!base) {
  console.error('ระบุ baseUrl ของ API');
  process.exit(1);
}
const withAuth = Boolean(editorUser);
let token = null;
let failures = 0;
const created = [];

async function call(method, path, body, useToken = token) {
  const res = await fetch(base.replace(/\/+$/, '') + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(useToken ? { Authorization: `Bearer ${useToken}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function check(name, cond, info) {
  if (cond) console.log(`  ✔ ${name}`);
  else { failures++; console.log(`  ✘ ${name}`, info === undefined ? '' : JSON.stringify(info)); }
}

function fakeNationalId() {
  let d = '0' + String(Math.floor(Math.random() * 1e11)).padStart(11, '0');
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (13 - i);
  return d + ((11 - (sum % 11)) % 10);
}

const run = Date.now().toString().slice(-7);
const app = (n) => `6999${run}${n}`;

console.log(`API: ${base}${withAuth ? ' (มีระบบ login)' : ''}`);

if (withAuth) {
  console.log('การยืนยันตัวตน');
  check('ไม่ login → 401', (await call('GET', '/students', undefined, null)).status === 401);
  check('รหัสผิด → 401', (await call('POST', '/auth/login', { username: editorUser, password: 'wrong-password' }, null)).status === 401);
  const login = await call('POST', '/auth/login', { username: editorUser, password: editorPass }, null);
  check('login สำเร็จได้ token', login.status === 200 && /^[0-9a-f]{64}$/.test(login.body?.token), login);
  token = login.body?.token;
  const me = await call('GET', '/auth/me');
  check('/auth/me คืนข้อมูลผู้ใช้', me.status === 200 && me.body.username?.toLowerCase() === editorUser.toLowerCase(), me);
}

console.log('สถิติและตัวเลือก');
const stats = await call('GET', '/stats');
check('/stats มีครบทุกค่า', stats.status === 200 && ['total', 'confirmed', 'pending', 'declined', 'with_status', 'provinces'].every((k) => typeof stats.body[k] === 'number'), stats.body);

console.log('เพิ่มข้อมูล');
const bad = await call('POST', '/students', { prefix: '', first_name: ' ', national_id: '123', phone: '12', postal_code: '1' });
check('ข้อมูลผิด → 400 พร้อมรายการ error',
  bad.status === 400 && ['application_no', 'prefix', 'first_name', 'last_name', 'national_id', 'phone', 'postal_code'].every((k) => bad.body.errors?.[k]), bad.body);

const nid = fakeNationalId();
const good = await call('POST', '/students', {
  application_no: app(1), national_id: nid, prefix: 'นางสาว', first_name: '  ทดสอบ   ระบบ ', last_name: 'สัญญา',
  subdistrict: 'ตำบลแม่สอด', district: 'อำเภอแม่สอด', province: 'จังหวัดตาก', postal_code: 63110, phone: 812345678,
  confirm_status: 'ยืนยันสิทธิ์', notified_date: '15/06/2569', school_name: '-', status: '',
});
check('เพิ่มสำเร็จ → 201', good.status === 201 && good.body?.id, good.body);
if (good.body?.id) created.push(good.body.id);
const g = good.body || {};
check('ทำความสะอาดข้อมูล', g.first_name === 'ทดสอบ ระบบ' && g.subdistrict === 'แม่สอด' && g.district === 'แม่สอด' && g.province === 'ตาก'
  && g.postal_code === '63110' && g.phone === '0812345678' && g.confirm_status === 'ยืนยัน' && g.notified_date === '2026-06-15'
  && g.school_name === null && g.status === null, g);

const dup = await call('POST', '/students', { application_no: app(1), prefix: 'นาย', first_name: 'ก', last_name: 'ข' });
check('เลขใบสมัครซ้ำ → 409', dup.status === 409 && dup.body.errors?.application_no, dup.body);
const dupId = await call('POST', '/students', { application_no: app(2), national_id: nid, prefix: 'นาย', first_name: 'ก', last_name: 'ข' });
check('เลขบัตรซ้ำ → 409', dupId.status === 409 && dupId.body.errors?.national_id, dupId.body);

console.log('แก้ไขและค้นหา');
const upd = await call('PUT', `/students/${g.id}`, { ...g, status: 'พักการศึกษา', returned_date: '2026-07-01' });
check('แก้ไขสำเร็จ', upd.status === 200 && upd.body.status === 'พักการศึกษา' && upd.body.returned_date === '2026-07-01', upd.body);
const updBad = await call('PUT', `/students/${g.id}`, { ...g, returned_date: '2026-01-01' });
check('วันที่กลับมาก่อนวันที่แจ้ง → 400', updBad.status === 400 && updBad.body.errors?.returned_date, updBad.body);
check('แก้ id ที่ไม่มี → 404', (await call('PUT', '/students/99999999', g)).status === 404);

const found = await call('GET', `/students?q=${app(1)}`);
check('ค้นหาด้วยเลขใบสมัคร', found.status === 200 && found.body.total === 1 && found.body.data[0].id === g.id, found.body);
const byName = await call('GET', `/students?q=${encodeURIComponent('ทดสอบ ระบบ')}&province=${encodeURIComponent('ตาก')}&status=${encodeURIComponent('พักการศึกษา')}`);
check('ค้นหาชื่อ + ตัวกรอง', byName.body?.data?.some((r) => r.id === g.id), byName.body);
const none = await call('GET', `/students?q=${app(1)}&status=__none`);
check('ตัวกรอง status=__none', none.body?.total === 0, none.body);
const paged = await call('GET', '/students?pageSize=1&page=1');
check('แบ่งหน้า', paged.body?.pageSize === 1 && paged.body.data.length <= 1, paged.body);

console.log('นำเข้า');
const imp = await call('POST', '/students/import', { rows: [
  { rowNumber: 2, data: { application_no: app(3), prefix: 'นาย', first_name: 'นำเข้า', last_name: 'ใหม่', national_id: fakeNationalId(), notified_date: '01/02/2026' } },
  { rowNumber: 3, data: { application_no: app(4), prefix: 'นาย', first_name: 'เลขบัตร', last_name: 'ผิด', national_id: '1234567890123' } },
  { rowNumber: 4, data: { application_no: app(5), prefix: 'นาย', first_name: '', last_name: '-' } },
  { rowNumber: 5, data: { application_no: app(6), prefix: 'นาย', first_name: 'บัตร', last_name: 'ซ้ำ', national_id: nid } },
  { rowNumber: 6, data: { application_no: app(7), prefix: 'นาย', first_name: 'วันที่', last_name: 'ผิด', notified_date: '31/02/2569' } },
  { rowNumber: 7, data: { application_no: app(1), national_id: nid, prefix: 'นางสาว', first_name: 'ทดสอบ', last_name: 'อัปเดต' } },
] });
const failedRows = Object.fromEntries((imp.body?.failed || []).map((f) => [f.rowNumber, Object.keys(f.errors || {}).sort().join(',')]));
check('นับเพิ่ม/อัปเดตถูก', imp.status === 200 && imp.body.inserted === 1 && imp.body.updated === 1, imp.body);
check('รายงานแถวที่ผิดถูก', JSON.stringify(failedRows) === JSON.stringify({ 3: 'national_id', 4: 'first_name,last_name', 5: 'national_id', 6: 'notified_date' }), failedRows);
const imported = await call('GET', `/students?q=6999${run}`);
for (const r of imported.body?.data || []) if (!created.includes(r.id)) created.push(r.id);
check('แถวที่อัปเดตเปลี่ยนจริง', imported.body?.data?.some((r) => r.id === g.id && r.last_name === 'อัปเดต'), imported.body);
check('คอลัมน์ที่ไม่มีในไฟล์คงค่าเดิม', imported.body?.data?.some((r) => r.id === g.id && r.province === 'ตาก' && r.status === 'พักการศึกษา'),
  imported.body?.data?.find((r) => r.id === g.id));
check('นำเข้าว่าง → 400', (await call('POST', '/students/import', { rows: [] })).status === 400);

console.log('ส่งออกและตัวเลือก');
const exp = await call('GET', `/students/export?q=6999${run}`);
check('ส่งออกตามตัวกรอง', exp.status === 200 && Array.isArray(exp.body) && exp.body.length === 2, exp.body?.length);
const opts = await call('GET', '/options');
check('/options มีจังหวัดที่เพิ่ม', opts.status === 200 && opts.body.province?.includes('ตาก'), opts.body);

if (viewerUser) {
  console.log('สิทธิ์ viewer');
  const vl = await call('POST', '/auth/login', { username: viewerUser, password: viewerPass }, null);
  const vt = vl.body?.token;
  check('viewer login ได้', vl.status === 200 && vt, vl.body);
  const vlist = await call('GET', `/students?q=${app(1)}`, undefined, vt);
  check('viewer เห็นเลขบัตรแบบปิดบัง', vlist.body?.data?.[0]?.national_id === `xxxxxxxxx${nid.slice(-4)}`, vlist.body?.data?.[0]?.national_id);
  check('viewer เพิ่มข้อมูลไม่ได้ → 403', (await call('POST', '/students', { application_no: app(8), prefix: 'นาย', first_name: 'a', last_name: 'b' }, vt)).status === 403);
  check('viewer ส่งออกไม่ได้ → 403', (await call('GET', '/students/export', undefined, vt)).status === 403);
  check('viewer ลบไม่ได้ → 403', (await call('DELETE', `/students/${g.id}`, undefined, vt)).status === 403);
  await call('POST', '/auth/logout', undefined, vt);
  check('logout แล้ว token ใช้ไม่ได้', (await call('GET', '/auth/me', undefined, vt)).status === 401);
}

console.log('ลบข้อมูลทดสอบ');
let deleted = 0;
for (const id of created) if ((await call('DELETE', `/students/${id}`)).status === 204) deleted++;
check(`ลบข้อมูลทดสอบครบ (${created.length} แถว)`, deleted === created.length);
check('ดูข้อมูลที่ลบแล้ว → 404', (await call('GET', `/students/${g.id}`)).status === 404);

console.log(failures ? `\n✘ ไม่ผ่าน ${failures} ข้อ` : '\n✔ ผ่านทุกข้อ');
process.exit(failures ? 1 : 0);
