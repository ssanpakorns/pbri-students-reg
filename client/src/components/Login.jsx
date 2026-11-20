import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api.login(username, password));
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <form onSubmit={submit} className="card bg-base-100 shadow-sm w-full max-w-sm">
        <div className="card-body gap-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="avatar avatar-placeholder">
              <div className="bg-primary text-primary-content w-10 rounded-lg"><span className="text-lg font-bold">S</span></div>
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">ระบบจัดการข้อมูลนักศึกษา</div>
              <div className="text-xs opacity-60">กรุณาเข้าสู่ระบบ</div>
            </div>
          </div>
          {error && <div className="alert alert-error alert-soft"><span>{error}</span></div>}
          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">ชื่อผู้ใช้</legend>
            <input className="input w-full" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
          </fieldset>
          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">รหัสผ่าน</legend>
            <input type="password" className="input w-full" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </fieldset>
          <button className="btn btn-primary mt-2" disabled={busy || !username || !password}>
            {busy && <span className="loading loading-spinner loading-sm" />}
            เข้าสู่ระบบ
          </button>
          <p className="text-xs opacity-60 text-center">ข้อมูลในระบบเป็นข้อมูลส่วนบุคคล ใช้เพื่องานที่ได้รับมอบหมายเท่านั้น</p>
        </div>
      </form>
    </div>
  );
}
