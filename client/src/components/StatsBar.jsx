export default function StatsBar({ stats }) {
  const s = stats || {};
  const n = (v) => (v ?? 0).toLocaleString('th-TH');
  return (
    <div className="stats stats-vertical sm:stats-horizontal shadow-sm w-full bg-base-100">
      <div className="stat">
        <div className="stat-title">นักศึกษาทั้งหมด</div>
        <div className="stat-value text-primary">{n(s.total)}</div>
        <div className="stat-desc">จาก {n(s.provinces)} จังหวัด</div>
      </div>
      <div className="stat">
        <div className="stat-title">ยืนยันสิทธิ์แล้ว</div>
        <div className="stat-value text-success">{n(s.confirmed)}</div>
        <div className="stat-desc">
          {s.total ? `${Math.round(((s.confirmed ?? 0) / s.total) * 100)}% ของทั้งหมด` : '-'}
        </div>
      </div>
      <div className="stat">
        <div className="stat-title">รอยืนยันสิทธิ์</div>
        <div className="stat-value text-warning">{n(s.pending)}</div>
        <div className="stat-desc">ไม่ยืนยัน {n(s.declined)} คน</div>
      </div>
      <div className="stat">
        <div className="stat-title">มีการเปลี่ยนสถานะ</div>
        <div className="stat-value">{n(s.with_status)}</div>
        <div className="stat-desc">เช่น สละสิทธิ์ ลาออก พักการศึกษา</div>
      </div>
    </div>
  );
}
