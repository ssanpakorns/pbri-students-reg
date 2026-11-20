import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// mode "pages" = build สำหรับ GitHub Pages (ใช้ค่าจาก .env.pages)
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/pbri-students-reg/' : '/',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022' },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
}));
