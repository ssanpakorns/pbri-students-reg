import { useState } from 'react';
import { EXCEL_COLUMNS } from '../../../shared/students.js';
import { readStudentFile } from '../excel.js';

const LABEL = Object.fromEntries(EXCEL_COLUMNS.filter((c) => c.key).map((c) => [c.key, c.header]));

// ขั้นตอน: เลือกไฟล์ → ตรวจสอบ → นำเข้า → สรุปผล
export default function ImportDialog({ onImport, onClose }) {
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsed(null);
    setResult(null);
    setError('');
    setBusy(true);
    try {
      setParsed(await readStudentFile(file));
    } catch (err) {
      setError(`อ่านไฟล์ไม่ได้: ${err.message || 'รูปแบบไฟล์ไม่ถูกต้อง'} (รองรับเฉพาะ .xlsx)`);
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setResult(await onImport(parsed.rows));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const canImport = parsed && parsed.rows.length > 0 && parsed.missingHeaders.length === 0 && !result;

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-80">
        ใช้ไฟล์ .xlsx ที่มีหัวตารางแถวแรกตามรูปแบบเดียวกับไฟล์ส่งออก (เลขที่ใบสมัคร, ชื่อ, นามสกุล ... ) —
        ถ้าเลขที่ใบสมัครมีอยู่แล้วจะ<b>อัปเดต</b>เฉพาะคอลัมน์ที่มีในไฟล์ (คอลัมน์ที่ไม่มีในไฟล์คงค่าเดิม)
        ถ้ายังไม่มีจะ<b>เพิ่มใหม่</b>
      </p>

      <input type="file" accept=".xlsx" className="file-input w-full" onChange={pick} disabled={busy} />

      {busy && !parsed && <div className="flex items-center gap-2"><span className="loading loading-spinner loading-sm" /> กำลังอ่านไฟล์...</div>}
      {error && <div className="alert alert-error alert-soft"><span>{error}</span></div>}

      {parsed && !result && (
        <div className="space-y-2">
          <div className="alert alert-soft">
            <span><b>{fileName}</b>: พบข้อมูล {parsed.rows.length.toLocaleString('th-TH')} แถว</span>
          </div>
          {parsed.missingHeaders.length > 0 && (
            <div className="alert alert-error alert-soft">
              <span>ไม่พบคอลัมน์ที่จำเป็น: {parsed.missingHeaders.join(', ')}</span>
            </div>
          )}
          {parsed.unknownHeaders.length > 0 && (
            <div className="alert alert-warning alert-soft">
              <span>คอลัมน์ที่ไม่รู้จักและจะถูกข้าม: {parsed.unknownHeaders.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="alert alert-success alert-soft">
            <span>นำเข้าเรียบร้อย: เพิ่มใหม่ <b>{result.inserted}</b> แถว, อัปเดต <b>{result.updated}</b> แถว
              {result.failed.length > 0 && <>, ข้าม <b>{result.failed.length}</b> แถวที่ข้อมูลไม่ถูกต้อง</>}</span>
          </div>
          {result.failed.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-box border border-base-content/10">
              <table className="table table-sm">
                <thead><tr><th>แถวที่</th><th>ปัญหา</th></tr></thead>
                <tbody>
                  {result.failed.map((f) => (
                    <tr key={f.rowNumber}>
                      <td>{f.rowNumber}</td>
                      <td>{Object.entries(f.errors || {}).map(([k, msg]) => `${LABEL[k] || k}: ${msg}`).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="modal-action">
        <button className="btn" onClick={onClose} disabled={busy && !!parsed}>{result ? 'ปิด' : 'ยกเลิก'}</button>
        {!result && (
          <button className="btn btn-primary" onClick={run} disabled={!canImport || busy}>
            {busy && parsed && <span className="loading loading-spinner loading-sm" />}
            นำเข้า {parsed?.rows.length ? `${parsed.rows.length.toLocaleString('th-TH')} แถว` : ''}
          </button>
        )}
      </div>
    </div>
  );
}
