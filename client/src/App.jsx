import { useCallback, useEffect, useRef, useState } from 'react';
import { api, BROWSER_MODE, STATUS } from './api.js';
import StudentForm from './components/StudentForm.jsx';
import StudentTable from './components/StudentTable.jsx';
import StatsBar from './components/StatsBar.jsx';

const PAGE_SIZE = 10;

export default function App() {
  const [faculties, setFaculties] = useState([]);
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState({ data: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', status: '', faculty_id: '' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null = ปิด, {} = เพิ่มใหม่, student = แก้ไข
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const formDialog = useRef(null);
  const deleteDialog = useRef(null);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        api.listStudents({ ...filters, page, pageSize: PAGE_SIZE }),
        api.stats(),
      ]);
      setResult(list);
      setStats(s);
    } catch (e) {
      notify(e.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { api.faculties().then(setFaculties).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'corporate';
  }, [dark]);

  const openForm = (student) => {
    setEditing(student || {});
    formDialog.current?.showModal();
  };
  const closeForm = () => {
    formDialog.current?.close();
    setEditing(null);
  };

  const handleSave = async (data) => {
    if (editing?.id) {
      await api.updateStudent(editing.id, data);
      notify('แก้ไขข้อมูลเรียบร้อย');
    } else {
      await api.createStudent(data);
      notify('เพิ่มนักศึกษาเรียบร้อย');
    }
    closeForm();
    load();
  };

  const askDelete = (student) => {
    setDeleting(student);
    deleteDialog.current?.showModal();
  };
  const confirmDelete = async () => {
    try {
      await api.deleteStudent(deleting.id);
      notify('ลบข้อมูลเรียบร้อย');
      if (result.data.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      deleteDialog.current?.close();
      setDeleting(null);
    }
  };

  const resetData = async () => {
    if (!confirm('ล้างข้อมูลทั้งหมดในเบราว์เซอร์นี้และกลับไปใช้ข้อมูลตัวอย่าง?')) return;
    await api.reset();
    notify('รีเซ็ตข้อมูลเรียบร้อย');
    if (page !== 1) setPage(1);
    else load();
  };

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1 gap-2 flex items-center">
          <div className="avatar avatar-placeholder">
            <div className="bg-primary text-primary-content w-10 rounded-lg">
              <span className="text-lg font-bold">S</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">ระบบจัดการข้อมูลนักศึกษา</div>
            <div className="text-xs opacity-60">Student Registration</div>
          </div>
        </div>
        <label className="swap swap-rotate btn btn-ghost btn-circle" title="สลับธีม">
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
          <span className="swap-off text-xl">☀️</span>
          <span className="swap-on text-xl">🌙</span>
        </label>
      </div>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {BROWSER_MODE && (
          <div role="alert" className="alert alert-info alert-soft flex flex-col sm:flex-row items-start sm:items-center">
            <span className="flex-1">
              <b>โหมดสาธิต:</b> ข้อมูลเก็บในฐานข้อมูล SQLite บนเบราว์เซอร์นี้เท่านั้น (ไม่แชร์กับผู้ใช้อื่น)
            </span>
            <button className="btn btn-sm" onClick={resetData}>รีเซ็ตข้อมูลตัวอย่าง</button>
          </div>
        )}
        <StatsBar stats={stats} />

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 gap-4">
            <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
              <label className="input w-full lg:max-w-sm">
                <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                  type="search"
                  placeholder="ค้นหารหัส ชื่อ นามสกุล หรืออีเมล"
                  value={filters.q}
                  onChange={(e) => setFilter('q', e.target.value)}
                />
              </label>
              <select className="select w-full lg:w-56" value={filters.faculty_id} onChange={(e) => setFilter('faculty_id', e.target.value)}>
                <option value="">ทุกคณะ</option>
                {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select className="select w-full lg:w-44" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                <option value="">ทุกสถานะ</option>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div className="lg:ml-auto">
                <button className="btn btn-primary w-full" onClick={() => openForm(null)}>
                  + เพิ่มนักศึกษา
                </button>
              </div>
            </div>

            <StudentTable
              students={result.data}
              loading={loading}
              offset={(page - 1) * PAGE_SIZE}
              onEdit={openForm}
              onDelete={askDelete}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
              <span className="opacity-70">ทั้งหมด {result.total} รายการ</span>
              <div className="join">
                <button className="join-item btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>«</button>
                <button className="join-item btn btn-sm btn-disabled">หน้า {page} / {totalPages}</button>
                <button className="join-item btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>»</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ฟอร์มเพิ่ม/แก้ไข */}
      <dialog ref={formDialog} className="modal" onClose={() => setEditing(null)}>
        <div className="modal-box w-11/12 max-w-3xl">
          <h3 className="font-bold text-lg mb-4">{editing?.id ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่'}</h3>
          {editing && (
            <StudentForm
              key={editing.id || 'new'}
              initial={editing}
              faculties={faculties}
              onSubmit={handleSave}
              onCancel={closeForm}
            />
          )}
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* ยืนยันการลบ */}
      <dialog ref={deleteDialog} className="modal" onClose={() => setDeleting(null)}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">ยืนยันการลบ</h3>
          <p className="py-4">
            ต้องการลบข้อมูลของ <b>{deleting?.prefix}{deleting?.first_name} {deleting?.last_name}</b> ({deleting?.student_code}) ใช่หรือไม่?
            การลบไม่สามารถย้อนกลับได้
          </p>
          <div className="modal-action">
            <form method="dialog"><button className="btn">ยกเลิก</button></form>
            <button className="btn btn-error" onClick={confirmDelete}>ลบข้อมูล</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {toast && (
        <div className="toast toast-end z-50">
          <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
