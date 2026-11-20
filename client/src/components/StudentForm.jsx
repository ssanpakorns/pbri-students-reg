import { useState } from 'react';
import { CONFIRM_STATUSES, FIELDS, PREFIXES, STATUS_SUGGESTIONS } from '../../../shared/students.js';

const EMPTY = Object.fromEntries(FIELDS.map((f) => [f, '']));
EMPTY.prefix = 'นางสาว';
EMPTY.confirm_status = 'รอยืนยัน';

function toForm(s) {
  const f = { ...EMPTY };
  for (const k of FIELDS) if (s[k] != null) f[k] = String(s[k]);
  return f;
}

// เขียนชื่อคลาสเต็มเพื่อให้ Tailwind ตรวจเจอ
const ERROR_CLASS = { input: 'input-error', select: 'select-error', textarea: 'textarea-error' };

function Section({ title, children }) {
  return (
    <>
      <div className="sm:col-span-6 divider divider-start text-sm font-semibold opacity-80 mt-3 mb-0">{title}</div>
      {children}
    </>
  );
}

export default function StudentForm({ initial, options, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toForm(initial));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.errors && Object.keys(err.errors).length ? 'กรุณาตรวจสอบข้อมูลที่ไฮไลต์' : err.message);
    } finally {
      setSaving(false);
    }
  };

  // ช่องกรอกทั่วไป: list = ชื่อ datalist สำหรับตัวเลือกที่เคยกรอก
  const field = (key, label, { span = 3, type = 'text', list, placeholder, inputMode, el = 'input' } = {}) => (
    <fieldset className={`fieldset py-0 sm:col-span-${span}`} key={key}>
      <legend className="fieldset-legend">{label}</legend>
      {el === 'textarea' ? (
        <textarea className={`textarea w-full ${errors[key] ? ERROR_CLASS.textarea : ''}`} rows={2} value={form[key]} onChange={set(key)} />
      ) : (
        <input
          type={type}
          className={`input w-full ${errors[key] ? ERROR_CLASS.input : ''}`}
          value={form[key]}
          onChange={set(key)}
          list={list}
          placeholder={placeholder}
          inputMode={inputMode}
        />
      )}
      {errors[key] && <p className="label text-error whitespace-normal">{errors[key]}</p>}
    </fieldset>
  );

  const datalist = (id, values = []) => (
    <datalist id={id}>{values.map((v) => <option key={v} value={v} />)}</datalist>
  );

  return (
    <form onSubmit={submit} noValidate>
      {formError && <div className="alert alert-error alert-soft mb-3"><span>{formError}</span></div>}

      {datalist('dl-faculty', options.faculty)}
      {datalist('dl-college', options.college)}
      {datalist('dl-project', options.project)}
      {datalist('dl-curriculum', options.curriculum)}
      {datalist('dl-round', options.admission_round)}
      {datalist('dl-province', options.province)}
      {datalist('dl-status', [...new Set([...STATUS_SUGGESTIONS, ...(options.status || [])])])}

      {/* sm:col-span-1 sm:col-span-2 sm:col-span-3 sm:col-span-4 sm:col-span-6 — ให้ Tailwind สร้างคลาสที่ใช้แบบ dynamic */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-x-4 gap-y-1 [&>*]:min-w-0">
        <Section title="ข้อมูลส่วนตัว">
          {field('application_no', 'เลขที่ใบสมัคร *', { span: 2, inputMode: 'numeric' })}
          {field('student_code', 'รหัสนักศึกษา', { span: 2, placeholder: 'ยังไม่มีได้' })}
          {field('national_id', 'เลขบัตรประชาชน', { span: 2, inputMode: 'numeric', placeholder: '13 หลัก' })}
          <fieldset className="fieldset py-0 sm:col-span-2">
            <legend className="fieldset-legend">คำนำหน้า *</legend>
            <select className={`select w-full ${errors.prefix ? ERROR_CLASS.select : ''}`} value={form.prefix} onChange={set('prefix')}>
              {[...new Set([...PREFIXES, form.prefix].filter(Boolean))].map((p) => <option key={p}>{p}</option>)}
            </select>
          </fieldset>
          {field('first_name', 'ชื่อ *', { span: 2 })}
          {field('last_name', 'นามสกุล *', { span: 2 })}
          {field('phone', 'เบอร์โทร', { span: 2, type: 'tel', placeholder: '0812345678' })}
        </Section>

        <Section title="ที่อยู่">
          {field('address', 'ที่อยู่ (บ้านเลขที่ / หมู่)', { span: 6 })}
          {field('subdistrict', 'ตำบล', { span: 2 })}
          {field('district', 'อำเภอ', { span: 2 })}
          {field('province', 'จังหวัด', { span: 1, list: 'dl-province' })}
          {field('postal_code', 'รหัสไปรษณีย์', { span: 1, inputMode: 'numeric' })}
        </Section>

        <Section title="ข้อมูลการรับเข้า">
          {field('faculty', 'คณะ', { span: 3, list: 'dl-faculty' })}
          {field('college', 'วิทยาลัย', { span: 3, list: 'dl-college' })}
          {field('project', 'โครงการ', { span: 6, list: 'dl-project' })}
          {field('curriculum', 'หลักสูตร', { span: 3, list: 'dl-curriculum' })}
          {field('admission_round', 'รอบ', { span: 3, list: 'dl-round' })}
          {field('school_name', 'ชื่อโรงเรียน', { span: 4 })}
          {field('school_province', 'จังหวัดโรงเรียน', { span: 2, list: 'dl-province' })}
          {field('health_center', 'รพ.สต. (9 หมอ)', { span: 4 })}
          {field('health_center_province', 'จังหวัด รพ.สต.', { span: 2, list: 'dl-province' })}
        </Section>

        <Section title="สถานะ">
          <fieldset className="fieldset py-0 sm:col-span-3">
            <legend className="fieldset-legend">สถานะยืนยันสิทธิ์ *</legend>
            <select className={`select w-full ${errors.confirm_status ? ERROR_CLASS.select : ''}`} value={form.confirm_status} onChange={set('confirm_status')}>
              {CONFIRM_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </fieldset>
          {field('status', 'สถานะ', { span: 3, list: 'dl-status', placeholder: 'เว้นว่าง = ปกติ' })}
          {field('notified_date', 'วันที่แจ้ง', { span: 3, type: 'date' })}
          {field('returned_date', 'วันที่กลับมา', { span: 3, type: 'date' })}
          {field('note', 'หมายเหตุ', { span: 6 })}
          {field('details', 'รายละเอียดเพิ่มเติม', { span: 6, el: 'textarea' })}
        </Section>
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
