import { CONFIRM_BADGE, formatPhone, thaiDate } from '../api.js';

export default function StudentTable({ students, loading, offset, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>#</th>
            <th>ชื่อ - นามสกุล</th>
            <th className="hidden sm:table-cell">เลขที่ใบสมัคร</th>
            <th className="hidden lg:table-cell">วิทยาลัย / หลักสูตร</th>
            <th className="hidden xl:table-cell">รอบ</th>
            <th className="hidden md:table-cell">จังหวัด</th>
            <th>ยืนยันสิทธิ์</th>
            <th className="hidden md:table-cell">สถานะ</th>
            <th className="text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {loading && students.length === 0 && (
            <tr><td colSpan={9} className="text-center py-10"><span className="loading loading-spinner loading-md" /></td></tr>
          )}
          {!loading && students.length === 0 && (
            <tr><td colSpan={9} className="text-center py-10 opacity-60">ไม่พบข้อมูลนักศึกษา</td></tr>
          )}
          {students.map((s, i) => (
            <tr key={s.id} className={loading ? 'opacity-50' : ''}>
              <td className="opacity-60">{offset + i + 1}</td>
              <td>
                <div className="font-medium whitespace-nowrap">{s.prefix}{s.first_name} {s.last_name}</div>
                <div className="text-xs opacity-60 whitespace-nowrap">
                  {s.student_code ? `รหัส ${s.student_code} · ` : ''}{formatPhone(s.phone)}
                </div>
              </td>
              <td className="hidden sm:table-cell font-mono text-sm">{s.application_no}</td>
              <td className="hidden lg:table-cell">
                <div className="text-sm">{s.college || '-'}</div>
                <div className="text-xs opacity-60">{s.curriculum || ''}</div>
              </td>
              <td className="hidden xl:table-cell text-sm">{s.admission_round || '-'}</td>
              <td className="hidden md:table-cell text-sm">{s.province || '-'}</td>
              <td>
                <span className={`badge badge-soft whitespace-nowrap ${CONFIRM_BADGE[s.confirm_status] || ''}`}>
                  {s.confirm_status}
                </span>
              </td>
              <td className="hidden md:table-cell">
                {s.status ? (
                  <div>
                    <span className="badge badge-soft badge-neutral whitespace-nowrap">{s.status}</span>
                    {s.notified_date && <div className="text-xs opacity-60 mt-1 whitespace-nowrap">แจ้ง {thaiDate(s.notified_date)}</div>}
                  </div>
                ) : <span className="opacity-40">-</span>}
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  <button className="btn btn-sm btn-ghost" onClick={() => onEdit(s)}>แก้ไข</button>
                  <button className="btn btn-sm btn-ghost text-error" onClick={() => onDelete(s)}>ลบ</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
