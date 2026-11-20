import { STATUS } from '../api.js';

export default function StudentTable({ students, loading, offset, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>#</th>
            <th>รหัสนักศึกษา</th>
            <th>ชื่อ - นามสกุล</th>
            <th className="hidden md:table-cell">คณะ / สาขา</th>
            <th className="text-center">ชั้นปี</th>
            <th className="text-center hidden sm:table-cell">GPA</th>
            <th>สถานะ</th>
            <th className="text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {loading && students.length === 0 && (
            <tr><td colSpan={8} className="text-center py-10"><span className="loading loading-spinner loading-md" /></td></tr>
          )}
          {!loading && students.length === 0 && (
            <tr><td colSpan={8} className="text-center py-10 opacity-60">ไม่พบข้อมูลนักศึกษา</td></tr>
          )}
          {students.map((s, i) => (
            <tr key={s.id} className={loading ? 'opacity-50' : ''}>
              <td className="opacity-60">{offset + i + 1}</td>
              <td className="font-mono">{s.student_code}</td>
              <td>
                <div className="font-medium">{s.prefix}{s.first_name} {s.last_name}</div>
                <div className="text-xs opacity-60">{s.email || '-'}</div>
              </td>
              <td className="hidden md:table-cell">
                <div>{s.major_name || '-'}</div>
                <div className="text-xs opacity-60">{s.faculty_name || ''}</div>
              </td>
              <td className="text-center">{s.year_level}</td>
              <td className="text-center hidden sm:table-cell">{s.gpa != null ? s.gpa.toFixed(2) : '-'}</td>
              <td>
                <span className={`badge badge-soft whitespace-nowrap ${STATUS[s.status]?.badge || ''}`}>
                  {STATUS[s.status]?.label || s.status}
                </span>
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
