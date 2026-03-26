import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/mcp': 'http://localhost:3000',
      '/page': 'http://localhost:3000',
      '/js': 'http://localhost:3000',
      '/css': 'http://localhost:3000',
      '/images': 'http://localhost:3000',
      '/favicon.ico': 'http://localhost:3000',
      '/favicon.png': 'http://localhost:3000',
      '/apple-touch-icon.png': 'http://localhost:3000'
    }
  }
});
