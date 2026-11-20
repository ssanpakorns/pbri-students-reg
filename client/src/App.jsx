import { useCallback, useEffect, useRef, useState } from 'react';
import { api, BROWSER_MODE } from './api.js';
import { CONFIRM_STATUSES } from '../../shared/students.js';
import { downloadStudentFile } from './excel.js';
import StudentForm from './components/StudentForm.jsx';
import StudentTable from './components/StudentTable.jsx';
import StatsBar from './components/StatsBar.jsx';
import ImportDialog from './components/ImportDialog.jsx';

const PAGE_SIZE = 20;
const NO_FILTERS = { q: '', college: '', admission_round: '', province: '', confirm_status: '', status: '' };

export default function App() {
  const [options, setOptions] = useState({});
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState({ data: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null = ปิด, {} = เพิ่มใหม่, student = แก้ไข
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [dark, setDark] = useState(false);
  const formDialog = useRef(null);
  const deleteDialog = useRef(null);
  const importDialog = useRef(null);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadOptions = useCallback(() => api.options().then(setOptions).catch(() => {}), []);

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

  const refresh = () => { load(); loadOptions(); };

  useEffect(() => { loadOptions(); }, [loadOptions]);
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
    refresh();
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
      else refresh();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      deleteDialog.current?.close();
      setDeleting(null);
    }
  };

  const openImport = () => {
    setImporting(true);
    importDialog.current?.showModal();
  };
  const closeImport = () => {
    importDialog.current?.close();
    setImporting(false);
  };
  const handleImport = async (rows) => {
    const r = await api.importStudents(rows);
    refresh();
    return r;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await api.exportStudents(filters);
      if (!rows.length) return notify('ไม่มีข้อมูลให้ส่งออก', 'error');
      await downloadStudentFile(rows, `ข้อมูลนักศึกษา-${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify(`ส่งออก ${rows.length.toLocaleString('th-TH')} แถวเรียบร้อย`);
    } catch (e) {
      notify(e.message || 'ส่งออกไม่สำเร็จ', 'error');
    } finally {
      setExporting(false);
    }
  };

  const resetData = async () => {
    if (!confirm('ล้างข้อมูลทั้งหมดในเบราว์เซอร์นี้และกลับไปใช้ข้อมูลตัวอย่าง?')) return;
    await api.reset();
    notify('รีเซ็ตข้อมูลเรียบร้อย');
    setFilters(NO_FILTERS);
    setPage(1);
    refresh();
  };

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const hasFilters = Object.values(filters).some(Boolean);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const filterSelect = (key, placeholder, values = []) => (
    <select className="select select-sm w-full" value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}>
      <option value="">{placeholder}</option>
      {values.map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  );

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
            <div className="text-xs opacity-60">ข้อมูลรายงานตัวนักศึกษาใหม่</div>
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
              <b>โหมดสาธิต:</b> ข้อมูลเก็บในฐานข้อมูล SQLite บนเบราว์เซอร์นี้เท่านั้น ไม่ถูกส่งไปที่ใด และไม่แชร์กับผู้ใช้อื่น
            </span>
            <button className="btn btn-sm" onClick={resetData}>รีเซ็ตข้อมูลตัวอย่าง</button>
          </div>
        )}
        <StatsBar stats={stats} />

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 gap-3">
            <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
              <label className="input w-full lg:max-w-md">
                <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                  type="search"
                  placeholder="ค้นหาชื่อ เลขที่ใบสมัคร รหัส เลขบัตร เบอร์โทร หรือโรงเรียน"
                  value={filters.q}
                  onChange={(e) => setFilter('q', e.target.value)}
                />
              </label>
              <div className="flex gap-2 lg:ml-auto">
                <button className="btn flex-1 lg:flex-none" onClick={openImport}>นำเข้า Excel</button>
                <button className="btn flex-1 lg:flex-none" onClick={handleExport} disabled={exporting}>
                  {exporting && <span className="loading loading-spinner loading-sm" />}
                  ส่งออก Excel
                </button>
                <button className="btn btn-primary flex-1 lg:flex-none" onClick={() => openForm(null)}>+ เพิ่มนักศึกษา</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {filterSelect('college', 'ทุกวิทยาลัย', options.college)}
              {filterSelect('admission_round', 'ทุกรอบ', options.admission_round)}
              {filterSelect('province', 'ทุกจังหวัด', options.province)}
              {filterSelect('confirm_status', 'ยืนยันสิทธิ์: ทั้งหมด', CONFIRM_STATUSES)}
              <select className="select select-sm w-full" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                <option value="">สถานะ: ทั้งหมด</option>
                <option value="__none">ไม่มีการเปลี่ยนสถานะ</option>
                {(options.status || []).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <button className="btn btn-sm btn-ghost" disabled={!hasFilters} onClick={() => { setFilters(NO_FILTERS); setPage(1); }}>
                ล้างตัวกรอง
              </button>
            </div>

            <StudentTable
              students={result.data}
              loading={loading}
              offset={(page - 1) * PAGE_SIZE}
              onEdit={openForm}
              onDelete={askDelete}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
              <span className="opacity-70">
                {hasFilters ? 'ตรงตามตัวกรอง' : 'ทั้งหมด'} {result.total.toLocaleString('th-TH')} รายการ
                {hasFilters && ' (ส่งออก Excel จะใช้ตัวกรองนี้)'}
              </span>
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
        <div className="modal-box w-11/12 max-w-4xl">
          <h3 className="font-bold text-lg">{editing?.id ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่'}</h3>
          {editing && (
            <StudentForm
              key={editing.id || 'new'}
              initial={editing}
              options={options}
              onSubmit={handleSave}
              onCancel={closeForm}
            />
          )}
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* นำเข้า Excel */}
      <dialog ref={importDialog} className="modal" onClose={() => setImporting(false)}>
        <div className="modal-box w-11/12 max-w-2xl">
          <h3 className="font-bold text-lg mb-3">นำเข้าข้อมูลจาก Excel</h3>
          {importing && <ImportDialog onImport={handleImport} onClose={closeImport} />}
        </div>
      </dialog>

      {/* ยืนยันการลบ */}
      <dialog ref={deleteDialog} className="modal" onClose={() => setDeleting(null)}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">ยืนยันการลบ</h3>
          <p className="py-4">
            ต้องการลบข้อมูลของ <b>{deleting?.prefix}{deleting?.first_name} {deleting?.last_name}</b> (ใบสมัคร {deleting?.application_no}) ใช่หรือไม่?
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
