import { useMemo, useState } from 'react';
import { STATUS } from '../api.js';

const EMPTY = {
  student_code: '', prefix: 'นาย', first_name: '', last_name: '', gender: '',
  birth_date: '', email: '', phone: '', address: '', faculty_id: '', major_id: '',
  year_level: 1, gpa: '', status: 'studying',
};

function toForm(s) {
  const f = { ...EMPTY };
  for (const k of Object.keys(EMPTY)) if (s[k] != null) f[k] = String(s[k]);
  return f;
}

function Field({ label, error, children, className = '' }) {
  return (
    <fieldset className={`fieldset py-0 ${className}`}>
      <legend className="fieldset-legend">{label}</legend>
      {children}
      {error && <p className="label text-error">{error}</p>}
    </fieldset>
  );
}

export default function StudentForm({ initial, faculties, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toForm(initial));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const majors = useMemo(
    () => faculties.find((f) => String(f.id) === form.faculty_id)?.majors || [],
    [faculties, form.faculty_id],
  );

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value, ...(key === 'faculty_id' ? { major_id: '' } : {}) }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const { faculty_id, ...data } = form;
      await onSubmit(data);
    } catch (err) {
      setErrors(err.errors || {});
      if (!err.errors || !Object.keys(err.errors).length) setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // เขียนชื่อคลาสเต็มเพื่อให้ Tailwind ตรวจเจอ
  const ERROR_CLASS = { input: 'input-error', select: 'select-error' };
  const cls = (key, base) => `${base} w-full ${errors[key] ? ERROR_CLASS[base] : ''}`;

  return (
    <form onSubmit={submit} noValidate>
      {formError && <div className="alert alert-error mb-3"><span>{formError}</span></div>}

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-x-4 gap-y-1">
        <Field label="รหัสนักศึกษา *" error={errors.student_code} className="sm:col-span-2">
          <input className={cls('student_code', 'input')} inputMode="numeric" value={form.student_code} onChange={set('student_code')} placeholder="เช่น 6601001" />
        </Field>
        <Field label="คำนำหน้า *" error={errors.prefix} className="sm:col-span-1">
          <select className={cls('prefix', 'select')} value={form.prefix} onChange={set('prefix')}>
            <option>นาย</option><option>นางสาว</option><option>นาง</option>
          </select>
        </Field>
        <Field label="เพศ" error={errors.gender} className="sm:col-span-1">
          <select className={cls('gender', 'select')} value={form.gender} onChange={set('gender')}>
            <option value="">-</option><option value="M">ชาย</option><option value="F">หญิง</option><option value="O">อื่น ๆ</option>
          </select>
        </Field>
        <Field label="วันเกิด" error={errors.birth_date} className="sm:col-span-2">
          <input type="date" className={cls('birth_date', 'input')} value={form.birth_date} onChange={set('birth_date')} />
        </Field>

        <Field label="ชื่อ *" error={errors.first_name} className="sm:col-span-3">
          <input className={cls('first_name', 'input')} value={form.first_name} onChange={set('first_name')} />
        </Field>
        <Field label="นามสกุล *" error={errors.last_name} className="sm:col-span-3">
          <input className={cls('last_name', 'input')} value={form.last_name} onChange={set('last_name')} />
        </Field>

        <Field label="อีเมล" error={errors.email} className="sm:col-span-3">
          <input type="email" className={cls('email', 'input')} value={form.email} onChange={set('email')} placeholder="name@example.com" />
        </Field>
        <Field label="เบอร์โทรศัพท์" error={errors.phone} className="sm:col-span-3">
          <input type="tel" className={cls('phone', 'input')} value={form.phone} onChange={set('phone')} placeholder="0812345678" />
        </Field>

        <Field label="คณะ" className="sm:col-span-3">
          <select className="select w-full" value={form.faculty_id} onChange={set('faculty_id')}>
            <option value="">- เลือกคณะ -</option>
            {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="สาขาวิชา" error={errors.major_id} className="sm:col-span-3">
          <select className={cls('major_id', 'select')} value={form.major_id} onChange={set('major_id')} disabled={!form.faculty_id}>
            <option value="">- เลือกสาขา -</option>
            {majors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>

        <Field label="ชั้นปี *" error={errors.year_level} className="sm:col-span-2">
          <select className={cls('year_level', 'select')} value={form.year_level} onChange={set('year_level')}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => <option key={y} value={y}>ปี {y}</option>)}
          </select>
        </Field>
        <Field label="เกรดเฉลี่ย (GPA)" error={errors.gpa} className="sm:col-span-2">
          <input type="number" step="0.01" min="0" max="4" className={cls('gpa', 'input')} value={form.gpa} onChange={set('gpa')} placeholder="0.00 - 4.00" />
        </Field>
        <Field label="สถานะ *" error={errors.status} className="sm:col-span-2">
          <select className={cls('status', 'select')} value={form.status} onChange={set('status')}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>

        <Field label="ที่อยู่" className="sm:col-span-6">
          <textarea className="textarea w-full" rows={2} value={form.address} onChange={set('address')} />
        </Field>
      </div>

      <div className="modal-action">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>ยกเลิก</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="loading loading-spinner loading-sm" />}
          บันทึก
        </button>
      </div>
    </form>
  );
}
