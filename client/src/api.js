// ที่อยู่ API: ค่าเริ่มต้น /api (Express ตอน dev) หรือกำหนดด้วย VITE_API_URL เช่น https://pi-admission.pi.ac.th/students-api
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

// token ของการ login เก็บใน sessionStorage (ปิดแท็บแล้วต้อง login ใหม่)
const TOKEN_KEY = 'pbri-students-token';
export const session = {
  get() { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(t) { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* ใช้ได้เฉพาะหน้านี้ */ } },
  clear() { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ไม่มีที่เก็บ */ } },
};

async function request(path, options = {}) {
  const token = session.get();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw Object.assign(new Error('เชื่อมต่อ API ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือติดต่อผู้ดูแลระบบ'), { errors: {}, status: 0 });
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || 'เกิดข้อผิดพลาด');
    err.errors = body.errors || {};
    err.status = res.status;
    if (res.status === 401 && path !== '/auth/login') {
      session.clear();
      window.dispatchEvent(new Event('auth-required'));
    }
    throw err;
  }
  return body;
}

// ใช้เมื่อ API ไม่มีระบบ login (Express ตอน dev) หรือโหมดเบราว์เซอร์
export const NO_AUTH_USER = { role: 'admin', display_name: null, noAuth: true };

const qs = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));

const serverApi = {
  async login(username, password) {
    const r = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    session.set(r.token);
    return r.user;
  },
  async me() {
    try {
      return await request('/auth/me');
    } catch (err) {
      if (err.status === 404) return NO_AUTH_USER; // API นี้ไม่มีระบบ login
      throw err;
    }
  },
  async logout() {
    await request('/auth/logout', { method: 'POST' }).catch(() => {});
    session.clear();
  },
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
