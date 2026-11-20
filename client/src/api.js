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

export const api = {
  faculties: () => request('/faculties'),
  stats: () => request('/stats'),
  listStudents: (params) => request(`/students?${new URLSearchParams(params)}`),
  createStudent: (data) => request('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, data) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),
};

export const STATUS = {
  studying: { label: 'กำลังศึกษา', badge: 'badge-success' },
  on_leave: { label: 'พักการศึกษา', badge: 'badge-warning' },
  graduated: { label: 'สำเร็จการศึกษา', badge: 'badge-info' },
  withdrawn: { label: 'พ้นสภาพ', badge: 'badge-error' },
};
