// นำเข้า / ส่งออกไฟล์ Excel (โหลดไลบรารีเมื่อใช้งานเท่านั้น)
import { EXCEL_COLUMNS, DATE_FIELDS, rowsFromSheet } from '../../shared/students.js';

export async function readStudentFile(file) {
  const { readSheet } = await import('read-excel-file/browser');
  return rowsFromSheet(await readSheet(file));
}

function isoToDate(iso) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

export async function downloadStudentFile(students, fileName) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const header = EXCEL_COLUMNS.map((c) => ({ value: c.header, fontWeight: 'bold', backgroundColor: '#E5E7EB' }));
  const rows = students.map((s, i) => EXCEL_COLUMNS.map(({ key }) => {
    if (!key) return { value: i + 1, type: Number };
    const v = s[key];
    if (v == null || v === '') return null;
    if (DATE_FIELDS.includes(key)) {
      const d = isoToDate(v);
      return d ? { value: d, type: Date, format: 'dd/mm/yyyy' } : { value: String(v), type: String };
    }
    // เก็บเป็นข้อความ เพื่อไม่ให้ Excel ตัดเลข 0 หน้าหรือแปลงเลขบัตรเป็น 1.24E+12
    return { value: String(v), type: String };
  }));
  const widths = EXCEL_COLUMNS.map((c) => ({ width: Math.max(8, Math.min(40, c.header.length + 6)) }));
  await writeXlsxFile([header, ...rows], { sheet: 'Sheet1', columns: widths, stickyRowsCount: 1 }).toFile(fileName);
}
