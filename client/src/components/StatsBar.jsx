export default function StatsBar({ stats }) {
  const s = stats || { total: 0, byStatus: {}, avgGpa: null };
  return (
    <div className="stats stats-vertical sm:stats-horizontal shadow-sm w-full bg-base-100">
      <div className="stat">
        <div className="stat-title">นักศึกษาทั้งหมด</div>
        <div className="stat-value text-primary">{s.total}</div>
        <div className="stat-desc">คน</div>
      </div>
      <div className="stat">
        <div className="stat-title">กำลังศึกษา</div>
        <div className="stat-value text-success">{s.byStatus.studying ?? 0}</div>
        <div className="stat-desc">พักการศึกษา {s.byStatus.on_leave ?? 0} คน</div>
      </div>
      <div className="stat">
        <div className="stat-title">สำเร็จการศึกษา</div>
        <div className="stat-value text-info">{s.byStatus.graduated ?? 0}</div>
        <div className="stat-desc">พ้นสภาพ {s.byStatus.withdrawn ?? 0} คน</div>
      </div>
      <div className="stat">
        <div className="stat-title">เกรดเฉลี่ยรวม</div>
        <div className="stat-value">{s.avgGpa != null ? s.avgGpa.toFixed(2) : '-'}</div>
        <div className="stat-desc">จากนักศึกษาที่มีผลการเรียน</div>
      </div>
    </div>
  );
}
