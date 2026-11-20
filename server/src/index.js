import express from 'express';
import cors from 'cors';
import { db, initSchema } from './db.js';
import { createRepo, HttpError } from '../../shared/students.js';

initSchema();
const repo = createRepo(db);

const app = express();
app.use(cors());
app.use(express.json());

// ห่อ handler ให้แปลง HttpError เป็น response
const handle = (fn, okStatus = 200) => (req, res) => {
  try {
    const result = fn(req);
    if (result === undefined) return res.status(204).end();
    res.status(okStatus).json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ message: err.message, errors: err.errors });
    }
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

app.get('/api/faculties', handle(() => repo.faculties()));
app.get('/api/stats', handle(() => repo.stats()));
app.get('/api/students', handle((req) => repo.list(req.query)));
app.get('/api/students/:id', handle((req) => repo.get(req.params.id)));
app.post('/api/students', handle((req) => repo.create(req.body), 201));
app.put('/api/students/:id', handle((req) => repo.update(req.params.id, req.body)));
app.delete('/api/students/:id', handle((req) => repo.remove(req.params.id)));

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`API พร้อมใช้งานที่ http://localhost:${PORT}`));
