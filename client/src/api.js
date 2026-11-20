async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || 'เกิดข้อผิดพลาด');
    err.errors = body.errors || {};
    throw err;
  }
  return body;
}

const qs = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));

const serverApi = {
  options: () => request('/options'),
  stats: () => request('/stats'),
  listStudents: (params) => request(`/students?${qs(params)}`),
  exportStudents: (params) => request(`/students/export?${qs(params)}`),
  importStudents: (rows) => request('/students/import', { method: 'POST', body: JSON.stringify({ rows }) }),
  createStudent: (data) => request('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, data) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),
};

// VITE_STORAGE=browser (ใช้ตอน build ให้ GitHub Pages) → ใช้ SQLite ในเบราว์เซอร์แทน API
export const BROWSER_MODE = import.meta.env.VITE_STORAGE === 'browser';
export const api = BROWSER_MODE ? (await import('./browserApi.js')).browserApi : serverApi;

export const CONFIRM_BADGE = {
  'ยืนยัน': 'badge-success',
  'รอยืนยัน': 'badge-warning',
  'ไม่ยืนยัน': 'badge-error',
};

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export function thaiDate(iso) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso || '-';
  return `${Number(m[3])} ${TH_MONTHS[Number(m[2]) - 1]} ${Number(m[1]) + 543}`;
}

export function formatPhone(p) {
  if (!p) return '-';
  return p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : p;
}
